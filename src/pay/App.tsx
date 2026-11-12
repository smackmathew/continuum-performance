import { useEffect, useState, type ReactNode } from 'react';
import { initializeApp } from 'firebase/app';
import { connectFirestoreEmulator, doc, getDoc, getFirestore, type Timestamp } from 'firebase/firestore/lite';
import { firebaseConfig, useEmulators } from '../firebase-config';
import { billingPortalUrl, checkoutUrl, paymentsEnabled, planById, priceLabel, type Plan } from '../plans';
import { business } from '../content/site';

const params = new URLSearchParams(window.location.search);
const token = params.get('t');
const planParam = params.get('plan');
const status = params.get('status');

type View =
  | { kind: 'loading' }
  | { kind: 'ready'; plan: Plan; firstName?: string }
  | { kind: 'message'; title: string; body: ReactNode };

async function loadLink(t: string): Promise<View> {
  if (!/^[A-Za-z0-9]{16,64}$/.test(t)) return notFound;
  const app = initializeApp({ ...firebaseConfig, apiKey: firebaseConfig.apiKey || 'emulator' });
  const db = getFirestore(app);
  if (useEmulators) connectFirestoreEmulator(db, '127.0.0.1', 8080);
  const snap = await getDoc(doc(db, 'payLinks', t));
  if (!snap.exists()) return notFound;
  const d = snap.data() as { plan: string; status: string; firstName: string; expiresAt: Timestamp };
  const plan = planById(d.plan);
  if (d.status === 'used') return { kind: 'message', title: 'Already paid', body: 'This payment has already been made. Thank you!' };
  if (d.status !== 'open' || !plan || d.expiresAt.toMillis() < Date.now())
    return { kind: 'message', title: 'This link has expired', body: 'Payment links only work for a limited time. Ask us and we’ll send you a new one.' };
  return { kind: 'ready', plan, firstName: d.firstName };
}
const notFound: View = { kind: 'message', title: 'Link not found', body: 'This payment link isn’t valid. Please use the exact link you were sent, or ask us for a new one.' };

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh bg-mist">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-xl items-center px-4">
          <a href="/"><img src="/logo.png" alt="Continuum Performance" width={900} height={288} className="h-10 w-auto" /></a>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 py-10">{children}</main>
    </div>
  );
}

const Contact = () => (
  <p className="mt-6 text-sm text-slate-500">
    Questions? Email <a className="font-semibold text-flame-600" href={`mailto:${business.email}`}>{business.email}</a> or call{' '}
    <a className="font-semibold text-flame-600" href={`tel:${business.phone.replace(/[^\d+]/g, '')}`}>{business.phone}</a>.
  </p>
);

export default function App() {
  const [view, setView] = useState<View>({ kind: 'loading' });
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'success') {
      setView({
        kind: 'message',
        title: 'You’re all set!',
        body: (
          <>
            <p>Payment received. Stripe has emailed you a receipt, and we&apos;ll be in touch about your first session.</p>
            {billingPortalUrl && (
              <p className="mt-3">
                You can update your card, see receipts or cancel anytime in{' '}
                <a className="font-semibold text-flame-600" href={billingPortalUrl}>your membership portal</a>.
              </p>
            )}
          </>
        ),
      });
    } else if (token) {
      loadLink(token).then(setView).catch(() => setView({ kind: 'message', title: 'Something went wrong', body: 'We couldn’t load this page. Please check your connection and reload.' }));
    } else {
      const plan = planById(planParam);
      if (!paymentsEnabled) setView({ kind: 'message', title: 'Online sign-up isn’t open yet', body: 'Get in touch and we’ll set you up in person.' });
      else setView(plan ? { kind: 'ready', plan } : { kind: 'message', title: 'Choose a membership', body: <a className="font-semibold text-flame-600" href="/#pricing">See memberships and prices</a> });
    }
  }, []);

  async function start() {
    if (view.kind !== 'ready') return;
    setStarting(true);
    setError(null);
    try {
      const res = await fetch(checkoutUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(token ? { token } : { plan: view.plan.id }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out.url) throw new Error(out.error || 'We couldn’t start checkout.');
      window.location.assign(out.url);
    } catch (e) {
      setError((e as Error).message);
      setStarting(false);
    }
  }

  if (view.kind === 'loading') return <Shell><p className="py-20 text-center text-slate-500">Loading…</p></Shell>;
  if (view.kind === 'message')
    return (
      <Shell>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="font-display text-3xl font-bold uppercase text-navy-900">{view.title}</h1>
          <div className="mt-3 text-slate-600">{view.body}</div>
          <Contact />
        </div>
      </Shell>
    );

  const { plan, firstName } = view;
  return (
    <Shell>
      {status === 'cancelled' && (
        <p role="status" className="mb-5 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">Checkout was cancelled. No payment was taken. You can try again below.</p>
      )}
      <p className="eyebrow">{firstName ? `Hi ${firstName}` : 'Membership'}</p>
      <h1 className="mt-2 font-display text-4xl font-bold uppercase leading-none text-navy-900">{plan.name}</h1>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="font-display text-5xl font-extrabold text-navy-900">{priceLabel(plan)}</p>
        <p className="mt-2 text-slate-600">{plan.description}</p>
        <ul className="mt-4 space-y-1.5 text-sm text-slate-600">
          {plan.mode === 'subscription' ? (
            <>
              <li>• Billed every {plan.interval}. Cancel anytime with 30 days&apos; notice.</li>
              <li>• Update your card or cancel yourself from your membership portal.</li>
            </>
          ) : (
            <li>• One-time payment. Book your sessions with your coach.</li>
          )}
          <li>• Secure checkout by Stripe. We never see your card details.</li>
        </ul>
        {error && <p role="alert" className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
        <button type="button" onClick={start} disabled={starting} className="btn-primary mt-6 w-full disabled:opacity-60">
          {starting ? 'Opening secure checkout…' : 'Continue to secure checkout'}
        </button>
      </div>
      {!token && (
        <p className="mt-5 text-center text-sm text-slate-500">
          Not sure which is right for you? <a className="font-semibold text-flame-600" href="/#contact">Book a free assessment first.</a>
        </p>
      )}
      <Contact />
    </Shell>
  );
}
