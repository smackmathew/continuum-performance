import { useEffect, useState, type ReactNode } from 'react';
import { loadInvite, submitForms, type InviteState, type Submission } from './api';
import {
  AVAILABILITY_DAYS, AVAILABILITY_TIMES, EXPERIENCE_OPTIONS, HEALTH_QUESTIONS, WAIVER_PARAGRAPHS, WAIVER_TITLE, WAIVER_VERSION,
} from '../content/onboarding';
import { business } from '../content/site';

const token = new URLSearchParams(window.location.search).get('t') ?? '';
const STEPS = ['About you', 'Goals', 'Health', 'Waiver'];

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh bg-mist">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-2xl items-center px-4">
          <img src="/logo.png" alt="Continuum Performance" width={900} height={288} className="h-10 w-auto" />
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">{children}</main>
    </div>
  );
}

function Message({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Shell>
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="font-display text-3xl font-bold uppercase text-navy-900">{title}</h1>
        <div className="mt-3 text-slate-600">{children}</div>
        <p className="mt-6 text-sm text-slate-500">
          Questions? Email <a className="font-semibold text-flame-600" href={`mailto:${business.email}`}>{business.email}</a> or call{' '}
          <a className="font-semibold text-flame-600" href={`tel:${business.phone.replace(/[^\d+]/g, '')}`}>{business.phone}</a>.
        </p>
      </div>
    </Shell>
  );
}

const Field = ({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) => (
  <label className="block text-sm font-semibold text-navy-800">
    {label}
    {hint && <span className="ml-1 font-normal text-slate-400">{hint}</span>}
    {children}
  </label>
);

const empty: Submission = {
  about: { fullName: '', dob: '', email: '', phone: '', emergencyName: '', emergencyPhone: '' },
  goals: { goals: '', experience: '', sport: '', injuries: '', availability: [], heardFrom: '' },
  health: { answers: Object.fromEntries(HEALTH_QUESTIONS.map((q) => [q.id, undefined])) as unknown as Record<string, boolean>, details: '' },
  waiver: { agreed: true, signedName: '', signer: 'self', version: WAIVER_VERSION },
};

export default function App() {
  const [invite, setInvite] = useState<InviteState | 'loading' | 'error'>('loading');
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Submission>(empty);
  const [agreed, setAgreed] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    loadInvite(token).then(setInvite).catch(() => setInvite('error'));
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  if (invite === 'loading') return <Shell><p className="py-20 text-center text-slate-500">Loading your forms…</p></Shell>;
  if (invite === 'error') return <Message title="Something went wrong">We couldn&apos;t load your forms. Please check your connection and reload the page.</Message>;
  if (done) return <Message title="All done, thank you!">Your forms are in. Your coach will review them before your first session. See you soon!</Message>;
  if (invite.kind === 'missing') return <Message title="Link not found">This link isn&apos;t valid. Please use the exact link you were sent, or ask us for a new one.</Message>;
  if (invite.kind === 'submitted') return <Message title="Already received">These forms have already been submitted. For your privacy, they can&apos;t be opened again from this link.</Message>;
  if (invite.kind === 'revoked' || invite.kind === 'expired')
    return <Message title="This link has expired">For your privacy, onboarding links only work for a limited time. Ask us and we&apos;ll send you a new one.</Message>;

  // Any change clears the last error message; it's re-checked on Next.
  const set = <K extends keyof Submission>(k: K, v: Partial<Submission[K]>) => {
    setProblem(null);
    setForm((f) => ({ ...f, [k]: { ...f[k], ...v } }));
  };
  const anyYes = HEALTH_QUESTIONS.some((q) => form.health.answers[q.id] === true);

  function check(): string | null {
    if (step === 0) {
      if (!form.about.fullName.trim()) return 'Please enter your full name.';
      if (!form.about.emergencyName.trim() || !form.about.emergencyPhone.trim()) return 'Please add an emergency contact name and phone number.';
    }
    if (step === 1 && !form.goals.experience) return 'Please choose your training experience.';
    if (step === 2) {
      if (HEALTH_QUESTIONS.some((q) => typeof form.health.answers[q.id] !== 'boolean')) return 'Please answer yes or no to every question.';
      if (anyYes && !form.health.details.trim()) return 'You answered yes to at least one question. Please tell us a little more.';
    }
    if (step === 3) {
      if (!agreed) return 'Please tick the box to agree to the waiver.';
      if (form.waiver.signedName.trim().length < 2) return 'Please type your full name to sign.';
    }
    return null;
  }

  async function next() {
    const p = check();
    setProblem(p);
    if (p) return;
    if (step < STEPS.length - 1) return setStep(step + 1);
    setSending(true);
    try {
      await submitForms(token, form);
      setDone(true);
    } catch {
      setProblem('We couldn’t submit your forms. Please check your connection and try again. If it keeps happening, the link may have expired.');
    } finally {
      setSending(false);
    }
  }

  const today = new Date().toLocaleDateString(undefined, { dateStyle: 'long' });

  return (
    <Shell>
      <p className="eyebrow">New member forms</p>
      <h1 className="mt-2 font-display text-4xl font-bold uppercase leading-none text-navy-900">Welcome, {invite.firstName}!</h1>
      <p className="mt-3 text-slate-600">Four quick steps, about 5 minutes. Your answers go only to your coach and Kate.</p>

      <ol className="mt-8 grid grid-cols-4 gap-2" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === step ? 'step' : undefined}>
            <span className={`block h-1.5 rounded-full ${i <= step ? 'bg-flame-600' : 'bg-slate-200'}`} />
            <span className={`mt-1.5 block text-xs font-semibold ${i === step ? 'text-navy-900' : 'text-slate-400'}`}>{s}</span>
          </li>
        ))}
      </ol>

      <form
        className="mt-6 space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
        onSubmit={(e) => {
          e.preventDefault();
          next();
        }}
        noValidate
      >
        {step === 0 && (
          <>
            <h2 className="font-display text-2xl font-bold uppercase text-navy-900">About you</h2>
            <Field label="Full name"><input className="field" autoComplete="name" value={form.about.fullName} onChange={(e) => set('about', { fullName: e.target.value })} maxLength={120} /></Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Date of birth"><input className="field" type="date" value={form.about.dob} onChange={(e) => set('about', { dob: e.target.value })} /></Field>
              <Field label="Phone"><input className="field" type="tel" autoComplete="tel" value={form.about.phone} onChange={(e) => set('about', { phone: e.target.value })} maxLength={40} /></Field>
            </div>
            <Field label="Email"><input className="field" type="email" autoComplete="email" value={form.about.email} onChange={(e) => set('about', { email: e.target.value })} maxLength={200} /></Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Emergency contact"><input className="field" value={form.about.emergencyName} onChange={(e) => set('about', { emergencyName: e.target.value })} maxLength={120} placeholder="Name" /></Field>
              <Field label="Their phone"><input className="field" type="tel" value={form.about.emergencyPhone} onChange={(e) => set('about', { emergencyPhone: e.target.value })} maxLength={40} /></Field>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="font-display text-2xl font-bold uppercase text-navy-900">Goals &amp; history</h2>
            <Field label="What do you want to get out of training?">
              <textarea className="field resize-y" rows={3} value={form.goals.goals} onChange={(e) => set('goals', { goals: e.target.value })} maxLength={2000} placeholder="e.g. Get stronger, make varsity, run a half marathon, move without pain" />
            </Field>
            <fieldset>
              <legend className="text-sm font-semibold text-navy-800">Training experience</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {EXPERIENCE_OPTIONS.map((o) => (
                  <label key={o.id} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm ${form.goals.experience === o.id ? 'border-flame-600 bg-flame-50 text-navy-900' : 'border-slate-200'}`}>
                    <input type="radio" name="experience" className="accent-flame-600" checked={form.goals.experience === o.id} onChange={() => set('goals', { experience: o.id })} />
                    {o.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <Field label="Sport or position" hint="(if any)"><input className="field" value={form.goals.sport} onChange={(e) => set('goals', { sport: e.target.value })} maxLength={120} /></Field>
            <Field label="Past or current injuries, surgeries or pain" hint="(if any)">
              <textarea className="field resize-y" rows={3} value={form.goals.injuries} onChange={(e) => set('goals', { injuries: e.target.value })} maxLength={2000} />
            </Field>
            <fieldset>
              <legend className="text-sm font-semibold text-navy-800">When can you usually train?</legend>
              <div className="mt-2 overflow-x-auto">
                <table className="text-sm">
                  <thead>
                    <tr>
                      <th className="pr-2" />
                      {AVAILABILITY_DAYS.map((d) => <th key={d} className="px-1 pb-1 text-xs font-semibold text-slate-500">{d}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {AVAILABILITY_TIMES.map((t) => (
                      <tr key={t}>
                        <th className="whitespace-nowrap pr-2 text-left text-xs font-semibold text-slate-500">{t}</th>
                        {AVAILABILITY_DAYS.map((d) => {
                          const slot = `${d} ${t}`;
                          const on = form.goals.availability.includes(slot);
                          return (
                            <td key={slot} className="p-0.5">
                              <button
                                type="button"
                                aria-pressed={on}
                                aria-label={slot}
                                onClick={() => set('goals', { availability: on ? form.goals.availability.filter((x) => x !== slot) : [...form.goals.availability, slot].slice(0, 21) })}
                                className={`h-9 w-9 rounded-md border text-xs font-bold ${on ? 'border-flame-600 bg-flame-600 text-white' : 'border-slate-200 bg-white text-transparent hover:border-flame-300'}`}
                              >
                                ✓
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </fieldset>
            <Field label="How did you hear about us?" hint="(optional)"><input className="field" value={form.goals.heardFrom} onChange={(e) => set('goals', { heardFrom: e.target.value })} maxLength={120} /></Field>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="font-display text-2xl font-bold uppercase text-navy-900">Health screen</h2>
            <p className="text-sm text-slate-600">Please answer honestly. A &ldquo;yes&rdquo; doesn&apos;t mean you can&apos;t train; it helps us plan safely, and we may ask for a note from your doctor first.</p>
            <ol className="space-y-3">
              {HEALTH_QUESTIONS.map((q, i) => {
                const v = form.health.answers[q.id];
                return (
                  <li key={q.id} className="rounded-lg border border-slate-200 p-3">
                    <p className="text-sm text-navy-900"><span className="font-semibold text-slate-400">{i + 1}.</span> {q.text}</p>
                    <div className="mt-2 flex gap-2" role="radiogroup" aria-label={`Question ${i + 1}`}>
                      {[{ l: 'No', b: false }, { l: 'Yes', b: true }].map(({ l, b }) => (
                        <button
                          key={l}
                          type="button"
                          role="radio"
                          aria-checked={v === b}
                          onClick={() => set('health', { answers: { ...form.health.answers, [q.id]: b } })}
                          className={`min-w-20 rounded-md border px-4 py-2 text-sm font-semibold ${v === b ? (b ? 'border-flame-600 bg-flame-600 text-white' : 'border-navy-900 bg-navy-900 text-white') : 'border-slate-300 text-navy-800'}`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ol>
            {anyYes && (
              <Field label="Please tell us more about any “yes” answers">
                <textarea className="field resize-y" rows={3} value={form.health.details} onChange={(e) => set('health', { details: e.target.value })} maxLength={2000} />
              </Field>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="font-display text-2xl font-bold uppercase text-navy-900">Waiver</h2>
            <div className="max-h-72 space-y-3 overflow-y-auto rounded-lg border border-slate-200 bg-mist p-4 text-sm text-slate-700" tabIndex={0} aria-label="Waiver text">
              <p className="font-semibold text-navy-900">{WAIVER_TITLE}</p>
              {WAIVER_PARAGRAPHS.map((p, i) => <p key={i}>{p}</p>)}
            </div>
            <fieldset>
              <legend className="text-sm font-semibold text-navy-800">I am signing</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {([['self', 'For myself'], ['guardian', 'As parent/guardian of a minor']] as const).map(([id, l]) => (
                  <label key={id} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm ${form.waiver.signer === id ? 'border-flame-600 bg-flame-50 text-navy-900' : 'border-slate-200'}`}>
                    <input type="radio" name="signer" className="accent-flame-600" checked={form.waiver.signer === id} onChange={() => set('waiver', { signer: id })} />
                    {l}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="flex items-start gap-3 text-sm text-navy-900">
              <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-flame-600" checked={agreed} onChange={(e) => { setProblem(null); setAgreed(e.target.checked); }} />
              I have read and agree to the waiver above{form.waiver.signer === 'guardian' ? ` on behalf of ${form.about.fullName || 'the participant'}` : ''}.
            </label>
            <Field label={form.waiver.signer === 'guardian' ? 'Parent/guardian full name (your signature)' : 'Type your full name to sign'}>
              <input className="field font-display text-2xl" value={form.waiver.signedName} onChange={(e) => set('waiver', { signedName: e.target.value })} maxLength={120} autoComplete="name" />
            </Field>
            <p className="text-xs text-slate-500">Signed electronically on {today}. Typing your name has the same effect as a handwritten signature.</p>
          </>
        )}

        {problem && <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">{problem}</p>}

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
          {step > 0 ? (
            <button type="button" onClick={() => { setProblem(null); setStep(step - 1); }} className="btn-ghost !py-2.5">Back</button>
          ) : <span />}
          <button type="submit" disabled={sending} className="btn-primary !py-2.5 disabled:opacity-60">
            {step < STEPS.length - 1 ? 'Next' : sending ? 'Submitting…' : 'Sign & submit'}
          </button>
        </div>
      </form>
    </Shell>
  );
}
