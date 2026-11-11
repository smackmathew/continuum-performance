import { useState, type FormEvent } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { useEmulators } from '../../firebase-config';
import { Logo } from '../ui';

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-svh place-items-center bg-mist px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-lg shadow-navy-900/5">
        <Logo className="mx-auto h-12" />
        {children}
      </div>
    </main>
  );
}

const friendly = (e: unknown) => {
  const code = (e as { code?: string }).code ?? '';
  if (code.includes('popup-closed') || code.includes('cancelled-popup')) return null;
  if (code.includes('unauthorized-domain')) return 'This address isn’t allowed to sign in yet. Add it under Firebase → Authentication → Settings → Authorized domains.';
  if (code.includes('operation-not-allowed')) return 'Google sign-in isn’t switched on yet. Enable it under Firebase → Authentication → Sign-in method.';
  return 'Sign-in didn’t work. Please try again.';
};

export function SignIn() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function google() {
    setBusy(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  }

  async function emulatorSignIn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await signInWithEmailAndPassword(auth, String(f.get('email')), String(f.get('password')));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <Frame>
      <h1 className="mt-8 text-center font-display text-3xl font-bold uppercase text-navy-900">Team hub</h1>
      <p className="mt-2 text-center text-sm text-slate-500">Sign in with the Google account your team access was set up for.</p>
      <button type="button" onClick={google} disabled={busy} className="btn-ghost mt-8 w-full gap-3 !normal-case !tracking-normal disabled:opacity-60">
        <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        <span className="font-sans text-base font-semibold">{busy ? 'Opening Google…' : 'Sign in with Google'}</span>
      </button>
      {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}

      {useEmulators && (
        <form onSubmit={emulatorSignIn} className="mt-8 space-y-3 border-t border-dashed border-slate-300 pt-6" aria-label="Emulator sign-in">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Local emulator only</p>
          <input name="email" type="email" placeholder="Email" className="field" required />
          <input name="password" type="password" placeholder="Password" className="field" required />
          <button type="submit" className="btn-primary w-full">Sign in (emulator)</button>
        </form>
      )}
    </Frame>
  );
}

export function NotOnTeam({ email, onRetry }: { email: string; onRetry: () => Promise<void> }) {
  const [checking, setChecking] = useState(false);
  return (
    <Frame>
      <h1 className="mt-8 text-center font-display text-3xl font-bold uppercase text-navy-900">Almost there</h1>
      <p className="mt-3 text-center text-slate-600">
        You&apos;re signed in as <strong className="break-all text-navy-900">{email}</strong>, but this account hasn&apos;t been added to the team yet.
      </p>
      <p className="mt-3 text-center text-sm text-slate-500">Ask the owner to add this email address. Then tap &ldquo;Check again&rdquo;.</p>
      <button
        type="button"
        className="btn-primary mt-8 w-full"
        disabled={checking}
        onClick={async () => {
          setChecking(true);
          await onRetry().finally(() => setChecking(false));
        }}
      >
        {checking ? 'Checking…' : 'Check again'}
      </button>
      <button type="button" className="mt-3 w-full text-sm font-semibold text-slate-500 hover:text-navy-900" onClick={() => signOut(auth)}>
        Use a different account
      </button>
    </Frame>
  );
}
