import React, { useEffect, useState } from 'react';
import { ArrowLeftRight, LoaderCircle, Save, ShieldAlert } from 'lucide-react';
import { FormationsBoard } from '../components/FormationsBoard';
import { api, MatchDetail } from '../lib/api';
import { getProfileOverallRating } from '../lib/playerRatings';
import { useAuth } from '../context/AuthContext';
import { MatchLineup, MatchRosterEntry } from '../types/database';

interface FormationScreenProps {
  matchId?: string;
  onViewPlayer?: (playerId: string) => void;
  onChooseMatch?: () => void;
}

export const FormationScreen: React.FC<FormationScreenProps> = ({ matchId, onViewPlayer, onChooseMatch }) => {
  const { currentUser, isAdmin } = useAuth();
  const [detail, setDetail] = useState<MatchDetail | null>(null);
  const [roster, setRoster] = useState<MatchRosterEntry[]>([]);
  const [lineups, setLineups] = useState<MatchLineup[]>([]);
  const [team, setTeam] = useState<'A' | 'B'>('A');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const load = async () => {
      const matches = await api.getMatches();
      const selectedId = matchId || matches.find((item) => item.status === 'upcoming')?.id;
      if (!selectedId) {
        if (active) setDetail(null);
        return;
      }
      const result = await api.getMatchDetail(selectedId);
      if (!active) return;
      setDetail(result);
      setRoster(result?.roster || []);
      setLineups(result?.lineups || []);
      setTeam('A');
    };
    load().catch((loadError: unknown) => {
      if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load this match.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [matchId]);

  const canEdit = Boolean(detail && detail.match.status === 'upcoming' && currentUser && (isAdmin || detail.match.manager_a_id === currentUser.id || detail.match.manager_b_id === currentUser.id));

  const transferPlayer = (playerId: string) => {
    setRoster((entries) => entries.map((entry) => entry.player_id === playerId
      ? { ...entry, team: entry.team === 'A' ? 'B' : 'A' }
      : entry));
    setLineups((entries) => entries.map((entry) => entry.player_id === playerId
      ? { ...entry, team: entry.team === 'A' ? 'B' : 'A', y_coord: 100 - entry.y_coord }
      : entry));
  };

  const saveChanges = async () => {
    if (!detail || !canEdit) return;
    setSaving(true);
    setError(null);
    try {
      await api.saveMatchRosterAndLineup(detail.match.id, roster, lineups);
      const refreshed = await api.getMatchDetail(detail.match.id);
      setDetail(refreshed);
      setRoster(refreshed?.roster || []);
      setLineups(refreshed?.lineups || []);
      setEditing(false);
      setNotice('Tactics saved.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save tactics.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="grid min-h-64 place-items-center text-slate-300"><LoaderCircle className="animate-spin" /></div>;
  if (!detail) return <section className="space-y-3 p-6"><h1 className="text-xl font-semibold text-white">No match selected</h1><p className="text-sm text-slate-400">Create a match before viewing its tactics.</p>{onChooseMatch && <button onClick={onChooseMatch} className="rounded-lg bg-emerald-400 px-4 py-2 font-semibold text-[#07110f]">Create match</button>}</section>;

  const teamPlayers = roster.filter((entry) => entry.team === team);
  const managerId = team === 'A' ? detail.match.manager_a_id : detail.match.manager_b_id;
  const managerName = detail.profiles.find((profile) => profile.id === managerId)?.name
    || 'Assigned manager';
  const teamRatings = teamPlayers.map((entry) => entry.player ? getProfileOverallRating(entry.player) : undefined);
  const averageRating = teamRatings.length > 0 && teamRatings.every((rating): rating is number => rating !== undefined)
    ? Math.round(teamRatings.reduce((total, rating) => total + rating, 0) / teamRatings.length)
    : undefined;

  return (
    <div className="space-y-5 px-4 py-5 sm:px-6 sm:py-7">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="inline-flex rounded-full border border-sky-200/15 bg-sky-200/[0.07] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-200">Tactics Lab · {detail.match.format}</p><h1 className="mt-2 font-display text-2xl font-semibold text-white">Tactical XI</h1><p className="mt-1 text-xs text-slate-400">{detail.match.team_a_name} vs {detail.match.team_b_name} · {new Date(detail.match.date).toLocaleDateString()}</p></div>
        {canEdit && <div className="flex gap-2"><button onClick={() => setEditing((value) => !value)} className="rounded-full border border-white/10 px-3 py-2 text-xs text-slate-200">{editing ? 'Stop editing' : 'Edit tactics'}</button>{editing && <button disabled={saving} onClick={() => void saveChanges()} className="flex items-center gap-2 rounded-full bg-primary-container px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Save size={14} />{saving ? 'Saving' : 'Save'}</button>}</div>}
      </header>

      <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Team formation">
        {(['A', 'B'] as const).map((side) => <button key={side} role="tab" aria-selected={team === side} onClick={() => setTeam(side)} className={`rounded-2xl border p-3 text-left transition ${team === side ? 'border-primary/40 bg-primary/[0.12] shadow-[0_0_18px_rgba(112,66,248,0.16)]' : 'border-white/[0.07] bg-white/3'}`}><span className="block text-[9px] font-semibold uppercase tracking-wide text-sky-200">Team {side}</span><span className="mt-1 block truncate text-sm font-semibold text-white">{side === 'A' ? detail.match.team_a_name : detail.match.team_b_name}</span><span className="mt-1 block text-[10px] text-slate-400">{roster.filter((entry) => entry.team === side).length} players</span></button>)}
      </div>

      <div className="flex items-center justify-between text-xs"><span className="text-slate-300">Manager: {managerName}</span><span className="text-[10px] uppercase text-slate-500">{detail.match.format}{detail.match.format === 'custom' ? ` · ${detail.match.custom_players_per_team} a side` : ''}</span></div>
      {editing && <div role="status" className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/[0.06] p-3 text-xs text-sky-100"><ShieldAlert size={16} /> Drag players on the pitch to adjust positions. Use the roster transfer controls to rebalance teams.</div>}

      <FormationsBoard
        lineups={lineups}
        editable={editing && canEdit}
        onUpdateLineup={setLineups}
        onSelectPlayer={(id) => onViewPlayer?.(id)}
        activeTeam={team}
      />

      <section className="glass-card rounded-2xl p-4">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-white">Selected roster</h2><span className="text-[10px] text-sky-200">Average {averageRating ?? '—'} OVR</span></div>
        <ul className="divide-y divide-white/10">
          {teamPlayers.map((entry) => <li key={entry.player_id} className="flex items-center justify-between gap-3 py-2.5">
            <button onClick={() => onViewPlayer?.(entry.player_id)} className="min-w-0 text-left"><span className="block text-sm text-white">{entry.player?.name || 'Player'}</span><span className="text-xs text-slate-400">{entry.player?.position} · {entry.player ? getProfileOverallRating(entry.player) ?? '—' : '—'} rating</span></button>
            {editing && canEdit && <button onClick={() => transferPlayer(entry.player_id)} className="flex shrink-0 items-center gap-1 rounded-full border border-white/10 px-2.5 py-1.5 text-[10px] text-sky-200"><ArrowLeftRight size={13} /> Transfer</button>}
          </li>)}
          {teamPlayers.length === 0 && <li className="py-4 text-sm text-slate-400">No players assigned to this side.</li>}
        </ul>
      </section>

      {(error || notice) && <p role={error ? 'alert' : 'status'} className={`text-sm ${error ? 'text-rose-300' : 'text-sky-200'}`}>{error || notice}</p>}
    </div>
  );
};
