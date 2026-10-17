import React, { useEffect, useRef, useState } from 'react';
import { Activity, ArrowRight, Award, Camera, LoaderCircle, Medal, Shield, Target, Trophy } from 'lucide-react';
import { GoalkeeperRadarChart, RadarChart } from '../components/RadarChart';
import { getProfileOverallRating, goalkeeperAttributeFields, playerAttributeFields } from '../lib/playerRatings';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Profile } from '../types/database';

interface PlayerProfileScreenProps {
  playerId?: string;
  onNavigateToTactics?: () => void;
}

export const PlayerProfileScreen: React.FC<PlayerProfileScreenProps> = ({ playerId, onNavigateToTactics }) => {
  const { currentUser, refreshProfile } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const targetId = playerId || currentUser?.id;
  const isOwnProfile = Boolean(targetId && targetId === currentUser?.id);

  useEffect(() => {
    let active = true;
    setLoading(true);
    if (!targetId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    api.getProfileById(targetId).then((result) => { if (active) setProfile(result); })
      .catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load this profile.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [targetId]);

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile || !isOwnProfile) return;
    setUploading(true);
    setError(null);
    try {
      const updated = await api.uploadAvatar(profile.id, file);
      setProfile(updated);
      await refreshProfile();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Unable to upload photo.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  if (loading) return <div className="grid min-h-64 place-items-center text-slate-300"><LoaderCircle className="animate-spin" /></div>;
  if (!profile) return <section className="p-6 text-sm text-slate-400">Profile unavailable.</section>;

  const statItems = [
    { label: 'Matches', value: profile.matches_played, Icon: Shield },
    { label: 'Goals', value: profile.goals, Icon: Target },
    { label: 'Assists', value: profile.assists, Icon: Award },
    { label: 'MOTM', value: profile.motm_count, Icon: Trophy },
    { label: 'Votes received', value: profile.total_motm_votes, Icon: Trophy },
    { label: 'Saves', value: profile.saves, Icon: Shield },
    { label: 'Tackles', value: profile.tackles, Icon: Medal },
  ];

  const formValues = (profile.recent_form || []).slice(-6).map((result) => result === 'W' ? 3 : result === 'D' ? 1 : 0);
  const formPoints = formValues.map((value, index) => `${formValues.length === 1 ? 50 : 8 + (index / (formValues.length - 1)) * 84},${62 - value * 14}`).join(' ');
  const motmRate = profile.matches_played ? Math.round((profile.motm_count / profile.matches_played) * 100) : 0;
  const managerWinRate = profile.matches_managed ? Math.round((profile.matches_won / profile.matches_managed) * 100) : 0;

  return (
    <div className="mx-auto max-w-md space-y-5 px-4 py-5 sm:px-6 sm:py-7">
      <section className="glass-card relative overflow-hidden rounded-2xl p-4 text-center sm:p-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-linear-to-b from-primary/10 to-transparent" />
        <div className="relative mx-auto grid h-20 w-20 place-items-center overflow-hidden rounded-full border border-primary/40 bg-surface-container-high text-xl font-bold text-white shadow-[0_0_26px_rgba(112,66,248,0.3)]">
          {profile.avatar_url ? <img src={profile.avatar_url} alt={`${profile.name} profile`} className="h-full w-full object-cover" /> : profile.name.slice(0, 2).toUpperCase()}
          {isOwnProfile && <><button type="button" disabled={uploading} title="Upload profile photo" onClick={() => inputRef.current?.click()} className="absolute inset-x-0 bottom-0 flex h-7 items-center justify-center bg-black/70 text-white disabled:opacity-50">{uploading ? <LoaderCircle size={14} className="animate-spin" /> : <Camera size={14} />}</button><input ref={inputRef} type="file" accept="image/*" onChange={(event) => void uploadAvatar(event)} className="hidden" /></>}
        </div>
        <p className="mt-3 text-[9px] font-semibold uppercase tracking-[0.15em] text-sky-200">{profile.jersey_number ? `#${profile.jersey_number} · ` : ''}{profile.club || 'SquadBuilder FC'}</p>
        <h1 className="mt-1 font-display text-xl font-semibold uppercase text-white">{profile.name}</h1>
        <p className="mt-1 text-[10px] uppercase text-slate-400">{profile.position} · {profile.role}{profile.age ? ` · Age ${profile.age}` : ''}</p>
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-sky-200/20 bg-sky-200/[0.07] px-3 py-1 text-[9px] font-medium uppercase tracking-wide text-sky-200"><Shield size={12} />Player / {profile.role}</span>
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="rounded-full bg-primary-container/20 px-3 py-1.5 text-[10px] font-semibold text-primary">{getProfileOverallRating(profile) ?? '—'} OVR</span>
          {onNavigateToTactics && <button onClick={onNavigateToTactics} className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] text-slate-200">View tactics</button>}
        </div>
      </section>

      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}

      <div className="flex items-center justify-between px-1"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300">Tactical radar &amp; mastery</p><span className="rounded-full bg-primary/10 px-2 py-1 text-[9px] text-primary">Player analytics</span></div>
      <section className="glass-card rounded-2xl p-3 sm:p-5">
        {profile.position === 'GK'
          ? profile.attributes?.goalkeeping
            ? <GoalkeeperRadarChart attributes={profile.attributes.goalkeeping} size={280} color="#10b981" className="mx-auto max-w-full" />
            : <div className="grid min-h-44 place-items-center text-center"><div><Target size={22} className="mx-auto text-sky-200" /><p className="mt-2 text-sm text-white">Goalkeeper ratings not recorded</p><p className="mt-1 text-xs text-slate-400">An admin can add keeper attributes from Account Management.</p></div></div>
          : profile.attributes
            ? <RadarChart attributes={profile.attributes} size={280} color="#10b981" className="mx-auto max-w-full" />
            : <div className="grid min-h-44 place-items-center text-center"><div><Target size={22} className="mx-auto text-sky-200" /><p className="mt-2 text-sm text-white">Attributes not recorded</p><p className="mt-1 text-xs text-slate-400">Player attribute data has not been added yet.</p></div></div>}
        {profile.attributes && <div className="mt-1 grid grid-cols-2 gap-2 text-center text-[10px]">{playerAttributeFields.map(({ key, label }) => <span key={key} className="rounded-lg bg-white/4 p-2 text-slate-300">{label}<b className="ml-1 text-sky-200">{profile.attributes?.[key]}</b></span>)}</div>}
        {profile.position === 'GK' && profile.attributes?.goalkeeping && <div className="mt-2 grid grid-cols-2 gap-2 text-center text-[10px]">{goalkeeperAttributeFields.map(({ key, label }) => <span key={key} className="rounded-lg bg-emerald-400/[0.07] p-2 text-slate-300">{label}<b className="ml-1 text-emerald-200">{profile.attributes?.goalkeeping?.[key]}</b></span>)}</div>}
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/[0.07] pt-3 text-[10px]"><div className="flex items-center justify-between rounded-lg bg-white/4 p-2 text-slate-300"><span>Pass rating</span><b className="text-sky-200">{profile.attributes?.passing ?? '—'}{profile.attributes ? '/100' : ''}</b></div><div className="flex items-center justify-between rounded-lg bg-white/4 p-2 text-slate-300"><span>Tackles won</span><b className="text-emerald-200">{profile.tackles}</b></div></div>
      </section>

      <section className="glass-card rounded-2xl p-4">
        <div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold text-white">Recent form &amp; momentum</h2><p className="mt-1 text-[10px] text-slate-400">Last {formValues.length} recorded results</p></div><span className="text-[10px] text-emerald-200">{profile.goals} career goals</span></div>
        <div className="mt-3 h-16 rounded-lg bg-[#080a10]/40 p-2"><svg viewBox="0 0 100 70" preserveAspectRatio="none" className="h-full w-full" role="img" aria-label="Recent results form"><polyline points={formPoints} fill="none" stroke="#10b981" strokeWidth="2" vectorEffect="non-scaling-stroke" />{formValues.map((value, index) => <circle key={`${value}-${index}`} cx={formValues.length === 1 ? 50 : 8 + (index / (formValues.length - 1)) * 84} cy={62 - value * 14} r="2" fill="#a2caf9" />)}</svg></div>
        <div className="mt-3 flex items-center justify-between gap-2"><div className="flex gap-1">{profile.recent_form?.length ? profile.recent_form.slice(-6).map((result, index) => <span key={`${result}-${index}`} className={`grid h-5 w-5 place-items-center rounded text-[8px] font-semibold ${result === 'W' ? 'bg-emerald-400/15 text-emerald-200' : result === 'D' ? 'bg-amber-300/15 text-amber-200' : 'bg-rose-400/15 text-rose-200'}`}>{result}</span>) : <span className="text-[10px] text-slate-500">No form recorded</span>}</div><span className="text-[9px] text-slate-400">Career · {profile.total_wins} wins / {profile.matches_played} matches</span></div>
        <div className="mt-3 grid grid-cols-3 border-t border-white/[0.07] pt-3 text-center"><div><p className="font-display text-base font-semibold text-white">{profile.goals}</p><p className="text-[8px] uppercase tracking-wide text-slate-400">Goals</p></div><div><p className="font-display text-base font-semibold text-white">{profile.assists}</p><p className="text-[8px] uppercase tracking-wide text-slate-400">Assists</p></div><div><p className="font-display text-base font-semibold text-white">{profile.motm_count}</p><p className="text-[8px] uppercase tracking-wide text-slate-400">MOTM</p></div></div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="glass-card rounded-2xl p-4 text-center"><p className="text-[9px] uppercase tracking-wide text-slate-400">Win ratio</p><div className="mx-auto mt-3 grid h-20 w-20 place-items-center rounded-full p-1.25" style={{ background: `conic-gradient(#10b981 ${profile.win_percentage}%, rgba(148,163,184,0.18) 0)` }}><div className="grid h-full w-full place-items-center rounded-full bg-[#11131d]"><span><b className="block font-display text-lg text-white">{profile.win_percentage}%</b><small className="text-[8px] text-slate-400">WIN</small></span></div></div><p className="mt-2 text-[9px] text-slate-400">{profile.total_wins} / {profile.matches_played} matches</p></div>
        <div className="glass-card rounded-2xl p-4 text-center"><p className="text-[9px] uppercase tracking-wide text-slate-400">MOTM frequency</p><div className="mx-auto mt-3 grid h-20 w-20 place-items-center rounded-full p-1.25" style={{ background: `conic-gradient(#7042f8 ${motmRate}%, rgba(148,163,184,0.18) 0)` }}><div className="grid h-full w-full place-items-center rounded-full bg-[#11131d]"><span><b className="block font-display text-lg text-white">{motmRate}%</b><small className="text-[8px] text-slate-400">RATE</small></span></div></div><p className="mt-2 text-[9px] text-slate-400">{profile.motm_count} awards · {profile.matches_played} matches</p></div>
      </section>

      <section className="glass-card rounded-2xl p-4">
        <div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-primary"><Trophy size={15} /></span><div><h2 className="text-sm font-semibold text-white">Tactical leadership</h2><p className="text-[9px] text-slate-400">Club manager record</p></div></div><span className="rounded-full border border-emerald-300/20 bg-emerald-300/8 px-2 py-1 text-[9px] text-emerald-200">{profile.role}</span></div>
        <div className="grid grid-cols-3 divide-x divide-white/[0.07] text-center"><div><p className="font-display text-base font-semibold text-white">{profile.matches_managed}</p><p className="text-[8px] text-slate-400">Managed</p></div><div><p className="font-display text-base font-semibold text-white">{profile.matches_won}</p><p className="text-[8px] text-slate-400">Won</p></div><div><p className="font-display text-base font-semibold text-emerald-200">{managerWinRate}%</p><p className="text-[8px] text-slate-400">Win rate</p></div></div>
        <div className="mt-3 flex items-center justify-between border-t border-white/[0.07] pt-3"><span className="text-[9px] uppercase tracking-wide text-slate-400">Trophies earned</span><span className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1 text-[10px] text-slate-200"><Trophy size={11} className="text-amber-200" />{profile.trophies}</span></div>
      </section>

      <section className="glass-card rounded-2xl p-4">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-white">Match statistics</h2><span className="text-[9px] text-slate-400">Career totals</span></div>
        <div className="grid grid-cols-3 gap-2">{statItems.map(({ label, value, Icon }) => <div key={label} className="rounded-xl bg-white/[0.035] p-3"><Icon size={14} className="text-sky-200" /><p className="mt-2 font-display text-lg font-semibold tabular-nums text-white">{value}</p><p className="text-[9px] text-slate-400">{label}</p></div>)}</div>
      </section>

      <section className="glass-card rounded-2xl p-4">
        <div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Activity size={14} className="text-emerald-300" /> Fitness &amp; medical log</h2><span className="text-[10px] text-sky-200">{profile.injuries_count} recorded</span></div>
        {profile.injuries?.length ? <div className="space-y-2">{profile.injuries.map((injury) => <div key={injury.id} className="flex items-start justify-between gap-3 rounded-xl border border-white/[0.07] bg-[#080a10]/40 p-3"><div><p className="text-xs font-medium text-white">{injury.matchday} · {injury.description}</p><p className="mt-1 text-[10px] text-slate-400">Return date: {injury.returnDate}</p></div><span className={`rounded-full px-2 py-1 text-[9px] capitalize ${injury.status === 'cleared' ? 'bg-emerald-400/10 text-emerald-200' : 'bg-amber-300/10 text-amber-200'}`}>{injury.status}</span></div>)}</div> : <p className="rounded-xl bg-[#080a10]/35 p-3 text-xs text-slate-400">No injury history recorded.</p>}
      </section>

      {onNavigateToTactics && <button onClick={onNavigateToTactics} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-primary-container px-4 text-sm font-semibold text-white shadow-[0_0_22px_rgba(112,66,248,0.34)]"><Shield size={15} />View Tactical Lineups <ArrowRight size={15} /></button>}
    </div>
  );
};
