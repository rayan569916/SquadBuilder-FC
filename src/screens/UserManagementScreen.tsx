import React, { useEffect, useState } from 'react';
import { LoaderCircle, Pencil, Save, UserPlus, Users, X } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { calculateOverallRating, getProfileOverallRating, goalkeeperAttributeFields, playerAttributeFields, GoalkeeperAttributeKey, PlayerAttributeKey } from '../lib/playerRatings';
import { GoalkeeperAttributes, PlayerAttributes, PlayerPosition, Profile, UserRole } from '../types/database';

type AttributeDraft = Record<PlayerAttributeKey, string> & Record<GoalkeeperAttributeKey, string>;
type AccountDraft = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  position: PlayerPosition;
  attributes: AttributeDraft;
};

const emptyAttributeDraft = (): AttributeDraft => ({ impact: '', shooting: '', passing: '', defense: '', physical: '', diving: '', handling: '', kicking: '', reflexes: '', speed: '', positioning: '' });

const isValidRating = (value: string) => {
  const rating = Number(value);
  return value.trim() !== '' && Number.isInteger(rating) && rating >= 0 && rating <= 100;
};

const isValidAttributeDraft = (draft: AttributeDraft, position: PlayerPosition) => playerAttributeFields.every(({ key }) => {
  const value = draft[key].trim();
  return isValidRating(value);
}) && (position !== 'GK' || goalkeeperAttributeFields.every(({ key }) => isValidRating(draft[key])));

const parseAttributes = (draft: AttributeDraft): PlayerAttributes => {
  const goalkeeperValues = Object.fromEntries(goalkeeperAttributeFields.map(({ key }) => [key, Number(draft[key])])) as unknown as GoalkeeperAttributes;
  return {
    impact: Number(draft.impact),
    shooting: Number(draft.shooting),
    passing: Number(draft.passing),
    defense: Number(draft.defense),
    physical: Number(draft.physical),
    ...(goalkeeperAttributeFields.every(({ key }) => isValidRating(draft[key])) ? { goalkeeping: goalkeeperValues } : {}),
  };
};

export const UserManagementScreen: React.FC = () => {
  const { canManageUsers, currentUser, refreshProfile } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<AccountDraft | null>(null);
  const [savingAccountId, setSavingAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('player');
  const [position, setPosition] = useState<PlayerPosition>('MF');
  const [newAttributes, setNewAttributes] = useState<AttributeDraft>(emptyAttributeDraft);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const rows = await api.getProfiles();
      setProfiles(rows);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadProfiles(); }, []);

  const beginEdit = (profile: Profile) => {
    setEditingProfileId(profile.id);
    setEditDraft({
      name: profile.name,
      email: profile.email,
      password: '',
      role: profile.role,
      position: profile.position,
      attributes: Object.fromEntries([
        ...playerAttributeFields.map(({ key }) => [key, profile.attributes?.[key] === undefined ? '' : String(profile.attributes[key])]),
        ...goalkeeperAttributeFields.map(({ key }) => [key, profile.attributes?.goalkeeping?.[key] === undefined ? '' : String(profile.attributes.goalkeeping[key])]),
      ]) as AttributeDraft,
    });
    setError(null);
    setSuccess(null);
  };

  const saveAccount = async (event: React.FormEvent, profile: Profile) => {
    event.preventDefault();
    if (!editDraft || !isValidAttributeDraft(editDraft.attributes, editDraft.position)) {
      setError(editDraft?.position === 'GK' ? 'Enter whole-number ratings from 0 to 100 for every player and goalkeeper attribute.' : 'Enter a whole-number rating from 0 to 100 for every player attribute.');
      return;
    }
    if (editDraft.password && editDraft.password.length < 10) {
      setError('A new password must be at least 10 characters.');
      return;
    }

    setSavingAccountId(profile.id);
    setError(null);
    setSuccess(null);
    try {
      const updated = await api.updateManagedProfile({
        profile_id: profile.id,
        name: editDraft.name.trim(),
        email: editDraft.email.trim(),
        password: editDraft.password || undefined,
        role: editDraft.role,
        position: editDraft.position,
        attributes: parseAttributes(editDraft.attributes),
      });
      setProfiles((current) => current.map((item) => item.id === updated.id ? updated : item));
      if (updated.id === currentUser?.id) await refreshProfile();
      setEditingProfileId(null);
      setEditDraft(null);
      setSuccess(`Account updated for ${updated.name}.`);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update account.');
    } finally {
      setSavingAccountId(null);
    }
  };

  const createAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    if (!isValidAttributeDraft(newAttributes, position)) {
      setError(position === 'GK' ? 'Enter whole-number ratings from 0 to 100 for every player and goalkeeper attribute.' : 'Enter a whole-number rating from 0 to 100 for every player attribute.');
      setSubmitting(false);
      return;
    }
    try {
      const attributes = parseAttributes(newAttributes);
      await api.createProfile({ name: name.trim(), email: email.trim(), password, role, position, age: 24, attributes });
      setName('');
      setEmail('');
      setPassword('');
      setNewAttributes(emptyAttributeDraft());
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
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-6 sm:px-6">
      <header>
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-sky-200"><Users size={14} /> Admin</p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-white">Account management</h1>
        <p className="mt-1 text-sm text-slate-400">Create sign-in accounts and assign access levels.</p>
      </header>

      <form onSubmit={createAccount} className="glass-card grid gap-3 rounded-2xl p-4 sm:grid-cols-2">
        <label className="text-sm text-slate-300">Name<input required value={name} onChange={(event) => setName(event.target.value)} className="mt-1 block w-full rounded-lg border border-white/10 bg-[#080a10] px-3 py-2.5 text-white" /></label>
        <label className="text-sm text-slate-300">Username / sign-in email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 block w-full rounded-lg border border-white/10 bg-[#080a10] px-3 py-2.5 text-white" /></label>
        <label className="text-sm text-slate-300">Initial password<input required minLength={10} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 block w-full rounded-lg border border-white/10 bg-[#080a10] px-3 py-2.5 text-white" /></label>
        <label className="text-sm text-slate-300">Position<select value={position} onChange={(event) => setPosition(event.target.value as PlayerPosition)} className="mt-1 block w-full rounded-lg border border-white/10 bg-[#080a10] px-3 py-2.5 text-white"><option value="GK">Goalkeeper</option><option value="DF">Defender</option><option value="MF">Midfielder</option><option value="FW">Forward</option></select></label>
        <label className="text-sm text-slate-300">Role<select value={role} onChange={(event) => setRole(event.target.value as UserRole)} className="mt-1 block w-full rounded-lg border border-white/10 bg-[#080a10] px-3 py-2.5 text-white"><option value="player">Player</option><option value="manager">Manager</option><option value="admin">Admin</option></select></label>
        <fieldset className="sm:col-span-2"><legend className="mb-2 text-sm text-slate-300">Player attributes · Overall rating is their average</legend><div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{playerAttributeFields.map(({ key, label }) => <label key={key} className="text-xs text-slate-400">{label}<input required type="number" min={0} max={100} step={1} value={newAttributes[key]} onChange={(event) => setNewAttributes((current) => ({ ...current, [key]: event.target.value }))} className="mt-1 block w-full rounded-lg border border-white/10 bg-[#080a10] px-3 py-2.5 text-white" /></label>)}</div>{position === 'GK' && <div className="mt-3 border-t border-white/8 pt-3"><p className="mb-2 text-xs text-slate-300">Goalkeeper attributes · Used for keeper OVR</p><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{goalkeeperAttributeFields.map(({ key, label }) => <label key={key} className="text-xs text-slate-400">{label}<input required type="number" min={0} max={100} step={1} value={newAttributes[key]} onChange={(event) => setNewAttributes((current) => ({ ...current, [key]: event.target.value }))} className="mt-1 block w-full rounded-lg border border-white/10 bg-[#080a10] px-3 py-2.5 text-white" /></label>)}</div></div>}<p className="mt-2 text-xs text-primary">Calculated OVR: {isValidAttributeDraft(newAttributes, position) ? calculateOverallRating(parseAttributes(newAttributes), position) : '—'}</p></fieldset>
        <button disabled={submitting} className="mt-auto flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary-container px-4 font-semibold text-white disabled:opacity-60"><UserPlus size={17} />{submitting ? 'Creating…' : 'Create account'}</button>
      </form>

      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      {success && <p role="status" className="text-sm text-sky-200">{success}</p>}

      <section>
        <h2 className="mb-3 text-lg font-semibold text-white">Registered players</h2>
        {loading ? <LoaderCircle className="animate-spin text-slate-400" /> : (
          <div className="glass-card divide-y divide-white/10 overflow-hidden rounded-2xl">
            {profiles.map((profile) => (
              <div key={profile.id} className="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-slate-800 text-sm font-semibold text-white">
                    {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : profile.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0"><p className="truncate text-sm font-medium text-white">{profile.name}</p><p className="truncate text-xs text-slate-400">{profile.email}</p><p className="mt-1 text-[10px] text-sky-200">{profile.position} · {profile.role} · OVR {getProfileOverallRating(profile) ?? '—'}</p></div>
                </div>
                <button type="button" onClick={() => editingProfileId === profile.id ? (setEditingProfileId(null), setEditDraft(null)) : beginEdit(profile)} className="flex min-h-9 items-center justify-center gap-2 rounded-full border border-white/10 px-3 text-xs text-slate-200">{editingProfileId === profile.id ? <><X size={14} />Cancel</> : <><Pencil size={14} />Edit account</>}</button>
                {editingProfileId === profile.id && editDraft && <form onSubmit={(event) => void saveAccount(event, profile)} className="col-span-full grid gap-3 rounded-xl border border-white/8 bg-[#080a10]/50 p-3 sm:grid-cols-2">
                  <label className="text-xs text-slate-400">Name<input required value={editDraft.name} onChange={(event) => setEditDraft((draft) => draft && ({ ...draft, name: event.target.value }))} className="mt-1 block w-full rounded-lg border border-white/10 bg-[#080a10] px-3 py-2.5 text-sm text-white" /></label>
                  <label className="text-xs text-slate-400">Username / sign-in email<input required type="email" value={editDraft.email} onChange={(event) => setEditDraft((draft) => draft && ({ ...draft, email: event.target.value }))} className="mt-1 block w-full rounded-lg border border-white/10 bg-[#080a10] px-3 py-2.5 text-sm text-white" /></label>
                  <label className="text-xs text-slate-400">New password <span className="text-slate-500">(leave blank to keep current)</span><input type="password" minLength={10} autoComplete="new-password" value={editDraft.password} onChange={(event) => setEditDraft((draft) => draft && ({ ...draft, password: event.target.value }))} className="mt-1 block w-full rounded-lg border border-white/10 bg-[#080a10] px-3 py-2.5 text-sm text-white" /></label>
                  <label className="text-xs text-slate-400">Position<select value={editDraft.position} onChange={(event) => setEditDraft((draft) => draft && ({ ...draft, position: event.target.value as PlayerPosition }))} className="mt-1 block w-full rounded-lg border border-white/10 bg-[#080a10] px-3 py-2.5 text-sm text-white"><option value="GK">Goalkeeper</option><option value="DF">Defender</option><option value="MF">Midfielder</option><option value="FW">Forward</option></select></label>
                  <label className="text-xs text-slate-400">Role<select disabled={profile.id === currentUser?.id} value={editDraft.role} onChange={(event) => setEditDraft((draft) => draft && ({ ...draft, role: event.target.value as UserRole }))} className="mt-1 block w-full rounded-lg border border-white/10 bg-[#080a10] px-3 py-2.5 text-sm capitalize text-white disabled:opacity-50"><option value="player">Player</option><option value="manager">Manager</option><option value="admin">Admin</option></select></label>
                  <fieldset className="sm:col-span-2"><legend className="mb-2 text-xs text-slate-300">Player attributes · 0–100 each</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-5">{playerAttributeFields.map(({ key, label }) => <label key={key} className="text-[10px] text-slate-400">{label}<input required type="number" min={0} max={100} step={1} value={editDraft.attributes[key]} onChange={(event) => setEditDraft((draft) => draft && ({ ...draft, attributes: { ...draft.attributes, [key]: event.target.value } }))} className="mt-1 block w-full rounded-lg border border-white/10 bg-[#080a10] px-2 py-2 text-sm tabular-nums text-white" /></label>)}</div>{editDraft.position === 'GK' && <div className="mt-3 border-t border-white/8 pt-3"><p className="mb-2 text-xs text-slate-300">Goalkeeper attributes · Used for keeper OVR</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{goalkeeperAttributeFields.map(({ key, label }) => <label key={key} className="text-[10px] text-slate-400">{label}<input required type="number" min={0} max={100} step={1} value={editDraft.attributes[key]} onChange={(event) => setEditDraft((draft) => draft && ({ ...draft, attributes: { ...draft.attributes, [key]: event.target.value } }))} className="mt-1 block w-full rounded-lg border border-white/10 bg-[#080a10] px-2 py-2 text-sm tabular-nums text-white" /></label>)}</div></div>}<p className="mt-2 text-xs text-primary">Calculated OVR: {isValidAttributeDraft(editDraft.attributes, editDraft.position) ? calculateOverallRating(parseAttributes(editDraft.attributes), editDraft.position) : '—'}</p></fieldset>
                  <div className="flex items-center justify-end gap-2 sm:col-span-2"><button type="button" onClick={() => { setEditingProfileId(null); setEditDraft(null); }} className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-300">Cancel</button><button type="submit" disabled={savingAccountId === profile.id} className="flex items-center gap-2 rounded-full bg-primary-container px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{savingAccountId === profile.id ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}{savingAccountId === profile.id ? 'Saving…' : 'Save account'}</button></div>
                </form>}
              </div>
            ))}
            {profiles.length === 0 && <p className="p-4 text-sm text-slate-400">No accounts yet.</p>}
          </div>
        )}
      </section>
    </div>
  );
};
