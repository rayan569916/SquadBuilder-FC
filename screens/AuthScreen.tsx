import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound, LoaderCircle, LockKeyhole, LogIn, ShieldCheck } from 'lucide-react';
import { isSupabaseConfigured, useAuth } from '../context/AuthContext';

interface AuthScreenProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  const { login, requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);
    try {
      await login(email.trim(), password);
      onSuccess?.();
    } catch (error) {
      setFeedback({ type: 'error', text: error instanceof Error ? error.message : 'Unable to sign in.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async () => {
    if (!email.trim()) {
      setFeedback({ type: 'error', text: 'Enter your account email first.' });
      return;
    }
    setIsSubmitting(true);
    setFeedback(null);
    try {
      await requestPasswordReset(email.trim());
      setFeedback({ type: 'success', text: 'Password reset instructions have been sent if the account exists.' });
    } catch (error) {
      setFeedback({ type: 'error', text: error instanceof Error ? error.message : 'Unable to request a reset.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#10121b]/95 p-6 shadow-2xl sm:p-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
            <ShieldCheck size={22} aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">SquadBuilder FC</p>
            <h1 className="mt-1 text-xl font-bold text-white">Sign in to your squad</h1>
          </div>
        </div>

        {!isSupabaseConfigured ? (
          <div role="alert" className="rounded-lg border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100">
            Supabase is not configured. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your local environment, then restart the app.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-sm text-slate-300">
              Email
              <input
                autoComplete="username"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#080a10] px-3 py-3 text-white outline-none focus:border-emerald-300/70"
                placeholder="you@example.com"
              />
            </label>

            <label className="block text-sm text-slate-300">
              Password
              <span className="relative mt-1.5 block">
                <LockKeyhole size={16} className="absolute left-3 top-3.5 text-slate-500" aria-hidden="true" />
                <input
                  autoComplete="current-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#080a10] py-3 pl-10 pr-11 text-white outline-none focus:border-emerald-300/70"
                  placeholder="Your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>

            {feedback && (
              <p role="status" className={`text-sm ${feedback.type === 'error' ? 'text-rose-300' : 'text-emerald-300'}`}>
                {feedback.text}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 py-3 font-semibold text-[#07110f] transition hover:bg-emerald-300 disabled:opacity-60"
            >
              {isSubmitting ? <LoaderCircle size={17} className="animate-spin" /> : <LogIn size={17} />}
              Sign in
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleReset}
              className="mx-auto flex items-center gap-1.5 py-2 text-sm text-slate-400 hover:text-white disabled:opacity-50"
            >
              <KeyRound size={14} aria-hidden="true" /> Forgot password?
            </button>
          </form>
        )}
      </section>
    </main>
  );
};
