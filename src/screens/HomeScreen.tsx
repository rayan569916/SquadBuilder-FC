import React, { useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, ClipboardList, History, MapPin, ShieldCheck, Users } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Match } from '../types/database';

interface HomeScreenProps {
  onNavigate: (screen: string, id?: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate }) => {
  const { currentUser, isManager, isAdmin } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getMatches().then(setMatches)
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'Unable to load matches.'))
      .finally(() => setLoading(false));
  }, []);

  const upcoming = matches.filter((match) => match.status === 'upcoming').sort((a, b) => a.date.localeCompare(b.date));
  const recent = matches.filter((match) => match.status === 'completed').slice(0, 3);

  return (
    <div className="space-y-7 px-4 py-6 sm:px-6">
      <header className="flex items-center gap-4 border-b border-white/10 pb-5">
        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-slate-800 text-lg font-bold text-white">
          {currentUser?.avatar_url ? <img src={currentUser.avatar_url} alt="" className="h-full w-full object-cover" /> : currentUser?.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">SquadBuilder FC</p><h1 className="mt-1 truncate text-xl font-bold text-white">Welcome, {currentUser?.name}</h1><p className="mt-1 text-sm capitalize text-slate-400">{currentUser?.position} · {currentUser?.role}</p></div>
        <span className="hidden items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-xs capitalize text-slate-300 sm:flex"><ShieldCheck size={14} />{currentUser?.role}</span>
      </header>

      <section className="flex flex-wrap gap-2">
        {(isManager || isAdmin) && <button onClick={() => onNavigate('balancer')} className="flex items-center gap-2 rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-[#07110f]"><CalendarDays size={16} />Create match</button>}
        <button onClick={() => onNavigate('match_history')} className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-slate-200"><History size={16} />Match history</button>
        <button onClick={() => onNavigate('leaderboards')} className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-slate-200"><Users size={16} />Player stats</button>
      </section>

      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      <section>
        <div className="mb-3 flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">Schedule</p><h2 className="mt-1 text-lg font-semibold text-white">Upcoming matches</h2></div><span className="text-xs text-slate-400">{upcoming.length} scheduled</span></div>
        {loading ? <p className="text-sm text-slate-400">Loading schedule…</p> : upcoming.length ? <div className="space-y-2">{upcoming.slice(0, 3).map((match) => <button key={match.id} onClick={() => onNavigate('formation', match.id)} className="grid w-full grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left hover:bg-white/[0.06]"><span className="min-w-0"><span className="block truncate text-sm font-semibold text-white">{match.team_a_name} <span className="text-slate-500">vs</span> {match.team_b_name}</span><span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400"><span className="inline-flex items-center gap-1"><CalendarDays size={13} />{new Date(match.date).toLocaleString()}</span><span className="inline-flex items-center gap-1"><MapPin size={13} />{match.venue}</span><span>{match.format}{match.format === 'custom' ? ` · ${match.custom_players_per_team} a side` : ''}</span></span></span><ArrowRight size={17} className="text-emerald-300" /></button>)}</div> : <div className="rounded-xl border border-dashed border-white/15 p-5"><p className="text-sm font-medium text-white">No matches scheduled</p><p className="mt-1 text-sm text-slate-400">Create a fixture when your group picks a date and venue.</p></div>}
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">Results</p><h2 className="mt-1 text-lg font-semibold text-white">Recent matches</h2></div><button onClick={() => onNavigate('match_history')} className="flex items-center gap-1 text-sm text-emerald-300">All history <ArrowRight size={14} /></button></div>
        {recent.length ? <div className="divide-y divide-white/10 rounded-xl border border-white/10">{recent.map((match) => <button key={match.id} onClick={() => onNavigate('match_history', match.id)} className="grid w-full grid-cols-[1fr_auto] items-center gap-3 p-4 text-left hover:bg-white/[0.04]"><span className="min-w-0"><span className="block truncate text-sm text-white">{match.team_a_name} vs {match.team_b_name}</span><span className="mt-1 block text-xs text-slate-400">{new Date(match.date).toLocaleDateString()} · {match.venue}</span></span><span className="text-lg font-bold tabular-nums text-white">{match.team_a_score} - {match.team_b_score}</span></button>)}</div> : !loading && <p className="rounded-xl border border-dashed border-white/15 p-5 text-sm text-slate-400">Completed match results will appear here.</p>}
      </section>

      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><h2 className="flex items-center gap-2 text-sm font-semibold text-white"><ClipboardList size={16} />Your record</h2><div className="mt-3 grid grid-cols-3 gap-3 text-center"><div><p className="text-xl font-bold text-white">{currentUser?.matches_played ?? 0}</p><p className="text-xs text-slate-400">Matches</p></div><div><p className="text-xl font-bold text-white">{currentUser?.goals ?? 0}</p><p className="text-xs text-slate-400">Goals</p></div><div><p className="text-xl font-bold text-white">{currentUser?.motm_count ?? 0}</p><p className="text-xs text-slate-400">MOTM</p></div></div></section>
    </div>
  );
};
