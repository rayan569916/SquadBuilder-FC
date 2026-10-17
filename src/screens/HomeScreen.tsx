import React, { useEffect, useState } from 'react';
import { Activity, ArrowRight, CalendarDays, ChartNoAxesColumn, CheckCircle2, Clock3, MapPin, ShieldCheck, Trophy } from 'lucide-react';
import { api, MatchDetail } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Match } from '../types/database';

interface HomeScreenProps {
  onNavigate: (screen: string, id?: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate }) => {
  const { currentUser, isManager, isAdmin } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [upcomingDetail, setUpcomingDetail] = useState<MatchDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getMatches().then(setMatches)
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'Unable to load matches.'))
      .finally(() => setLoading(false));
  }, []);

  const upcoming = matches.filter((match) => match.status === 'upcoming').sort((a, b) => a.date.localeCompare(b.date));
  const recent = matches.filter((match) => match.status === 'completed').sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);

  const upcomingMatch = upcoming[0];
  const recentForm = currentUser?.recent_form || [];
  const formValues = recentForm.slice(-5).map((result) => result === 'W' ? 3 : result === 'D' ? 1 : 0);
  const formPoints = formValues.map((value, index) => `${formValues.length === 1 ? 50 : 8 + (index / (formValues.length - 1)) * 84},${62 - value * 14}`).join(' ');
  const teamSize = upcomingMatch?.format === 'custom'
    ? upcomingMatch.custom_players_per_team || 0
    : Number(upcomingMatch?.format.replace('s', '') || 0);
  const rosterTarget = teamSize * 2;
  const rosterCount = upcomingDetail?.roster.length || 0;
  const lineupCount = upcomingDetail?.lineups.length || 0;
  const readiness = rosterTarget ? Math.min(100, Math.round((rosterCount / rosterTarget) * 100)) : 0;

  useEffect(() => {
    if (!upcomingMatch) {
      setUpcomingDetail(null);
      return;
    }
    let active = true;
    setLoadingDetail(true);
    api.getMatchDetail(upcomingMatch.id)
      .then((detail) => { if (active) setUpcomingDetail(detail); })
      .catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load squad readiness.'); })
      .finally(() => { if (active) setLoadingDetail(false); });
    return () => { active = false; };
  }, [upcomingMatch?.id]);

  return (
    <div className="mx-auto max-w-xl space-y-5 px-4 py-5 sm:px-6 sm:py-7">
      <section className="glass-card flex items-center gap-4 rounded-2xl p-4 sm:p-5">
        <div className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border border-primary/40 bg-surface-container-high text-lg font-bold text-white shadow-[0_0_22px_rgba(112,66,248,0.25)]">
          {currentUser?.avatar_url ? <img src={currentUser.avatar_url} alt={`${currentUser.name} profile`} className="h-full w-full object-cover" /> : currentUser?.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary">{currentUser?.role} · Squad Profile</p>
          <h1 className="mt-1 truncate font-display text-xl font-semibold text-white">{currentUser?.name}</h1>
          <p className="mt-1 text-xs text-slate-400">{currentUser?.position} · {currentUser?.club || 'SquadBuilder FC'} · {currentUser?.elo_rating} ELO</p>
        </div>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-sky-200/20 bg-sky-200/10 text-sky-200"><ShieldCheck size={17} /></span>
      </section>

      <div className="flex items-center justify-between px-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">Telemetry &amp; Momentum</p>
        <button onClick={() => onNavigate('leaderboards')} className="flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] text-primary"><ChartNoAxesColumn size={12} /> Rankings</button>
      </div>

      <section className="glass-card rounded-2xl p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-200"><Activity size={14} /> Momentum &amp; goal curve</h2><span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.08] px-2.5 py-1 text-[9px] text-emerald-200">{currentUser?.win_percentage}% win rate</span></div>
        <div className="flex items-end justify-between"><p className="font-display text-2xl font-semibold text-white">{currentUser?.elo_rating}<span className="ml-1 text-xs font-normal text-slate-400">ELO</span></p><span className="text-[10px] text-emerald-200">{currentUser?.overall_rating} OVR</span></div>
        <div className="mt-2 h-20 rounded-lg bg-[#080a10]/40 p-2"><svg viewBox="0 0 100 70" preserveAspectRatio="none" className="h-full w-full" role="img" aria-label="Recent match form momentum"><polyline points={formPoints} fill="none" stroke="#10b981" strokeWidth="2" vectorEffect="non-scaling-stroke" />{formValues.map((value, index) => <circle key={`${value}-${index}`} cx={formValues.length === 1 ? 50 : 8 + (index / (formValues.length - 1)) * 84} cy={62 - value * 14} r="2" fill="#a2caf9" />)}</svg></div>
        <div className="mt-3 flex items-center justify-between gap-3"><div className="flex gap-1.5">{recentForm.length ? recentForm.slice(-5).map((result, index) => <span key={`${result}-${index}`} className={`grid h-6 w-6 place-items-center rounded-full border text-[9px] font-semibold ${result === 'W' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200' : result === 'D' ? 'border-amber-300/30 bg-amber-300/10 text-amber-200' : 'border-rose-400/30 bg-rose-400/10 text-rose-200'}`}>{result}</span>) : <span className="text-[10px] text-slate-500">No results yet</span>}</div><span className="text-right text-[9px] text-slate-400">{currentUser?.matches_played} matches · {currentUser?.goals} goals</span></div>
      </section>

      <section className="glass-card rounded-2xl p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-200"><CheckCircle2 size={14} /> Squad readiness</h2><span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[9px] text-primary">{loadingDetail ? 'Syncing' : upcomingDetail ? `${readiness}% assigned` : 'No active lineup'}</span></div>
        {upcomingDetail ? <>
          <div className="flex items-center justify-between text-xs"><span className="text-white">Players assigned</span><span className="text-slate-300">{rosterCount} / {rosterTarget}</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-200 transition-[width]" style={{ width: `${readiness}%` }} /></div>
          <div className="mt-3 flex items-center justify-between text-[9px]"><span className="text-slate-400">{lineupCount} / {rosterTarget} lineup positions saved</span><span className={rosterCount === rosterTarget && lineupCount === rosterTarget ? 'text-emerald-200' : 'text-amber-200'}>{rosterCount === rosterTarget && lineupCount === rosterTarget ? 'Ready' : 'Incomplete'}</span></div>
          <p className="mt-2 text-[9px] text-slate-400">{currentUser?.injuries_count || 0} recorded injuries · {currentUser?.matches_played || 0} matches played</p>
        </> : <p className="text-xs text-slate-400">{upcomingMatch ? 'Loading roster details…' : 'Readiness appears when a fixture is scheduled.'}</p>}
      </section>

      <section className="glass-card rounded-2xl p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Matchday spotlight</p><h2 className="mt-1 font-display text-base font-semibold text-white">{upcomingMatch ? new Date(upcomingMatch.date).toLocaleDateString() : 'Squad schedule'}</h2></div>
          <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] text-slate-300">{upcomingMatch?.format === 'custom' ? `${upcomingMatch.custom_players_per_team} a side` : upcomingMatch?.format || `${upcoming.length} upcoming`}</span>
        </div>
        {loading ? <p className="py-5 text-sm text-slate-400">Loading fixtures…</p> : upcomingMatch ? <>
          <div className="rounded-xl border border-white/[0.08] bg-[#080a10]/45 p-4">
            <p className="flex items-center gap-1.5 text-[10px] text-slate-400"><CalendarDays size={13} />{new Date(upcomingMatch.date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · {upcomingMatch.venue || 'Venue to be confirmed'}</p>
            <div className="my-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center"><span className="truncate text-sm font-semibold text-white">{upcomingMatch.team_a_name}</span><span className="grid h-10 w-10 place-items-center rounded-full border-2 border-primary/30 text-[9px] font-semibold text-primary">VS</span><span className="truncate text-sm font-semibold text-white">{upcomingMatch.team_b_name}</span></div>
            <p className="flex items-center gap-1.5 truncate text-xs text-sky-200"><MapPin size={13} />{upcomingMatch.venue || 'Venue to be confirmed'}</p>
          </div>
          <button onClick={() => onNavigate('formation', upcomingMatch.id)} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-primary-container px-4 text-sm font-semibold text-white shadow-[0_0_20px_rgba(112,66,248,0.28)]">View Lineup <ArrowRight size={16} /></button>
        </> : <div className="rounded-xl border border-dashed border-white/15 p-4"><p className="text-sm text-white">No match is scheduled</p>{(isManager || isAdmin) && <button onClick={() => onNavigate('balancer')} className="mt-3 inline-flex items-center gap-2 text-sm text-sky-200"><CalendarDays size={15} />Create fixture<ArrowRight size={14} /></button>}</div>}
      </section>

      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}

      <section className="glass-card rounded-2xl p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-200">Recent ledger</p><h2 className="mt-1 font-display text-base font-semibold text-white">Last 3 matches</h2></div><button title="Full fixture ledger" onClick={() => onNavigate('match_history')} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-sky-200"><Clock3 size={16} /></button></div>
        {recent.length ? <div className="space-y-2">{recent.map((match) => <button key={match.id} onClick={() => onNavigate('match_history', match.id)} className="grid w-full grid-cols-[2.7rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-white/[0.08] bg-[#080a10]/35 p-3 text-left hover:bg-white/[0.05]">
          <span className="grid h-10 w-10 place-items-center rounded-full border border-emerald-300/20 bg-emerald-300/[0.08] text-[10px] font-semibold text-emerald-200">{match.team_a_score === match.team_b_score ? 'DRAW' : 'FT'}</span>
          <span className="min-w-0"><span className="block truncate text-xs font-medium text-white">vs {match.team_a_name} · {match.team_b_name}</span><span className="mt-1 block truncate text-[10px] text-slate-400">{new Date(match.date).toLocaleDateString()} · {match.venue || 'Venue not set'}</span></span>
          <span className="rounded-lg border border-primary/20 bg-primary/10 px-2 py-1 text-sm font-semibold tabular-nums text-primary">{match.team_a_score}–{match.team_b_score}</span>
        </button>)}</div> : !loading && <p className="rounded-xl border border-dashed border-white/15 p-4 text-sm text-slate-400">Completed match results will appear here.</p>}
        <button onClick={() => onNavigate('match_history')} className="mt-4 flex w-full items-center justify-center gap-2 border-t border-white/[0.07] pt-4 text-xs font-medium text-sky-200">View full fixture ledger <ArrowRight size={14} /></button>
      </section>
    </div>
  );
};
