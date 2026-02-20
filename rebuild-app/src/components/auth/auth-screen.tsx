"use client";

import { useState } from 'react';
import { Lock, Mail } from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth-provider';

type AuthMode = 'signin' | 'signup';

type AuthScreenProps = {
  defaultMode?: AuthMode;
  title?: string;
  subtitle?: string;
};

export function AuthScreen({
  defaultMode = 'signup',
  title = 'Welcome to SocialButterflie',
  subtitle = 'Create your account to start building your brand system.',
}: AuthScreenProps) {
  const { signInEmail, signUpEmail, signInGoogle } = useAuth();
  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-[var(--shadow)]">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>

        <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-1">
          <button
            className={`h-9 rounded-lg text-sm ${mode === 'signup' ? 'bg-[var(--primary)] text-[var(--primary-contrast)]' : 'text-[var(--muted)]'}`}
            onClick={() => setMode('signup')}
            type="button"
          >
            Sign Up
          </button>
          <button
            className={`h-9 rounded-lg text-sm ${mode === 'signin' ? 'bg-[var(--primary)] text-[var(--primary-contrast)]' : 'text-[var(--muted)]'}`}
            onClick={() => setMode('signin')}
            type="button"
          >
            Sign In
          </button>
        </div>

        <form
          className="mt-4 space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);

            if (mode === 'signup' && password !== confirmPassword) {
              setError('Passwords do not match.');
              return;
            }

            setSubmitting(true);
            try {
              if (mode === 'signup') {
                await signUpEmail(email, password);
              } else {
                await signInEmail(email, password);
              }
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Authentication failed');
            } finally {
              setSubmitting(false);
            }
          }}
        >
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--muted)]">Email</span>
            <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3">
              <Mail className="h-4 w-4 text-[var(--muted)]" />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 w-full bg-transparent text-sm outline-none"
                type="email"
                required
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs text-[var(--muted)]">Password</span>
            <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3">
              <Lock className="h-4 w-4 text-[var(--muted)]" />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 w-full bg-transparent text-sm outline-none"
                type="password"
                minLength={6}
                required
              />
            </div>
          </label>

          {mode === 'signup' ? (
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--muted)]">Confirm password</span>
              <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3">
                <Lock className="h-4 w-4 text-[var(--muted)]" />
                <input
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-10 w-full bg-transparent text-sm outline-none"
                  type="password"
                  minLength={6}
                  required
                />
              </div>
            </label>
          ) : null}

          {error ? <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div> : null}

          <button
            className="h-10 w-full rounded-xl bg-[var(--primary)] text-sm font-medium text-[var(--primary-contrast)] disabled:opacity-60"
            disabled={submitting}
            type="submit"
          >
            {mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>

          <button
            className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] text-sm"
            type="button"
            onClick={() => signInGoogle().catch((err) => setError(err instanceof Error ? err.message : 'Unable to sign in'))}
          >
            Continue with Google
          </button>
        </form>
      </div>
    </div>
  );
}

