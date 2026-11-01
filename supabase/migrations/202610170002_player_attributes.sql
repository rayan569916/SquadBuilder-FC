alter table public.profiles
  add column if not exists attributes jsonb;


-- Let admins upload/replace avatars and set avatar_path for any profile.
-- Policies are additive (OR'd) with any existing own-avatar policies.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "Admins can upload any avatar" on storage.objects;
create policy "Admins can upload any avatar"
on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and public.is_admin());

drop policy if exists "Admins can delete any avatar" on storage.objects;
create policy "Admins can delete any avatar"
on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and public.is_admin());

drop policy if exists "Admins can update any profile" on public.profiles;
create policy "Admins can update any profile"
on public.profiles for update to authenticated
using (public.is_admin())
with check (public.is_admin());


-- Match-day substitutions.
-- A rostered player can be marked unavailable and replaced by a player who is not yet in the match.
-- The substitute joins the same team, takes the unavailable player's slot on the pitch,
-- and can then be credited with goals, assists, saves, tackles and MVP votes.

alter table public.match_players
  add column if not exists is_substitute boolean not null default false,
  add column if not exists is_unavailable boolean not null default false,
  add column if not exists replaces_player_id uuid references public.profiles(id);

alter table public.match_players drop constraint if exists match_players_substitute_link;
alter table public.match_players add constraint match_players_substitute_link check (
  (is_substitute and replaces_player_id is not null)
  or (not is_substitute and replaces_player_id is null)
);

-- ---------------------------------------------------------------------------
-- Make a substitute: mark one player unavailable and bring another player in.
-- ---------------------------------------------------------------------------
create or replace function public.substitute_match_player(
  p_match_id uuid,
  p_unavailable_player_id uuid,
  p_substitute_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  match_status text;
  unavailable_row public.match_players;
  lineup_row public.match_lineups;
begin
  if not public.can_manage_match(p_match_id) then
    raise exception 'Not authorized to edit this match';
  end if;

  select status into match_status from public.matches where id = p_match_id for update;
  if match_status is null then
    raise exception 'Match not found';
  end if;
  if match_status <> 'upcoming' then
    raise exception 'Substitutions can only be made before the result is submitted';
  end if;

  select * into unavailable_row
  from public.match_players
  where match_id = p_match_id and player_id = p_unavailable_player_id
  for update;
  if not found then
    raise exception 'That player is not part of this match';
  end if;
  if unavailable_row.is_unavailable then
    raise exception 'That player is already marked unavailable';
  end if;

  if not exists (select 1 from public.profiles where id = p_substitute_id) then
    raise exception 'Substitute player not found';
  end if;
  if exists (
    select 1 from public.match_players
    where match_id = p_match_id and player_id = p_substitute_id
  ) then
    raise exception 'That player is already part of this match';
  end if;

  insert into public.match_players (match_id, player_id, team, is_substitute, replaces_player_id)
  values (p_match_id, p_substitute_id, unavailable_row.team, true, p_unavailable_player_id);

  -- The substitute takes over the slot on the pitch.
  select * into lineup_row
  from public.match_lineups
  where match_id = p_match_id and player_id = p_unavailable_player_id;
  if found then
    insert into public.match_lineups (match_id, player_id, x_coord, y_coord, position_tag)
    values (p_match_id, p_substitute_id, lineup_row.x_coord, lineup_row.y_coord, lineup_row.position_tag);
    delete from public.match_lineups where id = lineup_row.id;
  end if;

  update public.match_players
  set is_unavailable = true
  where match_id = p_match_id and player_id = p_unavailable_player_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Undo a substitution (before the result is submitted): the original player returns.
-- ---------------------------------------------------------------------------
create or replace function public.undo_match_substitution(
  p_match_id uuid,
  p_substitute_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  match_status text;
  sub_row public.match_players;
  lineup_row public.match_lineups;
begin
  if not public.can_manage_match(p_match_id) then
    raise exception 'Not authorized to edit this match';
  end if;

  select status into match_status from public.matches where id = p_match_id for update;
  if match_status is null then
    raise exception 'Match not found';
  end if;
  if match_status <> 'upcoming' then
    raise exception 'Substitutions can only be changed before the result is submitted';
  end if;

  select * into sub_row
  from public.match_players
  where match_id = p_match_id and player_id = p_substitute_id
  for update;
  if not found or not sub_row.is_substitute then
    raise exception 'That player is not a substitute in this match';
  end if;
  if sub_row.is_unavailable then
    raise exception 'Undo the later substitution for this player first';
  end if;

  select * into lineup_row
  from public.match_lineups
  where match_id = p_match_id and player_id = p_substitute_id;
  if found then
    insert into public.match_lineups (match_id, player_id, x_coord, y_coord, position_tag)
    values (p_match_id, sub_row.replaces_player_id, lineup_row.x_coord, lineup_row.y_coord, lineup_row.position_tag);
  end if;

  -- Deleting the substitute also removes their lineup row (on delete cascade).
  delete from public.match_players where match_id = p_match_id and player_id = p_substitute_id;

  update public.match_players
  set is_unavailable = false
  where match_id = p_match_id and player_id = sub_row.replaces_player_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Roster/lineup save must keep substitution state and count only available players.
-- ---------------------------------------------------------------------------
create or replace function public.save_match_roster_and_lineup(
  p_match_id uuid,
  p_roster jsonb,
  p_lineups jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  expected_players integer;
  players_a integer;
  players_b integer;
  match_status text;
begin
  if not public.can_manage_match(p_match_id) then
    raise exception 'Not authorized to edit this match roster';
  end if;

  select status, case format
    when '5s' then 5
    when '6s' then 6
    when '7s' then 7
    else custom_players_per_team
  end into match_status, expected_players
  from public.matches where id = p_match_id;
  if match_status = 'completed' then
    raise exception 'Completed match history cannot be changed';
  end if;

  select count(*) filter (where team = 'A'), count(*) filter (where team = 'B')
    into players_a, players_b
  from jsonb_to_recordset(coalesce(p_roster, '[]'::jsonb)) as r(
    player_id text, team text, is_substitute boolean, is_unavailable boolean, replaces_player_id text
  )
  where not coalesce(r.is_unavailable, false);
  if players_a <> expected_players or players_b <> expected_players then
    raise exception 'Each team must contain exactly the selected match size';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_roster, '[]'::jsonb)) as r(
      player_id text, team text, is_substitute boolean, is_unavailable boolean, replaces_player_id text
    )
    where coalesce(r.is_substitute, false)
      and not exists (
        select 1
        from jsonb_to_recordset(coalesce(p_roster, '[]'::jsonb)) as o(player_id text, team text)
        where o.player_id = nullif(r.replaces_player_id, '') and o.team = r.team
      )
  ) then
    raise exception 'Each substitute must replace a player on the same team';
  end if;

  delete from public.match_lineups where match_id = p_match_id;
  delete from public.match_players where match_id = p_match_id;

  insert into public.match_players (match_id, player_id, team, is_substitute, is_unavailable, replaces_player_id)
  select p_match_id, r.player_id::uuid, r.team,
    coalesce(r.is_substitute, false),
    coalesce(r.is_unavailable, false),
    case when coalesce(r.is_substitute, false) then nullif(r.replaces_player_id, '')::uuid else null end
  from jsonb_to_recordset(coalesce(p_roster, '[]'::jsonb)) as r(
    player_id text, team text, is_substitute boolean, is_unavailable boolean, replaces_player_id text
  );

  insert into public.match_lineups (match_id, player_id, x_coord, y_coord, position_tag)
  select p_match_id, l.player_id::uuid, l.x_coord, l.y_coord, l.position_tag
  from jsonb_to_recordset(coalesce(p_lineups, '[]'::jsonb)) as l(
    player_id text, x_coord numeric, y_coord numeric, position_tag text
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Results: unavailable players cannot score/assist and do not get a match played;
-- substitutes do (they are normal match_players rows).
-- ---------------------------------------------------------------------------
create or replace function public.save_match_result(
  p_match_id uuid,
  p_team_a_score integer,
  p_team_b_score integer,
  p_events jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  goal_a integer;
  goal_b integer;
begin
  if not public.can_manage_match(p_match_id) then
    raise exception 'Not authorized to submit this match result';
  end if;
  if not exists (select 1 from public.matches where id = p_match_id and status = 'upcoming') then
    raise exception 'A completed match result cannot be submitted again';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_events, '[]'::jsonb)) as e(team text, player_id text, assist_id text)
    left join public.match_players scorer on scorer.match_id = p_match_id and scorer.player_id = nullif(e.player_id, '')::uuid
    left join public.match_players assister on assister.match_id = p_match_id and assister.player_id = nullif(e.assist_id, '')::uuid
    where e.player_id is null or scorer.player_id is null or scorer.team <> e.team or scorer.is_unavailable
      or (e.assist_id is not null and (assister.player_id is null or assister.team <> e.team or assister.is_unavailable))
  ) then
    raise exception 'Event players must be available players on the match roster and scoring team';
  end if;

  select count(*) filter (where team = 'A'), count(*) filter (where team = 'B')
    into goal_a, goal_b
  from jsonb_to_recordset(coalesce(p_events, '[]'::jsonb)) as e(team text, event_type text)
  where event_type in ('goal', 'penalty_goal', 'freekick_goal');

  if goal_a <> p_team_a_score or goal_b <> p_team_b_score then
    raise exception 'The score must match the recorded goal events';
  end if;

  delete from public.match_events where match_id = p_match_id;

  insert into public.match_events (match_id, team, event_type, player_id, assist_id, minute, notes)
  select p_match_id, e.team, e.event_type, nullif(e.player_id, '')::uuid,
    nullif(e.assist_id, '')::uuid, e.minute, e.notes
  from jsonb_to_recordset(coalesce(p_events, '[]'::jsonb)) as e(
    team text, event_type text, player_id text, assist_id text, minute integer, notes text
  );

  update public.matches
  set team_a_score = p_team_a_score,
      team_b_score = p_team_b_score,
      status = 'completed',
      updated_at = now()
  where id = p_match_id;

  with player_totals as (
    select mp.player_id,
      count(e.id) filter (where e.player_id = mp.player_id and e.event_type in ('goal', 'penalty_goal', 'freekick_goal')) as goals,
      count(e.id) filter (where e.assist_id = mp.player_id and e.event_type in ('goal', 'penalty_goal', 'freekick_goal')) as assists,
      count(e.id) filter (where e.player_id = mp.player_id and e.event_type in ('save', 'penalty_save')) as saves,
      count(e.id) filter (where e.player_id = mp.player_id and e.event_type = 'tackle') as tackles,
      case when p_team_a_score = p_team_b_score then 0
        when (mp.team = 'A' and p_team_a_score > p_team_b_score)
          or (mp.team = 'B' and p_team_b_score > p_team_a_score) then 1 else 0 end as wins
    from public.match_players mp
    left join public.match_events e on e.match_id = mp.match_id
    where mp.match_id = p_match_id and not mp.is_unavailable
    group by mp.player_id, mp.team
  )
  update public.profiles p
  set goals = p.goals + totals.goals,
      assists = p.assists + totals.assists,
      saves = p.saves + totals.saves,
      tackles = p.tackles + totals.tackles,
      matches_played = p.matches_played + 1,
      total_wins = p.total_wins + totals.wins,
      win_percentage = round(((p.total_wins + totals.wins)::numeric / (p.matches_played + 1)) * 100, 2)
  from player_totals totals
  where p.id = totals.player_id;

  update public.profiles p
  set matches_managed = p.matches_managed + 1,
      matches_won = p.matches_won + case
        when (p.id = m.manager_a_id and p_team_a_score > p_team_b_score)
          or (p.id = m.manager_b_id and p_team_b_score > p_team_a_score) then 1
        else 0
      end
  from public.matches m
  where m.id = p_match_id and p.id in (m.manager_a_id, m.manager_b_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- MVP voting: unavailable players cannot vote or be voted for.
-- ---------------------------------------------------------------------------
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
    where match_id = new.match_id and player_id = new.voter_id and not is_unavailable
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
    where match_id = new.match_id and player_id = new.voted_player_id and not is_unavailable
  ) then
    raise exception 'MVP must be selected from this match roster.' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop policy if exists "eligible players vote once" on public.motm_votes;
create policy "eligible players vote once" on public.motm_votes for insert to authenticated with check (
  voter_id = auth.uid()
  and exists (select 1 from public.matches m where m.id = match_id and m.status = 'completed')
  and exists (select 1 from public.match_players mp where mp.match_id = motm_votes.match_id and mp.player_id = auth.uid() and not mp.is_unavailable)
  and exists (select 1 from public.match_players mp where mp.match_id = motm_votes.match_id and mp.player_id = voted_player_id and not mp.is_unavailable)
);

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------
revoke all on function public.substitute_match_player(uuid, uuid, uuid) from public, anon;
revoke all on function public.undo_match_substitution(uuid, uuid) from public, anon;
grant execute on function public.substitute_match_player(uuid, uuid, uuid) to authenticated;
grant execute on function public.undo_match_substitution(uuid, uuid) to authenticated;