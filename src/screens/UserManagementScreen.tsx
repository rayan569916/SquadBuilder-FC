import React, { useEffect, useState } from 'react';
import { LoaderCircle, UserPlus, Users } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { PlayerPosition, Profile, UserRole } from '../types/database';

export const UserManagementScreen: React.FC = () => {
  const { canManageUsers, currentUser } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('player');
  const [position, setPosition] = useState<PlayerPosition>('MF');

  const loadProfiles = async () => {
    setLoading(true);
    try {
      setProfiles(await api.getProfiles());
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadProfiles(); }, []);

  const updateRole = async (profile: Profile, nextRole: UserRole) => {
    if (profile.id === currentUser?.id) return;
    try {
      await api.updateProfileRole(profile.id, nextRole);
      await loadProfiles();
      setSuccess(`Role updated for ${profile.name}.`);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update role.');
    }
  };

  const createAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await api.createProfile({ name: name.trim(), email: email.trim(), password, role, position, age: 24 });
      setName('');
      setEmail('');
      setPassword('');
      await loadProfiles();
      setSuccess('Account created. Share the initial password securely and ask the player to change it.');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create account.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!canManageUsers) return <section className="p-6 text-sm text-rose-300">Admin access is required to manage accounts.</section>;

  return (
    <div className="space-y-8 px-4 py-6 sm:px-6">
      <header>
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-300"><Users size={14} /> Admin</p>
        <h1 className="mt-2 text-2xl font-bold text-white">Account management</h1>
        <p className="mt-1 text-sm text-slate-400">Create sign-in accounts and assign access levels.</p>
      </header>

      <form onSubmit={createAccount} className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-2">
        <label className="text-sm text-slate-300">Name<input required value={name} onChange={(event) => setName(event.target.value)} className="mt-1 block w-full rounded-lg border border-white/10 bg-[#080a10] px-3 py-2.5 text-white" /></label>
        <label className="text-sm text-slate-300">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 block w-full rounded-lg border border-white/10 bg-[#080a10] px-3 py-2.5 text-white" /></label>
        <label className="text-sm text-slate-300">Initial password<input required minLength={10} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 block w-full rounded-lg border border-white/10 bg-[#080a10] px-3 py-2.5 text-white" /></label>
        <label className="text-sm text-slate-300">Position<select value={position} onChange={(event) => setPosition(event.target.value as PlayerPosition)} className="mt-1 block w-full rounded-lg border border-white/10 bg-[#080a10] px-3 py-2.5 text-white"><option value="GK">Goalkeeper</option><option value="DF">Defender</option><option value="MF">Midfielder</option><option value="FW">Forward</option></select></label>
        <label className="text-sm text-slate-300">Role<select value={role} onChange={(event) => setRole(event.target.value as UserRole)} className="mt-1 block w-full rounded-lg border border-white/10 bg-[#080a10] px-3 py-2.5 text-white"><option value="player">Player</option><option value="manager">Manager</option><option value="admin">Admin</option></select></label>
        <button disabled={submitting} className="mt-auto flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 font-semibold text-[#07110f] disabled:opacity-60"><UserPlus size={17} />{submitting ? 'Creating…' : 'Create account'}</button>
      </form>

      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      {success && <p role="status" className="text-sm text-emerald-300">{success}</p>}

      <section>
        <h2 className="mb-3 text-lg font-semibold text-white">Registered players</h2>
        {loading ? <LoaderCircle className="animate-spin text-slate-400" /> : (
          <div className="divide-y divide-white/10 rounded-xl border border-white/10">
            {profiles.map((profile) => (
              <div key={profile.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-800 text-sm font-semibold text-white">
                    {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : profile.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0"><p className="truncate text-sm font-medium text-white">{profile.name}</p><p className="truncate text-xs text-slate-400">{profile.email}</p></div>
                </div>
                <select aria-label={`Role for ${profile.name}`} disabled={profile.id === currentUser?.id} value={profile.role} onChange={(event) => void updateRole(profile, event.target.value as UserRole)} className="rounded-lg border border-white/10 bg-[#080a10] px-3 py-2 text-sm capitalize text-slate-200 disabled:opacity-50">
                  <option value="player">Player</option><option value="manager">Manager</option><option value="admin">Admin</option>
                </select>
              </div>
            ))}
            {profiles.length === 0 && <p className="p-4 text-sm text-slate-400">No accounts yet.</p>}
          </div>
        )}
      </section>
    </div>
  );
};
