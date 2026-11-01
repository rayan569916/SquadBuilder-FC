import React, { useEffect, useState } from 'react';
import { ArrowLeftRight, LoaderCircle, Save, ShieldAlert } from 'lucide-react';
import { FormationsBoard } from '../components/FormationsBoard';
import { api, MatchDetail } from '../lib/api';
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

  return (
    <div className="space-y-5 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">Match tactics</p><h1 className="mt-2 text-2xl font-bold text-white">{detail.match.team_a_name} vs {detail.match.team_b_name}</h1><p className="mt-1 text-sm text-slate-400">{new Date(detail.match.date).toLocaleString()} · {detail.match.venue}</p></div>
        {canEdit && <div className="flex gap-2"><button onClick={() => setEditing((value) => !value)} className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200">{editing ? 'Stop editing' : 'Edit tactics'}</button>{editing && <button disabled={saving} onClick={() => void saveChanges()} className="flex items-center gap-2 rounded-lg bg-emerald-400 px-3 py-2 text-sm font-semibold text-[#07110f] disabled:opacity-50"><Save size={15} />{saving ? 'Saving' : 'Save'}</button>}</div>}
      </header>

      <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Team formation">
        {(['A', 'B'] as const).map((side) => <button key={side} role="tab" aria-selected={team === side} onClick={() => setTeam(side)} className={`rounded-lg border px-3 py-3 text-left ${team === side ? 'border-emerald-300/50 bg-emerald-300/10' : 'border-white/10 bg-white/[0.03]'}`}><span className="block text-sm font-semibold text-white">{side === 'A' ? detail.match.team_a_name : detail.match.team_b_name}</span><span className="mt-1 block text-xs text-slate-400">{roster.filter((entry) => entry.team === side).length} players</span></button>)}
      </div>

      <div className="flex items-center justify-between text-sm"><span className="text-slate-300">Manager: {managerName}</span><span className="text-xs uppercase text-slate-500">{detail.match.format}{detail.match.format === 'custom' ? ` · ${detail.match.custom_players_per_team} a side` : ''}</span></div>
      {editing && <div role="status" className="flex items-center gap-2 rounded-lg border border-emerald-300/20 bg-emerald-300/5 p-3 text-xs text-emerald-100"><ShieldAlert size={16} /> Drag players on the pitch to adjust positions. Use the roster transfer controls to rebalance teams.</div>}

      <FormationsBoard
        lineups={lineups}
        editable={editing && canEdit}
        onUpdateLineup={setLineups}
        onSelectPlayer={(id) => onViewPlayer?.(id)}
        activeTeam={team}
      />

      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="mb-3 text-sm font-semibold text-white">Selected roster</h2>
        <ul className="divide-y divide-white/10">
          {teamPlayers.map((entry) => <li key={entry.player_id} className="flex items-center justify-between gap-3 py-2.5">
            <button onClick={() => onViewPlayer?.(entry.player_id)} className="min-w-0 text-left"><span className="block truncate text-sm text-white">{entry.player?.name || 'Player'}</span><span className="text-xs text-slate-400">{entry.player?.position} · {entry.player?.overall_rating} rating</span></button>
            {editing && canEdit && <button onClick={() => transferPlayer(entry.player_id)} className="flex shrink-0 items-center gap-1 rounded-md border border-white/10 px-2 py-1.5 text-xs text-emerald-200"><ArrowLeftRight size={14} /> Transfer</button>}
          </li>)}
          {teamPlayers.length === 0 && <li className="py-4 text-sm text-slate-400">No players assigned to this side.</li>}
        </ul>
      </section>

      {(error || notice) && <p role={error ? 'alert' : 'status'} className={`text-sm ${error ? 'text-rose-300' : 'text-emerald-300'}`}>{error || notice}</p>}
    </div>
  );
};
