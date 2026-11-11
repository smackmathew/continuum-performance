import { useEffect, useState, type FormEvent } from 'react';
import { useAlertEmails } from '../data';
import { saveAlertEmails } from '../actions';
import type { TeamMember } from '../types';
import { Avatar, Card, ErrorNote } from '../ui';

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Owner only (the nav and route hide it from coaches, and the rules block their reads). */
export function Settings({ team }: { team: TeamMember[] }) {
  const alerts = useAlertEmails();
  const [emails, setEmails] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<{ kind: 'idle' | 'saved' | 'error'; msg?: string }>({ kind: 'idle' });

  useEffect(() => {
    setEmails(alerts.data);
  }, [alerts.data]);
  const dirty = emails.join() !== alerts.data.join();

  function add(e: FormEvent) {
    e.preventDefault();
    const v = draft.trim().toLowerCase();
    if (!EMAIL.test(v)) return setStatus({ kind: 'error', msg: 'That doesn’t look like an email address.' });
    if (!emails.includes(v)) setEmails([...emails, v].slice(0, 10));
    setDraft('');
    setStatus({ kind: 'idle' });
  }

  async function save() {
    try {
      await saveAlertEmails(emails);
      setStatus({ kind: 'saved' });
    } catch (e) {
      setStatus({ kind: 'error', msg: (e as Error).message });
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display text-4xl font-bold uppercase text-navy-900">Settings</h1>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="New-lead email alerts">
          <ErrorNote error={alerts.error} />
          <p className="text-sm text-slate-600">
            Everyone listed gets an email the moment a website enquiry arrives.
            {emails.length === 0 && ' With no one listed, alerts go to you.'}
          </p>
          <ul className="mt-4 space-y-2">
            {emails.map((e) => (
              <li key={e} className="flex items-center justify-between gap-3 rounded-md bg-mist px-3 py-2 text-sm">
                <span className="break-all text-navy-900">{e}</span>
                <button type="button" onClick={() => setEmails(emails.filter((x) => x !== e))} className="text-xs font-semibold text-slate-500 hover:text-red-700" aria-label={`Remove ${e}`}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <form onSubmit={add} className="mt-4 flex gap-2">
            <label htmlFor="alert-email" className="sr-only">Email address</label>
            <input id="alert-email" type="email" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="name@example.com" className="field !mt-0" />
            <button type="submit" className="btn-ghost !py-2 !text-base" disabled={emails.length >= 10}>Add</button>
          </form>
          <div className="mt-4 flex items-center gap-3">
            <button type="button" onClick={save} disabled={!dirty} className="btn-primary !py-2 !text-base disabled:opacity-50">Save</button>
            {status.kind === 'saved' && !dirty && <span role="status" className="text-sm text-emerald-700">Saved.</span>}
            {status.kind === 'error' && <span role="alert" className="text-sm text-red-700">{status.msg}</span>}
          </div>
        </Card>

        <Card title="Team">
          <ul className="space-y-3">
            {team.map((m) => (
              <li key={m.uid} className="flex items-center gap-3">
                <Avatar name={m.name} photoURL={m.photoURL} className="h-9 w-9 text-sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-navy-900">{m.name}</p>
                  <p className="truncate text-sm text-slate-500">{m.email}</p>
                </div>
                <span className="rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-semibold text-navy-700">{m.role === 'owner' ? 'Owner' : 'Coach'}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500">
            To add a coach: they sign in here once with Google. Then run <strong>Team access</strong> in the
            GitHub repository&apos;s Actions tab with their email and the role <em>staff</em>. Coaches only see leads you assign to them.
          </p>
        </Card>
      </div>
    </div>
  );
}
