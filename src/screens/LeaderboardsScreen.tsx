import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Award, Gauge, LoaderCircle, Shield, Target, Trophy, TrendingUp } from 'lucide-react';
import { api } from '../lib/api';
import { playerAttributeFields } from '../lib/playerRatings';
import { RadarChart } from '../components/RadarChart';
import { Profile } from '../types/database';

interface LeaderboardsScreenProps {
  onSelectPlayer?: (playerId: string) => void;
}

type Criterion = 'overall' | 'impact' | 'shooting' | 'passing' | 'defense' | 'physical' | 'goals' | 'assists' | 'winrate' | 'motm';

const criteria: { id: Criterion; label: string; Icon: typeof Target }[] = [
  { id: 'overall', label: 'Player rating', Icon: Gauge },
  { id: 'impact', label: 'Attack', Icon: Activity },
  { id: 'shooting', label: 'Shooting', Icon: Target },
  { id: 'passing', label: 'Passing', Icon: TrendingUp },
  { id: 'defense', label: 'Defense', Icon: Shield },
  { id: 'physical', label: 'Physical', Icon: Activity },
  { id: 'goals', label: 'Goals', Icon: Target },
  { id: 'assists', label: 'Assists', Icon: Award },
  { id: 'winrate', label: 'Win rate', Icon: TrendingUp },
  { id: 'motm', label: 'MOTM', Icon: Trophy },
];

export const LeaderboardsScreen: React.FC<LeaderboardsScreenProps> = ({ onSelectPlayer }) => {
  const [view, setView] = useState<'players' | 'managers'>('players');
  const [criterion, setCriterion] = useState<Criterion>('overall');
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
      if (['impact', 'shooting', 'passing', 'defense', 'physical'].includes(criterion)) {
        const attribute = criterion as 'impact' | 'shooting' | 'passing' | 'defense' | 'physical';
        return (b.attributes?.[attribute] || 0) - (a.attributes?.[attribute] || 0);
      }
      if (criterion === 'overall') return b.overall_rating - a.overall_rating;
      if (criterion === 'assists') return b.assists - a.assists;
      if (criterion === 'winrate') return b.win_percentage - a.win_percentage;
      if (criterion === 'motm') return b.motm_count - a.motm_count;
      return b.goals - a.goals;
    }), [profiles, view, criterion]);

  const featured = ranked[0];
  const featuredMetric = featured && (view === 'managers'
    ? `${featured.matches_won} wins`
    : criterion === 'overall' ? `${featured.overall_rating} OVR`
      : ['impact', 'shooting', 'passing', 'defense', 'physical'].includes(criterion)
        ? `${featured.attributes?.[criterion as 'impact' | 'shooting' | 'passing' | 'defense' | 'physical'] ?? '—'} / 100`
        : criterion === 'goals' ? `${featured.goals} goals`
      : criterion === 'assists' ? `${featured.assists} assists`
        : criterion === 'winrate' ? `${featured.win_percentage}% win rate`
          : `${featured.motm_count} MOTM`);

  return (
    <div className="space-y-5 px-4 py-5 sm:px-6 sm:py-7">
      <header className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-200">Global {view === 'players' ? 'player' : 'manager'} analytics</p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-white sm:text-3xl">Leaderboards</h1>
        <p className="mt-1 text-xs text-slate-400">Live club rankings · Synchronized match data</p>
      </header>

      <div className="grid grid-cols-2 rounded-full bg-white/[0.05] p-1" role="tablist" aria-label="Leaderboard type">
        {(['players', 'managers'] as const).map((value) => <button key={value} role="tab" aria-selected={view === value} onClick={() => setView(value)} className={`rounded-full px-3 py-2 text-xs capitalize transition ${view === value ? 'bg-primary-container text-white shadow-[0_0_18px_rgba(112,66,248,0.35)]' : 'text-slate-400 hover:text-white'}`}>{value === 'players' ? 'Player leaderboard' : 'Manager leaderboard'}</button>)}
      </div>

      {view === 'players' && <div className="flex gap-2 overflow-x-auto pb-1">{criteria.map(({ id, label, Icon }) => <button key={id} onClick={() => setCriterion(id)} aria-pressed={criterion === id} className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-[11px] transition ${criterion === id ? 'border-primary/50 bg-primary/15 text-primary' : 'border-white/[0.08] bg-white/[0.03] text-slate-400'}`}><Icon size={13} />{label}</button>)}</div>}
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      {loading ? <div className="grid min-h-40 place-items-center"><LoaderCircle className="animate-spin text-slate-300" /></div> : <>
        {featured && <button onClick={() => onSelectPlayer?.(featured.id)} className="glass-card w-full rounded-2xl p-4 text-left sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 rounded-full bg-amber-400/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-200"><Trophy size={13} />Global apex spotlight</span><span className="rounded-full bg-primary/20 px-2.5 py-1 text-[10px] font-semibold text-primary">Rank #1</span></div>
          <div className="flex items-center gap-3">
            <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-primary/30 bg-surface-container-high text-base font-bold text-white">{featured.avatar_url ? <img src={featured.avatar_url} alt={`${featured.name}`} className="h-full w-full object-cover" /> : featured.name.slice(0, 2).toUpperCase()}</span>
            <span className="min-w-0 flex-1"><span className="block truncate font-display text-lg font-semibold text-white">{featured.name}</span><span className="mt-1 block truncate text-xs text-slate-400">{featured.club || 'SquadBuilder FC'} · {featured.position}</span><span className="mt-2 inline-flex rounded-full bg-primary-container px-2.5 py-1 text-[10px] font-semibold text-white">{featured.overall_rating} OVR</span></span>
            <span className="text-right"><span className="block text-lg font-semibold text-primary">{featuredMetric}</span><span className="text-[10px] text-slate-400">Current leader</span></span>
          </div>
          <div className="mt-4 grid grid-cols-3 rounded-xl bg-[#080a10]/55 px-2 py-3 text-center">{(view === 'players' ? [{ label: 'Goals', value: featured.goals }, { label: 'Assists', value: featured.assists }, { label: 'MOTM', value: featured.motm_count }] : [{ label: 'Wins', value: featured.matches_won }, { label: 'Managed', value: featured.matches_managed }, { label: 'Trophies', value: featured.trophies }]).map((item) => <div key={item.label}><p className="font-display text-lg font-semibold text-white">{item.value}</p><p className="text-[9px] uppercase tracking-wide text-slate-400">{item.label}</p></div>)}</div>
        </button>}

        {featured && view === 'players' && <section className="glass-card rounded-2xl p-4"><div className="flex items-center justify-between"><div><h2 className="flex items-center gap-2 text-xs font-semibold text-white"><TrendingUp size={14} className="text-sky-200" />Attribute profile</h2><p className="mt-1 text-[10px] text-slate-400">{featured.name} · 0–100 ratings</p></div><span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] text-primary">OVR {featured.overall_rating}</span></div><div className="mt-2 grid items-center gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">{featured.attributes ? <RadarChart attributes={featured.attributes} size={220} color="#10b981" className="mx-auto max-w-full" /> : <p className="py-5 text-center text-xs text-slate-400">Attribute ratings have not been entered for this player.</p>}<div className="space-y-3">{playerAttributeFields.map(({ key, label }) => { const value = featured.attributes?.[key]; return <div key={key}><div className="mb-1 flex justify-between text-[10px]"><span className="text-slate-300">{label}</span><span className="tabular-nums text-sky-200">{value ?? '—'}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-gradient-to-r from-primary-container to-sky-200" style={{ width: `${value ?? 0}%` }} /></div></div>; })}</div></div></section>}

        <section>
          <div className="mb-2 flex items-center justify-between px-1"><h2 className="text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-300">Ranked {view}</h2><span className="text-[10px] text-sky-200">Sort: {view === 'managers' ? 'Wins' : criteria.find((item) => item.id === criterion)?.label}</span></div>
          <div className="space-y-2">
            {ranked.slice(1).map((profile, index) => {
              const rank = index + 2;
              const metric = view === 'managers'
                ? `${profile.matches_won} wins · ${profile.matches_managed} managed`
                : criterion === 'overall' ? `${profile.overall_rating} OVR`
                  : ['impact', 'shooting', 'passing', 'defense', 'physical'].includes(criterion)
                    ? `${profile.attributes?.[criterion as 'impact' | 'shooting' | 'passing' | 'defense' | 'physical'] ?? '—'} / 100`
                  : criterion === 'goals' ? `${profile.goals} goals`
                  : criterion === 'assists' ? `${profile.assists} assists`
                    : criterion === 'winrate' ? `${profile.win_percentage}%`
                      : `${profile.motm_count} MOTM`;
              return <button key={profile.id} onClick={() => onSelectPlayer?.(profile.id)} className="grid w-full grid-cols-[2rem_2.5rem_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-white/[0.07] bg-surface-container-low/80 p-3 text-left hover:bg-white/[0.06]">
                <span className={`grid h-7 w-7 place-items-center rounded-full text-[10px] font-semibold ${rank < 4 ? 'bg-sky-200/10 text-sky-100' : 'bg-white/[0.06] text-slate-400'}`}>{rank}</span>
                <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-white/10 bg-slate-800 text-xs font-semibold text-white">{profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : profile.name.slice(0, 2).toUpperCase()}</span>
                <span className="min-w-0"><span className="block truncate text-xs font-semibold text-white">{profile.name}</span><span className="block truncate text-[10px] text-slate-400">{profile.club || profile.position}</span></span>
                <span className="text-right"><span className="block text-xs font-semibold text-sky-200">{metric}</span><span className="text-[9px] text-slate-500">{profile.overall_rating} OVR</span></span>
              </button>;
            })}
            {ranked.length === 0 && <p className="rounded-xl border border-white/10 p-5 text-sm text-slate-400">Match statistics will appear after results are recorded.</p>}
            {ranked.length === 1 && <p className="rounded-xl border border-dashed border-white/10 p-4 text-xs text-slate-500">More players will appear as match records are added.</p>}
          </div>
        </section>
      </>}
    </div>
  );
};
