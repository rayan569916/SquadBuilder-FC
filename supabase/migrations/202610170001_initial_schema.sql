create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  role text not null default 'player' check (role in ('admin', 'manager', 'player')),
  age integer not null default 24,
  position text not null default 'MF' check (position in ('GK', 'DF', 'MF', 'FW')),
  avatar_path text,
  club text,
  jersey_number integer,
  elo_rating integer not null default 1200,
  overall_rating integer not null default 50,
  goals integer not null default 0,
  assists integer not null default 0,
  motm_count integer not null default 0,
  matches_played integer not null default 0,
  total_wins integer not null default 0,
  win_percentage numeric(5, 2) not null default 0,
  saves integer not null default 0,
  tackles integer not null default 0,
  injuries_count integer not null default 0,
  matches_managed integer not null default 0,
  matches_won integer not null default 0,
  trophies integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  date timestamptz not null,
  venue text not null,
  format text not null check (format in ('5s', '6s', '7s', 'custom')),
  custom_players_per_team integer,
  status text not null default 'upcoming' check (status in ('upcoming', 'completed')),
  team_a_name text not null,
  team_b_name text not null,
  manager_a_id uuid not null references public.profiles(id),
  manager_b_id uuid not null references public.profiles(id),
  team_a_score integer not null default 0 check (team_a_score >= 0),
  team_b_score integer not null default 0 check (team_b_score >= 0),
  motm_player_id uuid references public.profiles(id),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (format <> 'custom' or custom_players_per_team between 1 and 30),
  check (manager_a_id <> manager_b_id)
);

create table if not exists public.match_players (
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.profiles(id),
  team text not null check (team in ('A', 'B')),
  selected_at timestamptz not null default now(),
  primary key (match_id, player_id)
);

create table if not exists public.match_lineups (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null,
  player_id uuid not null,
  x_coord numeric(5, 2) not null default 50 check (x_coord between 0 and 100),
  y_coord numeric(5, 2) not null default 50 check (y_coord between 0 and 100),
  position_tag text not null default 'MF',
  unique (match_id, player_id),
  foreign key (match_id, player_id) references public.match_players(match_id, player_id) on delete cascade
);

create table if not exists public.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team text not null check (team in ('A', 'B')),
  event_type text not null check (event_type in ('goal', 'penalty_goal', 'freekick_goal', 'penalty_missed', 'penalty_save', 'save', 'tackle')),
  player_id uuid references public.profiles(id),
  assist_id uuid references public.profiles(id),
  minute integer check (minute between 0 and 200),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.motm_votes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  voter_id uuid not null references public.profiles(id) on delete cascade,
  voted_player_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (match_id, voter_id)
);

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'admin', false)
$$;

create or replace function public.set_profile_role(target_profile_id uuid, target_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can change account roles';
  end if;
  if target_role not in ('admin', 'manager', 'player') then
    raise exception 'Invalid account role';
  end if;
  update public.profiles set role = target_role where id = target_profile_id;
end;
$$;

create or replace function public.can_manage_match(target_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from public.matches m
    where m.id = target_match_id
      and auth.uid() in (m.manager_a_id, m.manager_b_id)
  )
$$;

create or replace function public.guard_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role is distinct from new.role
    and auth.uid() is not null
    and not public.is_admin() then
    raise exception 'Only an admin can change account roles';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role_change
before update on public.profiles
for each row execute function public.guard_profile_role_change();

create or replace function public.guard_match_managers()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (old.manager_a_id is distinct from new.manager_a_id or old.manager_b_id is distinct from new.manager_b_id)
    and auth.uid() is not null
    and not public.is_admin() then
    raise exception 'Only an admin can change assigned managers';
  end if;
  return new;
end;
$$;

create trigger matches_guard_managers
before update on public.matches
for each row execute function public.guard_match_managers();

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
    where e.player_id is null or scorer.player_id is null or scorer.team <> e.team
      or (e.assist_id is not null and (assister.player_id is null or assister.team <> e.team))
  ) then
    raise exception 'Event players must belong to the selected match roster and scoring team';
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
    where mp.match_id = p_match_id
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

create or replace function public.create_match_with_roster(
  p_match jsonb,
  p_roster jsonb,
  p_lineups jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_match_id uuid;
  manager_a uuid := (p_match->>'manager_a_id')::uuid;
  manager_b uuid := (p_match->>'manager_b_id')::uuid;
  expected_players integer;
  players_a integer;
  players_b integer;
begin
  if not public.is_admin() and public.current_user_role() <> 'manager' then
    raise exception 'Only admins and managers can create matches';
  end if;
  if not public.is_admin() and auth.uid() not in (manager_a, manager_b) then
    raise exception 'A manager can only create a match they manage';
  end if;
  if manager_a = manager_b then
    raise exception 'Each team must have a different manager';
  end if;
  if exists (
    select 1 from public.profiles p
    where p.id in (manager_a, manager_b) and p.role not in ('manager', 'admin')
  ) then
    raise exception 'Assigned team managers must have manager or admin access';
  end if;

  expected_players := case p_match->>'format'
    when '5s' then 5
    when '6s' then 6
    when '7s' then 7
    when 'custom' then (p_match->>'custom_players_per_team')::integer
    else null
  end;
  if expected_players is null or expected_players < 1 or expected_players > 30 then
    raise exception 'Invalid match format or team size';
  end if;

  select count(*) filter (where team = 'A'), count(*) filter (where team = 'B')
    into players_a, players_b
  from jsonb_to_recordset(coalesce(p_roster, '[]'::jsonb)) as r(player_id text, team text);
  if players_a <> expected_players or players_b <> expected_players then
    raise exception 'Each team must contain exactly the selected match size';
  end if;

  insert into public.matches (
    date, venue, format, custom_players_per_team, status,
    team_a_name, team_b_name, manager_a_id, manager_b_id, created_by
  ) values (
    (p_match->>'date')::timestamptz,
    p_match->>'venue',
    p_match->>'format',
    nullif(p_match->>'custom_players_per_team', '')::integer,
    'upcoming',
    p_match->>'team_a_name',
    p_match->>'team_b_name',
    manager_a,
    manager_b,
    auth.uid()
  ) returning id into new_match_id;

  insert into public.match_players (match_id, player_id, team)
  select new_match_id, r.player_id::uuid, r.team
  from jsonb_to_recordset(coalesce(p_roster, '[]'::jsonb)) as r(player_id text, team text);

  insert into public.match_lineups (match_id, player_id, x_coord, y_coord, position_tag)
  select new_match_id, l.player_id::uuid, l.x_coord, l.y_coord, l.position_tag
  from jsonb_to_recordset(coalesce(p_lineups, '[]'::jsonb)) as l(
    player_id text, x_coord numeric, y_coord numeric, position_tag text
  );

  return new_match_id;
end;
$$;

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
  from jsonb_to_recordset(coalesce(p_roster, '[]'::jsonb)) as r(player_id text, team text);
  if players_a <> expected_players or players_b <> expected_players then
    raise exception 'Each team must contain exactly the selected match size';
  end if;

  delete from public.match_lineups where match_id = p_match_id;
  delete from public.match_players where match_id = p_match_id;

  insert into public.match_players (match_id, player_id, team)
  select p_match_id, r.player_id::uuid, r.team
  from jsonb_to_recordset(coalesce(p_roster, '[]'::jsonb)) as r(player_id text, team text);

  insert into public.match_lineups (match_id, player_id, x_coord, y_coord, position_tag)
  select p_match_id, l.player_id::uuid, l.x_coord, l.y_coord, l.position_tag
  from jsonb_to_recordset(coalesce(p_lineups, '[]'::jsonb)) as l(
    player_id text, x_coord numeric, y_coord numeric, position_tag text
  );
end;
$$;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.set_profile_role(uuid, text) to authenticated;
grant execute on function public.can_manage_match(uuid) to authenticated;
grant execute on function public.save_match_result(uuid, integer, integer, jsonb) to authenticated;
grant execute on function public.create_match_with_roster(jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.save_match_roster_and_lineup(uuid, jsonb, jsonb) to authenticated;

revoke all on public.profiles, public.matches, public.match_players, public.match_lineups, public.match_events, public.motm_votes from anon, authenticated;
grant select on public.profiles, public.matches, public.match_players, public.match_lineups, public.match_events, public.motm_votes to authenticated;
grant update (name, age, position, avatar_path, club, jersey_number) on public.profiles to authenticated;
grant insert on public.motm_votes to authenticated;

revoke execute on function public.current_user_role() from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.set_profile_role(uuid, text) from public, anon;
revoke execute on function public.can_manage_match(uuid) from public, anon;
revoke execute on function public.save_match_result(uuid, integer, integer, jsonb) from public, anon;
revoke execute on function public.create_match_with_roster(jsonb, jsonb, jsonb) from public, anon;
revoke execute on function public.save_match_roster_and_lineup(uuid, jsonb, jsonb) from public, anon;

alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.match_players enable row level security;
alter table public.match_lineups enable row level security;
alter table public.match_events enable row level security;
alter table public.motm_votes enable row level security;

create policy "profiles readable by signed-in users" on public.profiles for select to authenticated using (true);
create policy "users update own profile or admins update all" on public.profiles for update to authenticated using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

create policy "matches readable by signed-in users" on public.matches for select to authenticated using (true);
create policy "admins and assigned managers create matches" on public.matches for insert to authenticated with check (public.is_admin() or (public.current_user_role() = 'manager' and created_by = auth.uid() and auth.uid() in (manager_a_id, manager_b_id)));
create policy "admins or assigned managers update matches" on public.matches for update to authenticated using (public.can_manage_match(id)) with check (public.can_manage_match(id));

create policy "match players readable by signed-in users" on public.match_players for select to authenticated using (true);
create policy "match managers edit roster" on public.match_players for all to authenticated using (public.can_manage_match(match_id)) with check (public.can_manage_match(match_id));

create policy "lineups readable by signed-in users" on public.match_lineups for select to authenticated using (true);
create policy "match managers edit lineups" on public.match_lineups for all to authenticated using (public.can_manage_match(match_id)) with check (public.can_manage_match(match_id));

create policy "events readable by signed-in users" on public.match_events for select to authenticated using (true);

create policy "votes readable by signed-in users" on public.motm_votes for select to authenticated using (true);
create policy "eligible players vote once" on public.motm_votes for insert to authenticated with check (
  voter_id = auth.uid()
  and exists (select 1 from public.matches m where m.id = match_id and m.status = 'completed')
  and exists (select 1 from public.match_players mp where mp.match_id = match_id and mp.player_id = auth.uid())
  and exists (select 1 from public.match_players mp where mp.match_id = match_id and mp.player_id = voted_player_id)
);
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars are publicly readable" on storage.objects for select using (bucket_id = 'avatars');
create policy "users upload their own avatar" on storage.objects for insert to authenticated with check (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "users update their own avatar" on storage.objects for update to authenticated using (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
) with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
