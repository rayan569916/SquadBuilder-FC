import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, LoaderCircle, MapPin, Shuffle, Users } from 'lucide-react';
import { api } from '../lib/api';
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
    <div className="space-y-6 px-4 py-6 sm:px-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">Match setup</p>
        <h1 className="mt-2 text-2xl font-bold text-white">Create a match</h1>
        <p className="mt-1 text-sm text-slate-400">Set the fixture, choose who is available, then draw the teams.</p>
      </header>

      <section className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-2">
        <label className="text-sm text-slate-300">Team A name<input value={teamAName} onChange={(event) => setTeamAName(event.target.value)} className="mt-1 block w-full rounded-lg border border-white/10 bg-[#080a10] px-3 py-2.5 text-white" /></label>
        <label className="text-sm text-slate-300">Team B name<input value={teamBName} onChange={(event) => setTeamBName(event.target.value)} className="mt-1 block w-full rounded-lg border border-white/10 bg-[#080a10] px-3 py-2.5 text-white" /></label>
        <label className="text-sm text-slate-300">Team A manager<select value={managerAId} onChange={(event) => setManagerAId(event.target.value)} disabled={!isAdmin} className="mt-1 block w-full rounded-lg border border-white/10 bg-[#080a10] px-3 py-2.5 text-white disabled:opacity-70">{managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name}</option>)}</select></label>
        <label className="text-sm text-slate-300">Team B manager<select value={managerBId} onChange={(event) => setManagerBId(event.target.value)} className="mt-1 block w-full rounded-lg border border-white/10 bg-[#080a10] px-3 py-2.5 text-white">{managers.filter((manager) => isAdmin || manager.id !== currentUser?.id).map((manager) => <option key={manager.id} value={manager.id}>{manager.name}</option>)}</select></label>
        <label className="text-sm text-slate-300"><span className="flex items-center gap-1.5"><CalendarClock size={15} /> Date and time</span><input required type="datetime-local" value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 block w-full rounded-lg border border-white/10 bg-[#080a10] px-3 py-2.5 text-white" /></label>
        <label className="text-sm text-slate-300"><span className="flex items-center gap-1.5"><MapPin size={15} /> Venue</span><input required value={venue} onChange={(event) => setVenue(event.target.value)} placeholder="Turf venue" className="mt-1 block w-full rounded-lg border border-white/10 bg-[#080a10] px-3 py-2.5 text-white" /></label>
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-sm text-slate-300">Match type</legend>
          <div className="flex flex-wrap gap-2">
            {(['5s', '6s', '7s', 'custom'] as MatchFormat[]).map((value) => <button type="button" key={value} onClick={() => { setFormat(value); setTeamAIds([]); setTeamBIds([]); }} aria-pressed={format === value} className={`rounded-lg border px-4 py-2 text-sm ${format === value ? 'border-emerald-300 bg-emerald-300/10 text-emerald-200' : 'border-white/10 text-slate-300'}`}>{value === 'custom' ? 'Other' : value}</button>)}
          </div>
        </fieldset>
        {format === 'custom' && <label className="text-sm text-slate-300">Players per team<input type="number" min={1} max={30} value={customPlayers} onChange={(event) => { setCustomPlayers(Number(event.target.value)); setTeamAIds([]); setTeamBIds([]); }} className="mt-1 block w-full rounded-lg border border-white/10 bg-[#080a10] px-3 py-2.5 text-white" /></label>}
      </section>

      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="flex items-center gap-2 font-semibold text-white"><Users size={17} /> Available players</h2><p className="mt-1 text-xs text-slate-400">Select exactly {teamSize * 2} players ({teamSize} per team). {selectedIds.length} selected.</p></div>
          <button type="button" onClick={() => { setSelectedIds(profiles.map((profile) => profile.id)); setTeamAIds([]); setTeamBIds([]); }} className="text-sm text-emerald-300 hover:text-emerald-200">Select all</button>
        </div>
        {loadingProfiles ? <LoaderCircle className="animate-spin text-slate-400" /> : (
          <div className="grid gap-2 sm:grid-cols-2">
            {profiles.map((profile) => <label key={profile.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-[#090b11] p-3">
              <input type="checkbox" checked={selectedIds.includes(profile.id)} onChange={() => togglePlayer(profile.id)} className="h-4 w-4 accent-emerald-400" />
              <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-800 text-xs font-semibold text-white">{profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : profile.name.slice(0, 2).toUpperCase()}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm text-white">{profile.name}</span><span className="text-xs text-slate-400">{profile.position} · {profile.overall_rating} rating</span></span>
            </label>)}
          </div>
        )}
      </section>

      <button type="button" onClick={randomizeTeams} disabled={!drawReady} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 font-semibold text-[#07110f] disabled:cursor-not-allowed disabled:opacity-50"><Shuffle size={18} /> Randomly draw teams</button>

      {assignmentsReady && <section className="grid gap-4 md:grid-cols-2">
        {([{ key: 'A', name: teamAName, set: setTeamAName, ids: teamAIds }, { key: 'B', name: teamBName, set: setTeamBName, ids: teamBIds }] as const).map((team) => <div key={team.key} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h2 className="mb-3 font-semibold text-white">{team.name} <span className="text-xs text-slate-400">{team.ids.length}/{teamSize}</span></h2>
          <ul className="space-y-2">{team.ids.map((playerId) => {
            const player = profiles.find((item) => item.id === playerId);
            return <li key={playerId} className="flex items-center justify-between gap-2 text-sm"><span className="truncate text-slate-200">{player?.name}</span><button type="button" onClick={() => movePlayer(playerId, team.key)} className="rounded-md border border-white/10 px-2 py-1 text-xs text-emerald-200">Move to {team.key === 'A' ? 'B' : 'A'}</button></li>;
          })}</ul>
        </div>)}</section>}

      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      <button type="button" onClick={() => void saveMatch()} disabled={saving || !assignmentsReady} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/10 px-4 font-semibold text-white disabled:opacity-50">{saving && <LoaderCircle size={17} className="animate-spin" />}Create match</button>
    </div>
  );
};
