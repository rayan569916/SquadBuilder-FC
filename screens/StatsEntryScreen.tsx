import React, { useEffect, useMemo, useState } from 'react';
import { CirclePlus, LoaderCircle, Trash2, Trophy } from 'lucide-react';
import { MOTMModal } from '../components/MOTMModal';
import { api, MatchDetail } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { MatchEvent, MatchEventType, MatchTeam, Profile } from '../types/database';

interface StatsEntryScreenProps {
  matchId?: string;
  onStatsSaved?: () => void;
  onChooseMatch?: () => void;
}

const scoringTypes: MatchEventType[] = ['goal', 'penalty_goal', 'freekick_goal'];
const eventLabels: Record<MatchEventType, string> = {
  goal: 'Goal',
  penalty_goal: 'Penalty goal',
  freekick_goal: 'Free-kick goal',
  penalty_missed: 'Penalty missed',
  penalty_save: 'Penalty saved',
  save: 'Save',
  tackle: 'Tackle',
};

export const StatsEntryScreen: React.FC<StatsEntryScreenProps> = ({ matchId, onStatsSaved, onChooseMatch }) => {
  const { currentUser, isAdmin } = useAuth();
  const [detail, setDetail] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [eventType, setEventType] = useState<MatchEventType>('goal');
  const [eventTeam, setEventTeam] = useState<MatchTeam>('A');
  const [playerId, setPlayerId] = useState('');
  const [assistId, setAssistId] = useState('');
  const [minute, setMinute] = useState('');
  const [notes, setNotes] = useState('');
  const [votingOpen, setVotingOpen] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const load = async () => {
      const matches = await api.getMatches();
      const selectedId = matchId || matches.find((match) => match.status === 'upcoming')?.id || matches[0]?.id;
      if (!selectedId) return;
      const loaded = await api.getMatchDetail(selectedId);
      if (!active) return;
      setDetail(loaded);
      setEvents(loaded?.events || []);
      setEventTeam('A');
      setPlayerId(loaded?.roster.find((entry) => entry.team === 'A')?.player_id || '');
    };
    load().catch((loadError: unknown) => {
      if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load match data.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [matchId]);

  const match = detail?.match;
  const isAssignedManager = Boolean(match && currentUser && (isAdmin || match.manager_a_id === currentUser.id || match.manager_b_id === currentUser.id));
  const canEdit = Boolean(isAssignedManager && match?.status !== 'completed');
  const teamAPlayers = detail?.roster.filter((entry) => entry.team === 'A').map((entry) => entry.player).filter((player): player is Profile => Boolean(player)) || [];
  const teamBPlayers = detail?.roster.filter((entry) => entry.team === 'B').map((entry) => entry.player).filter((player): player is Profile => Boolean(player)) || [];
  const eventPlayers = eventTeam === 'A' ? teamAPlayers : teamBPlayers;
  const candidates = detail?.roster.map((entry) => entry.player).filter((player): player is Profile => Boolean(player)) || [];
  const score = useMemo(() => events.reduce((total, event) => {
    if (!scoringTypes.includes(event.type)) return total;
    total[event.team] += 1;
    return total;
  }, { A: 0, B: 0 }), [events]);
  const hasVoted = detail?.votes.some((vote) => vote.voter_id === currentUser?.id) || false;
  const isParticipant = detail?.roster.some((entry) => entry.player_id === currentUser?.id) || false;

  useEffect(() => {
    if (!eventPlayers.some((player) => player.id === playerId)) setPlayerId(eventPlayers[0]?.id || '');
  }, [eventPlayers, playerId]);

  const addEvent = () => {
    if (!playerId) return;
    setEvents((current) => [...current, {
      id: crypto.randomUUID(),
      team: eventTeam,
      type: eventType,
      scorer_id: playerId,
      assist_id: assistId || undefined,
      minute: minute ? Number(minute) : undefined,
      detail: notes.trim() || undefined,
    }]);
    setAssistId('');
    setMinute('');
    setNotes('');
  };

  const saveResult = async () => {
    if (!match || !canEdit) return;
    setSaving(true);
    setError(null);
    try {
      await api.submitMatchStats(match.id, {
        team_a_score: score.A,
        team_b_score: score.B,
        events,
      });
      const refreshed = await api.getMatchDetail(match.id);
      setDetail(refreshed);
      setEvents(refreshed?.events || []);
      onStatsSaved?.();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save the match result.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="grid min-h-64 place-items-center text-slate-300"><LoaderCircle className="animate-spin" /></div>;
  if (!match) return <section className="space-y-3 p-6"><h1 className="text-xl font-semibold text-white">No match available</h1><p className="text-sm text-slate-400">Create or select a match before entering results.</p>{onChooseMatch && <button onClick={onChooseMatch} className="rounded-lg bg-emerald-400 px-4 py-2 font-semibold text-[#07110f]">Create match</button>}</section>;

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6">
      <header><p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">{match.status === 'completed' ? 'Final result' : 'After the match'}</p><h1 className="mt-2 text-2xl font-bold text-white">{match.team_a_name} vs {match.team_b_name}</h1><p className="mt-1 text-sm text-slate-400">{new Date(match.date).toLocaleString()} · {match.venue} · {match.format}{match.format === 'custom' ? ` (${match.custom_players_per_team} a side)` : ''}</p></header>

      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
          <div><p className="truncate text-sm font-semibold text-white">{match.team_a_name}</p><p className="mt-2 text-4xl font-bold tabular-nums text-emerald-200">{score.A}</p></div>
          <span className="text-slate-500">:</span>
          <div><p className="truncate text-sm font-semibold text-white">{match.team_b_name}</p><p className="mt-2 text-4xl font-bold tabular-nums text-emerald-200">{score.B}</p></div>
        </div>
        <p className="mt-3 text-center text-xs text-slate-400">Score is calculated from goal events.</p>
      </section>

      {canEdit && <section className="space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div><h2 className="font-semibold text-white">Add match event</h2><p className="mt-1 text-xs text-slate-400">Goals, penalties, free kicks, saves, and tackles are recorded individually.</p></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-slate-300">Event<select value={eventType} onChange={(event) => setEventType(event.target.value as MatchEventType)} className="mt-1 block w-full rounded-lg border border-white/10 bg-[#080a10] px-3 py-2.5 text-white">{Object.entries(eventLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="text-sm text-slate-300">Team<select value={eventTeam} onChange={(event) => setEventTeam(event.target.value as MatchTeam)} className="mt-1 block w-full rounded-lg border border-white/10 bg-[#080a10] px-3 py-2.5 text-white"><option value="A">{match.team_a_name}</option><option value="B">{match.team_b_name}</option></select></label>
          <label className="text-sm text-slate-300">Player<select required value={playerId} onChange={(event) => setPlayerId(event.target.value)} className="mt-1 block w-full rounded-lg border border-white/10 bg-[#080a10] px-3 py-2.5 text-white"><option value="">Choose player</option>{eventPlayers.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></label>
          {scoringTypes.includes(eventType) && <label className="text-sm text-slate-300">Assist (optional)<select value={assistId} onChange={(event) => setAssistId(event.target.value)} className="mt-1 block w-full rounded-lg border border-white/10 bg-[#080a10] px-3 py-2.5 text-white"><option value="">No assist</option>{eventPlayers.filter((player) => player.id !== playerId).map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></label>}
          <label className="text-sm text-slate-300">Minute<input type="number" min={0} max={200} value={minute} onChange={(event) => setMinute(event.target.value)} className="mt-1 block w-full rounded-lg border border-white/10 bg-[#080a10] px-3 py-2.5 text-white" /></label>
          <label className="text-sm text-slate-300">Notes<input value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={180} placeholder="Optional detail" className="mt-1 block w-full rounded-lg border border-white/10 bg-[#080a10] px-3 py-2.5 text-white" /></label>
        </div>
        <button type="button" disabled={!playerId} onClick={addEvent} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-emerald-200 disabled:opacity-50"><CirclePlus size={16} /> Add event</button>
      </section>}

      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-white"><Trophy size={17} /> Match events</h2>
        <ol className="divide-y divide-white/10">
          {events.map((event, index) => <li key={event.id || `${event.type}-${index}`} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <span className="min-w-0"><span className="font-medium text-white">{eventLabels[event.type]}</span><span className="text-slate-400"> · {event.scorer_name || 'Player'}{event.assist_name ? ` (assist: ${event.assist_name})` : ''}</span>{event.detail && <span className="block truncate text-xs text-slate-500">{event.detail}</span>}</span>
            <span className="flex shrink-0 items-center gap-2 text-xs text-slate-400">{event.minute !== undefined ? `${event.minute}′` : ''}<span>{event.team === 'A' ? match.team_a_name : match.team_b_name}</span>{canEdit && <button title="Remove event" onClick={() => setEvents((current) => current.filter((_, eventIndex) => eventIndex !== index))} className="text-rose-300"><Trash2 size={15} /></button>}</span>
          </li>)}
          {events.length === 0 && <li className="py-4 text-sm text-slate-400">No events have been recorded.</li>}
        </ol>
      </section>

      {canEdit && <button onClick={() => void saveResult()} disabled={saving} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 font-semibold text-[#07110f] disabled:opacity-50">{saving && <LoaderCircle size={17} className="animate-spin" />}Save final result</button>}
      {match.status === 'completed' && <section className="rounded-xl border border-emerald-300/20 bg-emerald-300/5 p-4"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold text-white">Player of the Match</h2><p className="mt-1 text-xs text-slate-400">{detail?.votes.length || 0} votes recorded</p></div><button disabled={!isParticipant || hasVoted} onClick={() => setVotingOpen(true)} className="rounded-lg bg-emerald-400 px-3 py-2 text-sm font-semibold text-[#07110f] disabled:opacity-50">{hasVoted ? 'Vote submitted' : isParticipant ? 'Vote' : 'Match players only'}</button></div></section>}

      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      <MOTMModal isOpen={votingOpen} onClose={() => setVotingOpen(false)} match={match} candidates={candidates} currentUserId={currentUser?.id || ''} canVote={isParticipant && match.status === 'completed'} onVoteCast={async () => {
        const refreshed = await api.getMatchDetail(match.id);
        setDetail(refreshed);
        setVotingOpen(false);
      }} />
    </div>
  );
};
