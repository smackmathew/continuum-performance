import { useState, type FormEvent } from 'react';
import { business, contact } from '../content/site';

const endpoint = import.meta.env.VITE_CONTACT_ENDPOINT as string | undefined;

type Status = 'idle' | 'sending' | 'sent' | 'error';

export default function Contact() {
  const [status, setStatus] = useState<Status>('idle');
  const { address } = business;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    // No form service configured: open the visitor's email app with the details filled in.
    if (!endpoint) {
      const lines = ['name', 'email', 'phone', 'interest', 'message'].map((k) => `${k[0].toUpperCase()}${k.slice(1)}: ${data.get(k) ?? ''}`);
      const subject = encodeURIComponent(`Free assessment request: ${data.get('name')}`);
      window.location.href = `mailto:${business.email}?subject=${subject}&body=${encodeURIComponent(lines.join('\n'))}`;
      return;
    }

    setStatus('sending');
    try {
      const res = await fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(String(res.status));
      setStatus('sent');
      form.reset();
    } catch {
      setStatus('error');
    }
  }

  return (
    <section id="contact" className="section bg-mist">
      <div className="container-x grid gap-12 lg:grid-cols-2">
        <div>
          <p className="eyebrow">Get started</p>
          <h2 className="h2">{contact.title}</h2>
          <p className="mt-5 text-lg">{contact.body}</p>

          <dl className="mt-10 grid gap-8 sm:grid-cols-2">
            <div>
              <dt className="font-display text-sm uppercase tracking-[0.2em] text-flame-600">Visit</dt>
              <dd className="mt-2 text-navy-900">
                <a href={business.mapUrl} target="_blank" rel="noreferrer" className="hover:text-flame-600">
                  {address.street}
                  <br />
                  {address.city}, {address.region} {address.postal}
                </a>
              </dd>
            </div>
            <div>
              <dt className="font-display text-sm uppercase tracking-[0.2em] text-flame-600">Contact</dt>
              <dd className="mt-2 space-y-1 text-navy-900">
                <a href={`tel:${business.phone.replace(/[^\d+]/g, '')}`} className="block hover:text-flame-600">{business.phone}</a>
                <a href={`mailto:${business.email}`} className="block break-all hover:text-flame-600">{business.email}</a>
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-display text-sm uppercase tracking-[0.2em] text-flame-600">Hours</dt>
              <dd className="mt-2">
                <ul className="space-y-1 text-navy-900">
                  {business.hours.map((h) => (
                    <li key={h.days} className="flex justify-between gap-4 border-b border-slate-200 pb-1 sm:max-w-sm">
                      <span className="text-slate-500">{h.days}</span>
                      <span>{h.time}</span>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          </dl>
        </div>

        <form onSubmit={onSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-lg shadow-navy-900/5 sm:p-8">
          {status === 'sent' ? (
            <div role="status" className="flex min-h-[24rem] flex-col items-center justify-center text-center">
              <p className="font-display text-4xl font-bold uppercase text-flame-600">Got it.</p>
              <p className="mt-3 max-w-sm">Thanks for reaching out. A coach will be in touch within one business day.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block text-sm font-medium text-navy-800 sm:col-span-2">
                Name
                <input name="name" required autoComplete="name" className="field" />
              </label>
              <label className="block text-sm font-medium text-navy-800">
                Email
                <input name="email" type="email" required autoComplete="email" className="field" />
              </label>
              <label className="block text-sm font-medium text-navy-800">
                Phone <span className="font-normal text-slate-400">(optional)</span>
                <input name="phone" type="tel" autoComplete="tel" className="field" />
              </label>
              <label className="block text-sm font-medium text-navy-800 sm:col-span-2">
                I&apos;m interested in
                <select name="interest" className="field" defaultValue={contact.interests[contact.interests.length - 1]}>
                  {contact.interests.map((i) => (
                    <option key={i}>{i}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-navy-800 sm:col-span-2">
                Goals, injuries, or questions
                <textarea name="message" rows={4} className="field resize-y" />
              </label>
              {/* Honeypot for form services that support it */}
              <input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
              <div className="sm:col-span-2">
                <button type="submit" disabled={status === 'sending'} className="btn-primary w-full disabled:opacity-60">
                  {status === 'sending' ? 'Sending…' : 'Request my free assessment'}
                </button>
                {status === 'error' && (
                  <p role="alert" className="mt-3 text-sm text-red-700">
                    Something went wrong. Please call us or email {business.email}.
                  </p>
                )}
              </div>
            </div>
          )}
        </form>
      </div>
    </section>
  );
}
