alter table public.matches
  add column if not exists motm_locked_at timestamptz,
  add column if not exists motm_approved_by uuid references public.profiles(id) on delete set null;

alter table public.profiles
  add column if not exists total_motm_votes integer not null default 0;

update public.profiles as profile
set total_motm_votes = (
  select count(*)::integer
  from public.motm_votes as vote
  where vote.voted_player_id = profile.id
);

create or replace function public.validate_motm_vote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  match_status text;
  match_locked_at timestamptz;
begin
  if auth.uid() is null or auth.uid() <> new.voter_id then
    raise exception 'You can only cast your own vote.' using errcode = '42501';
  end if;

  select status, motm_locked_at
    into match_status, match_locked_at
  from public.matches
  where id = new.match_id
  for update;

  if not found or match_status <> 'completed' then
    raise exception 'Voting is available only for completed matches.' using errcode = '23514';
  end if;
  if match_locked_at is not null then
    raise exception 'MVP voting has been approved and is closed.' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.match_players
    where match_id = new.match_id and player_id = new.voter_id
  ) then
    raise exception 'Only players in this match can vote.' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.motm_votes
    where match_id = new.match_id
      and voter_id = new.voter_id
      and id is distinct from new.id
  ) then
    raise exception 'You have already voted in this match.' using errcode = '23505';
  end if;
  if not exists (
    select 1 from public.match_players
    where match_id = new.match_id and player_id = new.voted_player_id
  ) then
    raise exception 'MVP must be selected from this match roster.' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_motm_vote_before_insert on public.motm_votes;
create trigger validate_motm_vote_before_insert
before insert or update on public.motm_votes
for each row execute function public.validate_motm_vote();

create or replace function public.update_total_motm_votes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles
    set total_motm_votes = total_motm_votes + 1
    where id = new.voted_player_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.profiles
    set total_motm_votes = greatest(0, total_motm_votes - 1)
    where id = old.voted_player_id;
    return old;
  elsif old.voted_player_id is distinct from new.voted_player_id then
    update public.profiles
    set total_motm_votes = greatest(0, total_motm_votes - 1)
    where id = old.voted_player_id;
    update public.profiles
    set total_motm_votes = total_motm_votes + 1
    where id = new.voted_player_id;
  end if;
  return new;
end;
$$;

drop trigger if exists update_total_motm_votes_after_change on public.motm_votes;
create trigger update_total_motm_votes_after_change
after insert or update or delete on public.motm_votes
for each row execute function public.update_total_motm_votes();

create or replace function public.approve_match_motm(p_match_id uuid, p_player_id uuid)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_match public.matches;
  caller_role text;
  selected_votes integer;
  highest_votes integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  select * into selected_match
  from public.matches
  where id = p_match_id
  for update;

  if not found then
    raise exception 'Match not found.' using errcode = 'P0002';
  end if;
  if selected_match.status <> 'completed' then
    raise exception 'MVP can only be approved after the match is completed.' using errcode = '23514';
  end if;
  if selected_match.motm_locked_at is not null then
    raise exception 'MVP voting has already been approved.' using errcode = '23514';
  end if;

  select role into caller_role
  from public.profiles
  where id = auth.uid();

  if caller_role is distinct from 'admin'
    and auth.uid() not in (selected_match.manager_a_id, selected_match.manager_b_id) then
    raise exception 'Only an assigned manager or admin can approve the MVP.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.match_players
    where match_id = p_match_id and player_id = p_player_id
  ) then
    raise exception 'MVP must be selected from this match roster.' using errcode = '23514';
  end if;

  select count(*)::integer into selected_votes
  from public.motm_votes
  where match_id = p_match_id and voted_player_id = p_player_id;

  select coalesce(max(vote_count), 0) into highest_votes
  from (
    select count(*)::integer as vote_count
    from public.motm_votes
    where match_id = p_match_id
    group by voted_player_id
  ) as vote_totals;

  if highest_votes = 0 or selected_votes <> highest_votes then
    raise exception 'The approved MVP must be tied for the highest vote count.' using errcode = '23514';
  end if;

  update public.matches
  set motm_player_id = p_player_id,
      motm_approved_by = auth.uid(),
      motm_locked_at = now()
  where id = p_match_id
  returning * into selected_match;

  update public.profiles
  set motm_count = coalesce(motm_count, 0) + 1
  where id = p_player_id;

  return selected_match;
end;
$$;

revoke all on function public.approve_match_motm(uuid, uuid) from public;
grant execute on function public.approve_match_motm(uuid, uuid) to authenticated;