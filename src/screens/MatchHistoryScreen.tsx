import React, { useEffect, useRef, useState } from 'react';
import { CalendarDays, LoaderCircle, MapPin, Trophy } from 'lucide-react';
import { FormationsBoard } from '../components/FormationsBoard';
import { InlineMOTMPoll } from '../components/InlineMOTMPoll';
import { api, MatchDetail } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Match } from '../types/database';

interface MatchHistoryScreenProps {
  matchId?: string;
  onLogNewMatch?: () => void;
  onSelectMatch?: (matchId: string) => void;
}

type Filter = 'all' | 'upcoming' | 'completed';

export const MatchHistoryScreen: React.FC<MatchHistoryScreenProps> = ({ matchId, onLogNewMatch, onSelectMatch }) => {
  const { currentUser, isAdmin } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [formationTeam, setFormationTeam] = useState<'A' | 'B'>('A');
  const [selected, setSelected] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const matchDetailRef = useRef<HTMLElement>(null);

  useEffect(() => {
    api.getMatches().then(setMatches)
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'Unable to load matches.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (matchId) void openMatch(matchId);
  }, [matchId]);

  const openMatch = async (matchId: string) => {
    setDetailLoading(true);
    setSelected(null);
    setError(null);
    try {
      const detail = await api.getMatchDetail(matchId);
      setSelected(detail);
      setFormationTeam('A');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load match details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredMatches = matches.filter((match) => filter === 'all' || match.status === filter);
  const goalTrend = matches.filter((match) => match.status === 'completed')
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(-8)
    .map((match) => match.team_a_score + match.team_b_score);
  const averageGoals = goalTrend.length ? (goalTrend.reduce((sum, goals) => sum + goals, 0) / goalTrend.length).toFixed(1) : '0.0';
  const maxGoals = Math.max(1, ...goalTrend);
  const trendPoints = goalTrend.map((goals, index) => `${goalTrend.length === 1 ? 50 : (index / (goalTrend.length - 1)) * 100},${88 - (goals / maxGoals) * 66}`).join(' ');
  const form = matches.filter((match) => match.status === 'completed').slice(0, 5).map((match) => match.team_a_score === match.team_b_score ? 'D' : match.team_a_score > match.team_b_score ? 'W' : 'L');
  const selectedMatch = selected?.match;
  const canRecordResult = Boolean(selectedMatch && currentUser && (isAdmin || selectedMatch.manager_a_id === currentUser.id || selectedMatch.manager_b_id === currentUser.id));

  useEffect(() => {
    if (!selectedMatch || detailLoading) return;
    const frame = window.requestAnimationFrame(() => {
      matchDetailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [detailLoading, selectedMatch?.id]);

  return (
    <div className="space-y-5 px-4 py-5 sm:px-6 sm:py-7">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-sky-200">Squad fixtures &amp; results</p><h1 className="mt-1 font-display text-2xl font-semibold text-white">Match History</h1><p className="mt-1 text-xs text-slate-400">Precision archive · telemetry · match sheets</p></div>
        {onLogNewMatch && <button onClick={onLogNewMatch} className="rounded-full bg-primary-container px-4 py-2 text-xs font-semibold text-white shadow-[0_0_18px_rgba(112,66,248,0.3)]">Log new match</button>}
      </header>

      <div className="flex gap-2 overflow-x-auto rounded-full bg-white/[0.035] p-1" role="tablist" aria-label="Filter matches">
        {(['all', 'upcoming', 'completed'] as const).map((value) => <button key={value} role="tab" aria-selected={filter === value} onClick={() => setFilter(value)} className={`shrink-0 rounded-full px-4 py-2 text-xs capitalize ${filter === value ? 'bg-primary-container text-white shadow-[0_0_16px_rgba(112,66,248,0.28)]' : 'text-slate-400 hover:text-white'}`}>{value === 'all' ? 'All Matches' : value === 'upcoming' ? 'Upcoming' : 'Results'}</button>)}
      </div>

      <section className="rounded-2xl border border-white/[0.07] bg-surface-container-low/70 p-4">
        <div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">Goal trend · last 8 results</p><p className="mt-1 font-display text-xl font-semibold text-white">{averageGoals}<span className="ml-1 text-[10px] font-normal text-slate-400">goals / match</span></p></div><span className="rounded-full bg-sky-200/10 px-2.5 py-1 text-[9px] text-sky-200">{goalTrend.length} recorded</span></div>
        <div className="mt-3 h-20 w-full overflow-hidden rounded-lg bg-[#080a10]/40 p-1"><svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full" role="img" aria-label={`Combined goals in the last ${goalTrend.length} completed matches`}><defs><linearGradient id="goalTrendFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity="0.34" /><stop offset="100%" stopColor="#10b981" stopOpacity="0" /></linearGradient></defs>{trendPoints && <><polygon points={`0,100 ${trendPoints} 100,100`} fill="url(#goalTrendFill)" /><polyline points={trendPoints} fill="none" stroke="#34d399" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />{goalTrend.map((goals, index) => <circle key={`${goals}-${index}`} cx={goalTrend.length === 1 ? 50 : (index / (goalTrend.length - 1)) * 100} cy={88 - (goals / maxGoals) * 66} r="1.5" fill="#a2caf9" />)}</>}</svg></div>
        <div className="mt-3 flex items-center justify-between"><div className="flex gap-1">{form.length ? form.map((result, index) => <span key={`${result}-${index}`} className={`grid h-5 w-5 place-items-center rounded text-[8px] font-bold ${result === 'W' ? 'bg-emerald-400/15 text-emerald-200' : result === 'D' ? 'bg-amber-300/15 text-amber-200' : 'bg-rose-400/15 text-rose-200'}`}>{result}</span>) : <span className="text-[9px] text-slate-500">No results yet</span>}</div><span className="text-[9px] text-slate-400">Team A form</span></div>
      </section>

      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      {loading ? <div className="grid min-h-40 place-items-center"><LoaderCircle className="animate-spin text-slate-300" /></div> : (
        <div className="space-y-2">
          {filteredMatches.map((match) => <button key={match.id} onClick={() => void openMatch(match.id)} className="grid w-full grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-white/[0.07] bg-surface-container-low/80 p-4 text-left hover:bg-white/6">
            <span className="min-w-0"><span className="mb-1 flex flex-wrap items-center gap-1.5 text-[9px] text-slate-400"><CalendarDays size={11} />{new Date(match.date).toLocaleDateString()}<span>·</span><span className="rounded bg-white/6 px-1.5 py-0.5">{match.format}</span></span><span className="block truncate text-sm font-semibold text-white">{match.team_a_name} <span className="text-slate-500">vs</span> {match.team_b_name}</span><span className="mt-1 flex items-center gap-1 truncate text-[10px] text-slate-400"><MapPin size={11} />{match.venue || 'Venue not set'}</span></span>
            <span className="text-right"><span className={`block font-display text-xl font-semibold tabular-nums ${match.status === 'completed' ? 'text-white' : 'text-sky-200'}`}>{match.status === 'completed' ? `${match.team_a_score} – ${match.team_b_score}` : 'Upcoming'}</span><span className={`text-[9px] uppercase tracking-wide ${match.status === 'completed' ? 'text-emerald-200' : 'text-sky-200'}`}>{match.status}</span></span>
          </button>)}
          {filteredMatches.length === 0 && <p className="rounded-xl border border-white/10 p-5 text-sm text-slate-400">No matches in this view.</p>}
        </div>
      )}

      {detailLoading && <div className="grid min-h-24 place-items-center"><LoaderCircle className="animate-spin text-slate-300" /></div>}
      {selected && selectedMatch && <article ref={matchDetailRef} className="scroll-mt-20 space-y-5 border-t border-white/10 pt-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-xs uppercase tracking-widest text-emerald-300">{selectedMatch.status} match sheet</p><h2 className="mt-1 text-xl font-bold text-white">{selectedMatch.team_a_name} {selectedMatch.team_a_score} - {selectedMatch.team_b_score} {selectedMatch.team_b_name}</h2><p className="mt-1 text-sm text-slate-400">{new Date(selectedMatch.date).toLocaleString()} · {selectedMatch.venue}</p></div>
          <div className="flex gap-2">
            {canRecordResult && selectedMatch.status === 'upcoming' && onSelectMatch && <button onClick={() => onSelectMatch(selectedMatch.id)} className="rounded-lg border border-white/10 px-3 py-2 text-sm text-emerald-200">Enter final result</button>}
          </div>
        </header>

        <section className="space-y-3">
          <div className="grid grid-cols-2 rounded-full bg-white/5 p-1" role="tablist" aria-label="Match team formation">
            {(['A', 'B'] as const).map((team) => <button key={team} role="tab" aria-selected={formationTeam === team} onClick={() => setFormationTeam(team)} className={`rounded-full px-3 py-2 text-xs transition ${formationTeam === team ? 'bg-primary-container text-white' : 'text-slate-400 hover:text-white'}`}>{team === 'A' ? selectedMatch.team_a_name : selectedMatch.team_b_name}</button>)}
          </div>
          <section className="glass-card rounded-2xl p-4">
            <h3 className="mb-3 text-sm font-semibold text-white">{formationTeam === 'A' ? selectedMatch.team_a_name : selectedMatch.team_b_name} roster</h3>
            <ul className="mb-4 grid gap-2 sm:grid-cols-2">{selected.roster.filter((entry) => entry.team === formationTeam).map((entry) => <li key={entry.player_id} className="flex items-center justify-between gap-2 rounded-lg bg-white/3 px-3 py-2 text-sm"><span className="truncate text-slate-200">{entry.player?.name}</span><span className="shrink-0 text-xs text-slate-500">{entry.player?.position}</span></li>)}</ul>
            <h4 className="mb-2 text-xs font-medium text-slate-300">Saved formation</h4>
            <FormationsBoard lineups={selected.lineups} activeTeam={formationTeam} />
          </section>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/3 p-4"><h3 className="mb-3 text-sm font-semibold text-white">Match events</h3><ol className="space-y-2">{selected.events.map((event, index) => <li key={event.id || index} className="flex justify-between gap-3 text-sm"><span className="text-slate-200">{event.type.replaceAll('_', ' ')} · {event.scorer_name || 'Player'}{event.assist_name ? ` (assist: ${event.assist_name})` : ''}{event.detail ? ` · ${event.detail}` : ''}</span><span className="shrink-0 text-xs text-slate-500">{event.minute !== undefined ? `${event.minute}′ · ` : ''}{event.team === 'A' ? selectedMatch.team_a_name : selectedMatch.team_b_name}</span></li>)}{selected.events.length === 0 && <li className="text-sm text-slate-400">No events have been recorded.</li>}</ol></section>

        {selectedMatch.status === 'completed' && <InlineMOTMPoll detail={selected} currentUser={currentUser} isAdmin={isAdmin} onDetailUpdated={setSelected} />}
      </article>}
    </div>
  );
};
