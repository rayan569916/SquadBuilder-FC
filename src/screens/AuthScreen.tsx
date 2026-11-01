import React, { useState } from 'react';
import { AtSign, ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, LogIn, ShieldCheck } from 'lucide-react';
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
    <main className="ambient-blueprint ambient-halo flex min-h-screen w-full flex-col items-center justify-center px-4 py-8 sm:px-6">
      <div className="mb-7 w-full max-w-xl text-center">
        <div className="mb-3 flex items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          <span className="h-px w-12 bg-gradient-to-r from-transparent to-primary/50" />
          Authentication Gateway
          <span className="h-px w-12 bg-gradient-to-l from-transparent to-primary/50" />
        </div>
        <h1 className="skywash-text font-display text-3xl font-semibold sm:text-4xl">SQUADBUILDER FC</h1>
        {/* <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-sky-100/70 sm:text-sm">Tactics Lab &amp; Match Engine</p> */}
      </div>

      <section className="glass-card w-full max-w-xl rounded-2xl bg-[#0c0e17]/90 p-5 sm:p-8">
        <div className="mb-6 flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-container/20 text-primary"><ShieldCheck size={21} aria-hidden="true" /></span>
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">SquadBuilder FC</p><h2 className="text-lg font-semibold text-white">Sign in</h2></div>
          </div>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-on-primary"><ShieldCheck size={19} aria-hidden="true" /></span>
        </div>

        <div className="mb-5 grid grid-cols-2 rounded-xl bg-white/[0.05] p-1 text-center text-sm">
          <span className="rounded-lg bg-white/[0.10] px-3 py-2.5 font-semibold text-white shadow-inner">Sign In</span>
          <button type="button" disabled title="Account creation is not available" className="px-3 py-2.5 text-slate-500 disabled:cursor-not-allowed">Create Account</button>
        </div>

        {/* <div className="mb-5 flex items-center justify-between text-xs">
          <span className="text-slate-300">Access Persona</span>
          <span className="inline-flex items-center gap-2 text-sky-200"><i className="h-2 w-2 rounded-full bg-sky-300" />Secure session</span>
        </div> */}

        {!isSupabaseConfigured ? (
          <div role="alert" className="rounded-lg border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100">
            Supabase is not configured. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your local environment, then restart the app.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-sm text-slate-300">
              <span className="mb-1.5 flex items-center justify-between"><span>Tactical Email / Handle</span></span>
              <span className="relative block">
              <AtSign size={17} className="absolute left-3 top-3.5 text-sky-200" aria-hidden="true" />
              <input
                autoComplete="username"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#080a10]/80 py-3 pl-10 pr-3 text-white outline-none transition focus:border-primary/70 focus:ring-2 focus:ring-primary/20"
                placeholder="you@example.com"
              />
              </span>
            </label>

            <label className="block text-sm text-slate-300">
              <span className="mb-1.5 flex items-center justify-between"><span>Encrypted Passcode</span></span>
              <span className="relative mt-1.5 block">
                <LockKeyhole size={16} className="absolute left-3 top-3.5 text-sky-200" aria-hidden="true" />
                <input
                  autoComplete="current-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#080a10]/80 py-3 pl-10 pr-11 text-white outline-none transition focus:border-primary/70 focus:ring-2 focus:ring-primary/20"
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

            <div className="flex items-center justify-end gap-4 pt-1">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleReset}
                className="text-xs font-medium text-sky-200 hover:text-sky-100 disabled:opacity-50"
              >Reset password?</button>
            </div>

            {feedback && (
              <p role="status" className={`text-sm ${feedback.type === 'error' ? 'text-rose-300' : 'text-emerald-300'}`}>
                {feedback.text}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-container px-4 py-4 font-display text-base font-semibold text-white shadow-[0_0_28px_rgba(112,66,248,0.42)] transition hover:brightness-110 disabled:opacity-60"
            >
              {isSubmitting ? <LoaderCircle size={17} className="animate-spin" /> : <LogIn size={17} />}
              Enter { !isSubmitting && <ArrowRight size={18} /> }
            </button>
          </form>
        )}

        {/* <p className="mt-6 border-t border-white/[0.08] pt-5 text-center text-xs leading-5 text-slate-400">By connecting, you agree to the SquadBuilder FC Tactics Lab <span className="text-sky-200">Terms of Simulation</span> &amp; <span className="text-sky-200">Fair Play Protocols</span>.</p> */}
      </section>

      {/* <div className="mt-6 flex items-center gap-2 rounded-full bg-white/[0.04] px-4 py-2 text-xs text-slate-400"><span className="h-2 w-2 rounded-full bg-sky-200 shadow-[0_0_12px_rgba(162,202,249,0.8)]" />Match Engine online</div> */}
    </main>
  );
};
