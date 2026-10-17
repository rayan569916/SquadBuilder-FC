import React, { useEffect, useMemo, useState } from 'react';
import { Award, LoaderCircle, Shield, Target, Trophy, TrendingUp, Users } from 'lucide-react';
import { api } from '../lib/api';
import { Profile } from '../types/database';

interface LeaderboardsScreenProps {
  onSelectPlayer?: (playerId: string) => void;
}

type Criterion = 'goals' | 'assists' | 'winrate' | 'motm';

const criteria: { id: Criterion; label: string; Icon: typeof Target }[] = [
  { id: 'goals', label: 'Goals', Icon: Target },
  { id: 'assists', label: 'Assists', Icon: Award },
  { id: 'winrate', label: 'Win rate', Icon: TrendingUp },
  { id: 'motm', label: 'MOTM', Icon: Trophy },
];

export const LeaderboardsScreen: React.FC<LeaderboardsScreenProps> = ({ onSelectPlayer }) => {
  const [view, setView] = useState<'players' | 'managers'>('players');
  const [criterion, setCriterion] = useState<Criterion>('goals');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getProfiles().then(setProfiles)
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'Unable to load player statistics.'))
      .finally(() => setLoading(false));
  }, []);

  const ranked = useMemo(() => [...profiles]
    .filter((profile) => view === 'players' || profile.role === 'manager' || profile.role === 'admin')
    .sort((a, b) => {
      if (view === 'managers') return b.matches_won - a.matches_won || b.matches_managed - a.matches_managed;
      if (criterion === 'assists') return b.assists - a.assists;
      if (criterion === 'winrate') return b.win_percentage - a.win_percentage;
      if (criterion === 'motm') return b.motm_count - a.motm_count;
      return b.goals - a.goals;
    }), [profiles, view, criterion]);

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6">
      <header><p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">Club statistics</p><h1 className="mt-2 text-2xl font-bold text-white">Leaderboards</h1><p className="mt-1 text-sm text-slate-400">Rankings are calculated from recorded match results.</p></header>

      <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Leaderboard type">
        {(['players', 'managers'] as const).map((value) => <button key={value} role="tab" aria-selected={view === value} onClick={() => setView(value)} className={`rounded-lg border px-3 py-2.5 text-sm capitalize ${view === value ? 'border-emerald-300/40 bg-emerald-300/10 text-emerald-200' : 'border-white/10 text-slate-400'}`}>{value}</button>)}
      </div>

      {view === 'players' && <div className="flex flex-wrap gap-2">{criteria.map(({ id, label, Icon }) => <button key={id} onClick={() => setCriterion(id)} aria-pressed={criterion === id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${criterion === id ? 'border-emerald-300/40 text-emerald-200' : 'border-white/10 text-slate-400'}`}><Icon size={15} />{label}</button>)}</div>}
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      {loading ? <div className="grid min-h-40 place-items-center"><LoaderCircle className="animate-spin text-slate-300" /></div> : <section className="divide-y divide-white/10 rounded-xl border border-white/10">
        {ranked.map((profile, index) => {
          const metric = view === 'managers'
            ? `${profile.matches_won} wins · ${profile.matches_managed} managed`
            : criterion === 'goals' ? `${profile.goals} goals`
              : criterion === 'assists' ? `${profile.assists} assists`
                : criterion === 'winrate' ? `${profile.win_percentage}% win rate`
                  : `${profile.motm_count} MOTM`;
          return <button key={profile.id} onClick={() => onSelectPlayer?.(profile.id)} className="grid w-full grid-cols-[2rem_2.5rem_minmax(0,1fr)_auto] items-center gap-3 p-3 text-left hover:bg-white/[0.04]">
            <span className="text-center text-sm font-semibold tabular-nums text-slate-500">{index + 1}</span>
            <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-slate-800 text-xs font-semibold text-white">{profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : profile.name.slice(0, 2).toUpperCase()}</span>
            <span className="min-w-0"><span className="block truncate text-sm font-medium text-white">{profile.name}</span><span className="flex items-center gap-1 text-xs capitalize text-slate-400"><Users size={12} />{profile.role} · {profile.position}</span></span>
            <span className="flex items-center gap-1 text-right text-xs font-semibold text-emerald-200">{view === 'managers' ? <Shield size={14} /> : criterion === 'motm' ? <Trophy size={14} /> : criterion === 'assists' ? <Award size={14} /> : criterion === 'winrate' ? <TrendingUp size={14} /> : <Target size={14} />}{metric}</span>
          </button>;
        })}
        {ranked.length === 0 && <p className="p-5 text-sm text-slate-400">Match statistics will appear after results are recorded.</p>}
      </section>}
    </div>
  );
};
