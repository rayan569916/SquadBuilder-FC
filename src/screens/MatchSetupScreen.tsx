import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, LoaderCircle, MapPin, Shuffle, Users } from 'lucide-react';
import { api } from '../lib/api';
import { getProfileOverallRating } from '../lib/playerRatings';
import { useAuth } from '../context/AuthContext';
import { Match, MatchFormat, MatchLineup, MatchRosterEntry, Profile } from '../types/database';

interface MatchSetupScreenProps {
  onMatchCreated?: (matchId: string) => void;
  onNavigateToFormation?: () => void;
}

const defaultDateTime = () => {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const shuffle = <T,>(items: T[]) => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
};

const createInitialLineup = (team: 'A' | 'B', players: Profile[], matchId = ''): MatchLineup[] => {
  const byPosition = new Map<string, Profile[]>();
  players.forEach((player) => byPosition.set(player.position, [...(byPosition.get(player.position) || []), player]));
  const rows: Record<string, number> = team === 'A'
    ? { GK: 88, DF: 68, MF: 46, FW: 22 }
    : { GK: 12, DF: 32, MF: 54, FW: 78 };
  return [...byPosition.entries()].flatMap(([position, group]) => group.map((player, index) => ({
    id: `${matchId}-${player.id}`,
    match_id: matchId,
    team,
    player_id: player.id,
    x_coord: Math.round(((index + 1) * 100) / (group.length + 1)),
    y_coord: rows[position] ?? (team === 'A' ? 50 : 50),
    position_tag: position,
    player,
  })));
};

export const MatchSetupScreen: React.FC<MatchSetupScreenProps> = ({ onMatchCreated }) => {
  const { currentUser, isManager, isAdmin } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [format, setFormat] = useState<MatchFormat>('7s');
  const [customPlayers, setCustomPlayers] = useState(8);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [teamAIds, setTeamAIds] = useState<string[]>([]);
  const [teamBIds, setTeamBIds] = useState<string[]>([]);
  const [teamAName, setTeamAName] = useState('Team A');
  const [teamBName, setTeamBName] = useState('Team B');
  const [managerAId, setManagerAId] = useState('');
  const [managerBId, setManagerBId] = useState('');
  const [date, setDate] = useState(defaultDateTime);
  const [venue, setVenue] = useState('');
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getProfiles()
      .then((rows) => {
        setProfiles(rows);
        const managers = rows.filter((profile) => profile.role === 'manager' || profile.role === 'admin');
        if (!isAdmin && currentUser) {
          setManagerAId(currentUser.id);
          setManagerBId(managers.find((manager) => manager.id !== currentUser.id)?.id || '');
        } else {
          setManagerAId(managers[0]?.id || '');
          setManagerBId(managers.find((manager) => manager.id !== managers[0]?.id)?.id || '');
        }
      })
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'Unable to load players.'))
      .finally(() => setLoadingProfiles(false));
  }, [currentUser, isAdmin]);

  const teamSize = format === '5s' ? 5 : format === '6s' ? 6 : format === '7s' ? 7 : customPlayers;
  const managers = useMemo(() => profiles.filter((profile) => profile.role === 'manager' || profile.role === 'admin'), [profiles]);
  const teamA = teamAIds.map((id) => profiles.find((profile) => profile.id === id)).filter((profile): profile is Profile => Boolean(profile));
  const teamB = teamBIds.map((id) => profiles.find((profile) => profile.id === id)).filter((profile): profile is Profile => Boolean(profile));
  const drawReady = selectedIds.length === teamSize * 2;
  const assignmentsReady = teamAIds.length === teamSize && teamBIds.length === teamSize;

  const randomizeTeams = () => {
    setError(null);
    if (!drawReady) {
      setError(`Select exactly ${teamSize * 2} available players for this match.`);
      return;
    }
    const randomized = shuffle(selectedIds);
    setTeamAIds(randomized.slice(0, teamSize));
    setTeamBIds(randomized.slice(teamSize));
  };

  const togglePlayer = (id: string) => {
    setSelectedIds((ids) => {
      if (ids.includes(id)) {
        setTeamAIds((team) => team.filter((playerId) => playerId !== id));
        setTeamBIds((team) => team.filter((playerId) => playerId !== id));
        return ids.filter((playerId) => playerId !== id);
      }
      return [...ids, id];
    });
  };

  const movePlayer = (playerId: string, from: 'A' | 'B') => {
    if (from === 'A') {
      const replacement = teamBIds.at(-1);
      if (!replacement) return;
      setTeamAIds((ids) => [...ids.filter((id) => id !== playerId), replacement]);
      setTeamBIds((ids) => [...ids.filter((id) => id !== replacement), playerId]);
    } else {
      const replacement = teamAIds.at(-1);
      if (!replacement) return;
      setTeamBIds((ids) => [...ids.filter((id) => id !== playerId), replacement]);
      setTeamAIds((ids) => [...ids.filter((id) => id !== replacement), playerId]);
    }
  };

  const saveMatch = async () => {
    setError(null);
    if (!currentUser || (!isManager && !isAdmin)) return;
    if (!assignmentsReady) return setError('Randomize the selected players into two complete teams first.');
    if (!teamAName.trim() || !teamBName.trim() || !venue.trim() || !date || !managerAId || !managerBId) {
      return setError('Complete the team names, both managers, date, and venue.');
    }
    if (managerAId === managerBId) return setError('Choose a different manager for each team.');
    if (!isAdmin && ![managerAId, managerBId].includes(currentUser.id)) {
      return setError('A manager can only create a match they are assigned to manage.');
    }

    setSaving(true);
    try {
      const roster: MatchRosterEntry[] = [
        ...teamAIds.map((player_id) => ({ match_id: '', player_id, team: 'A' as const })),
        ...teamBIds.map((player_id) => ({ match_id: '', player_id, team: 'B' as const })),
      ];
      const lineups = [
        ...createInitialLineup('A', teamA),
        ...createInitialLineup('B', teamB),
      ];
      const match: Omit<Match, 'id' | 'status' | 'team_a_score' | 'team_b_score'> = {
        date: new Date(date).toISOString(),
        venue: venue.trim(),
        format,
        custom_players_per_team: format === 'custom' ? teamSize : undefined,
        manager_a_id: managerAId,
        manager_b_id: managerBId,
        team_a_name: teamAName.trim(),
        team_b_name: teamBName.trim(),
      };
      const matchId = await api.createMatch(match, roster, lineups);
      onMatchCreated?.(matchId);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to create this match.');
    } finally {
      setSaving(false);
    }
  };

  if (!isManager && !isAdmin) return <section className="p-6 text-sm text-rose-300">Manager or admin access is required to create a match.</section>;

  return (
    <div className="space-y-5 px-4 py-5 sm:px-6 sm:py-7">
      <header className="text-center">
        <p className="mx-auto inline-flex rounded-full border border-sky-200/15 bg-sky-200/[0.07] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-sky-200">Matchweek · Squad Lab</p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-white">Team Balancer</h1>
        <p className="mt-1 text-xs text-slate-400">ELO-driven fair split for the upcoming match</p>
      </header>

      <fieldset>
        <legend className="sr-only">Match format</legend>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['5s', '7s', '11s', 'custom'] as const).map((value) => {
            const selected = value === '11s' ? format === 'custom' && customPlayers === 11 : value === 'custom' ? format === 'custom' && customPlayers !== 11 : format === value;
            return <button type="button" key={value} onClick={() => { if (value === '11s') { setFormat('custom'); setCustomPlayers(11); } else if (value === 'custom') { setFormat('custom'); if (customPlayers === 11) setCustomPlayers(8); } else setFormat(value); setTeamAIds([]); setTeamBIds([]); }} aria-pressed={selected} className={`shrink-0 rounded-full border px-4 py-2.5 text-xs ${selected ? 'border-primary/40 bg-primary/15 text-primary shadow-[0_0_16px_rgba(112,66,248,0.22)]' : 'border-white/[0.08] bg-white/[0.03] text-slate-300'}`}>{value === '11s' ? '11s Full Pitch' : value === 'custom' ? 'Custom' : `${value} League`}</button>;
          })}
        </div>
      </fieldset>

      <section className="grid grid-cols-2 gap-3">
        {[{ label: 'Home', name: teamAName, setName: setTeamAName, managerId: managerAId, setManager: setManagerAId, team: 'A' as const }, { label: 'Away', name: teamBName, setName: setTeamBName, managerId: managerBId, setManager: setManagerBId, team: 'B' as const }].map((side) => <div key={side.team} className="glass-card min-w-0 rounded-2xl p-3">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-sky-200">{side.label}</p>
          <input aria-label={`${side.label} team name`} value={side.name} onChange={(event) => side.setName(event.target.value)} className="mt-2 w-full min-w-0 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-slate-500" />
          <select aria-label={`${side.label} manager`} value={side.managerId} onChange={(event) => side.setManager(event.target.value)} disabled={side.team === 'A' && !isAdmin} className="mt-2 w-full min-w-0 rounded-lg border border-white/[0.08] bg-[#080a10]/70 px-2 py-2 text-[10px] text-slate-300 disabled:opacity-70">{managers.filter((manager) => side.team === 'A' ? isAdmin || manager.id === currentUser?.id : isAdmin || manager.id !== currentUser?.id).map((manager) => <option key={manager.id} value={manager.id}>{manager.name}</option>)}</select>
        </div>)}
      </section>

      <section className="glass-card grid gap-3 rounded-2xl p-4 sm:grid-cols-2">
        <label className="text-xs text-slate-300"><span className="flex items-center gap-1.5"><CalendarClock size={14} className="text-sky-200" /> Date and time</span><input required type="datetime-local" value={date} onChange={(event) => setDate(event.target.value)} className="mt-2 block w-full rounded-lg border border-white/10 bg-[#080a10] px-3 py-2.5 text-xs text-white" /></label>
        <label className="text-xs text-slate-300"><span className="flex items-center gap-1.5"><MapPin size={14} className="text-sky-200" /> Venue</span><input required value={venue} onChange={(event) => setVenue(event.target.value)} placeholder="Turf venue" className="mt-2 block w-full rounded-lg border border-white/10 bg-[#080a10] px-3 py-2.5 text-xs text-white" /></label>
        {format === 'custom' && customPlayers !== 11 && <label className="text-xs text-slate-300 sm:col-span-2">Players per team<input type="number" min={1} max={30} value={customPlayers} onChange={(event) => { setCustomPlayers(Number(event.target.value)); setTeamAIds([]); setTeamBIds([]); }} className="mt-2 block w-full rounded-lg border border-white/10 bg-[#080a10] px-3 py-2.5 text-white" /></label>}
      </section>

      <section className="glass-card rounded-2xl p-4">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="flex items-center gap-2 font-semibold text-white"><Users size={17} className="text-sky-200" /> Available players</h2><p className="mt-1 text-xs text-slate-400">Select {teamSize * 2} players · {selectedIds.length} selected</p></div>
          <button type="button" onClick={() => { setSelectedIds(profiles.map((profile) => profile.id)); setTeamAIds([]); setTeamBIds([]); }} className="text-xs text-sky-200 hover:text-white">Select all</button>
        </div>
        {loadingProfiles ? <LoaderCircle className="animate-spin text-slate-400" /> : (
          <div className="grid gap-2 sm:grid-cols-2">
            {profiles.map((profile) => <label key={profile.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/[0.07] bg-[#090b11]/70 p-3">
              <input type="checkbox" checked={selectedIds.includes(profile.id)} onChange={() => togglePlayer(profile.id)} className="h-4 w-4 accent-primary-container" />
              <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-800 text-xs font-semibold text-white">{profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : profile.name.slice(0, 2).toUpperCase()}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm text-white">{profile.name}</span><span className="text-xs text-slate-400">{profile.position} · {getProfileOverallRating(profile) ?? '—'} rating</span></span>
            </label>)}
          </div>
        )}
      </section>

      <button type="button" onClick={randomizeTeams} disabled={!drawReady} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary-container px-4 font-semibold text-white shadow-[0_0_24px_rgba(112,66,248,0.35)] disabled:cursor-not-allowed disabled:opacity-50"><Shuffle size={18} /> Randomize &amp; Balance</button>

      {assignmentsReady && <section className="grid gap-4 md:grid-cols-2">
        {([{ key: 'A', name: teamAName, set: setTeamAName, ids: teamAIds }, { key: 'B', name: teamBName, set: setTeamBName, ids: teamBIds }] as const).map((team) => <div key={team.key} className="glass-card rounded-2xl p-4">
          <h2 className="mb-3 font-semibold text-white">{team.name} <span className="text-xs text-slate-400">{team.ids.length}/{teamSize}</span></h2>
          <ul className="space-y-2">{team.ids.map((playerId) => {
            const player = profiles.find((item) => item.id === playerId);
            return <li key={playerId} className="flex items-center justify-between gap-2 text-sm"><span className="truncate text-slate-200">{player?.name}</span><button type="button" onClick={() => movePlayer(playerId, team.key)} className="rounded-md border border-white/10 px-2 py-1 text-xs text-emerald-200">Move to {team.key === 'A' ? 'B' : 'A'}</button></li>;
          })}</ul>
        </div>)}</section>}

      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      <button type="button" onClick={() => void saveMatch()} disabled={saving || !assignmentsReady} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 font-semibold text-white disabled:opacity-50">{saving && <LoaderCircle size={17} className="animate-spin" />}Save &amp; Invite</button>
    </div>
  );
};
