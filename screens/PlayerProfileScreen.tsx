import React, { useEffect, useRef, useState } from 'react';
import { Award, Camera, LoaderCircle, Medal, Shield, Target, Trophy } from 'lucide-react';
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
    { label: 'Saves', value: profile.saves, Icon: Shield },
    { label: 'Tackles', value: profile.tackles, Icon: Medal },
  ];

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <div className="relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-slate-800 text-2xl font-bold text-white">
          {profile.avatar_url ? <img src={profile.avatar_url} alt={`${profile.name} profile`} className="h-full w-full object-cover" /> : profile.name.slice(0, 2).toUpperCase()}
          {isOwnProfile && <><button type="button" disabled={uploading} title="Upload profile photo" onClick={() => inputRef.current?.click()} className="absolute inset-x-0 bottom-0 flex h-8 items-center justify-center bg-black/70 text-white disabled:opacity-50">{uploading ? <LoaderCircle size={16} className="animate-spin" /> : <Camera size={16} />}</button><input ref={inputRef} type="file" accept="image/*" onChange={(event) => void uploadAvatar(event)} className="hidden" /></>}
        </div>
        <div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">Player profile</p><h1 className="mt-1 truncate text-2xl font-bold text-white">{profile.name}</h1><p className="mt-1 text-sm text-slate-400">{profile.position} · {profile.role}{profile.club ? ` · ${profile.club}` : ''}</p><p className="mt-1 text-xs text-slate-500">{profile.email}</p></div>
        {onNavigateToTactics && <button onClick={onNavigateToTactics} className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200">View tactics</button>}
      </header>

      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      <section><h2 className="mb-3 text-lg font-semibold text-white">Match statistics</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{statItems.map(({ label, value, Icon }) => <div key={label} className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><Icon size={17} className="text-emerald-300" /><p className="mt-3 text-2xl font-bold tabular-nums text-white">{value}</p><p className="mt-1 text-xs text-slate-400">{label}</p></div>)}</div></section>
      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><h2 className="text-sm font-semibold text-white">Player details</h2><dl className="mt-3 grid grid-cols-2 gap-y-3 text-sm"><dt className="text-slate-400">Age</dt><dd className="text-right text-slate-200">{profile.age}</dd><dt className="text-slate-400">Overall rating</dt><dd className="text-right text-slate-200">{profile.overall_rating}</dd><dt className="text-slate-400">Win rate</dt><dd className="text-right text-slate-200">{profile.win_percentage}%</dd><dt className="text-slate-400">Matches managed</dt><dd className="text-right text-slate-200">{profile.matches_managed}</dd></dl></section>
    </div>
  );
};
