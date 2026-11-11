import { useMemo, useState, type FormEvent } from 'react';
import type { User } from 'firebase/auth';
import { CHECKLIST, type Client, type Role, type TeamMember } from '../types';
import { createClient } from '../actions';
import { when } from '../format';
import { Avatar, ErrorNote, Spinner } from '../ui';

export function FormsBadge({ client }: { client: Client }) {
  const s = client.onboarding?.status ?? 'none';
  const map = {
    none: ['No link yet', 'bg-slate-100 text-slate-600'],
    sent: ['Link sent', 'bg-amber-100 text-amber-900'],
    submitted: ['Forms in', 'bg-emerald-100 text-emerald-900'],
    revoked: ['Link revoked', 'bg-slate-100 text-slate-600'],
  } as const;
  const [label, cls] = map[s];
  return <span className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>;
}

export function HealthFlag() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800" title="Answered yes on the health screen">
      <span aria-hidden="true">⚑</span> Health check
    </span>
  );
}

export const progress = (c: Client) => CHECKLIST.filter((s) => c.checklist?.[s.id]).length;

export function Clients({ clients, loading, error, team, user, role }: {
  clients: Client[]; loading: boolean; error: string | null; team: TeamMember[]; user: User; role: Role;
}) {
  const owner = role === 'owner';
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const names = useMemo(() => new Map(team.map((m) => [m.uid, m])), [team]);
  const shown = clients.filter((c) => {
    const s = q.trim().toLowerCase();
    return !s || [c.name, c.email, c.phone, c.membership].some((v) => v?.toLowerCase().includes(s));
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold uppercase text-navy-900">{owner ? 'Clients' : 'My clients'}</h1>
          <p className="text-sm text-slate-500">{owner ? 'Everyone onboarding or training with you.' : 'Clients Kate has assigned to you.'}</p>
        </div>
        <div className="flex gap-2">
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clients…" aria-label="Search clients" className="field !mt-0 sm:w-64" />
          {owner && <button type="button" onClick={() => setAdding(true)} className="btn-primary shrink-0 !py-2 !text-base">New client</button>}
        </div>
      </div>

      {adding && <NewClientForm team={team} user={user} onClose={() => setAdding(false)} />}

      <ErrorNote error={error} />
      {loading ? (
        <Spinner />
      ) : shown.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-slate-500">
          {clients.length > 0
            ? 'No clients match your search.'
            : owner
              ? 'No clients yet. Convert a lead from its page, or add one with "New client".'
              : 'No clients assigned to you yet.'}
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {shown.map((c) => {
            const coach = c.assignedTo ? names.get(c.assignedTo) : undefined;
            const done = progress(c);
            return (
              <li key={c.id}>
                <a href={`#/clients/${c.id}`} className="flex flex-col gap-3 px-4 py-4 transition hover:bg-mist sm:flex-row sm:items-center sm:px-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="truncate font-semibold text-navy-900">{c.name}</span>
                      <FormsBadge client={c} />
                      {c.healthFlag && <HealthFlag />}
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-500">
                      {c.membership || 'No membership yet'} · added {when(c.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-36">
                      <div className="flex justify-between text-xs text-slate-500"><span>Onboarding</span><span>{done}/{CHECKLIST.length}</span></div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={CHECKLIST.length} aria-valuenow={done} aria-label={`${c.name} onboarding progress`}>
                        <div className={`h-full rounded-full ${done === CHECKLIST.length ? 'bg-emerald-500' : 'bg-flame-600'}`} style={{ width: `${(done / CHECKLIST.length) * 100}%` }} />
                      </div>
                    </div>
                    {owner && (coach ? <Avatar name={coach.name} photoURL={coach.photoURL} className="h-7 w-7 text-[10px]" /> : <span className="w-7 text-center text-xs text-slate-400" title="No coach">–</span>)}
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function NewClientForm({ team, user, onClose }: { team: TeamMember[]; user: User; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get('email') ?? '').trim();
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setError('That email doesn’t look right.');
    setSaving(true);
    try {
      const id = await createClient({ name: String(f.get('name')), email, phone: String(f.get('phone') ?? ''), assignedTo: String(f.get('coach') || '') || null });
      window.location.hash = `#/clients/${id}`;
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }
  return (
    <form onSubmit={submit} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2" aria-label="New client">
      <label className="block text-sm font-semibold text-navy-800 sm:col-span-2">Name<input name="name" required maxLength={120} className="field" /></label>
      <label className="block text-sm font-semibold text-navy-800">Email <span className="font-normal text-slate-400">(optional)</span><input name="email" type="email" maxLength={200} className="field" /></label>
      <label className="block text-sm font-semibold text-navy-800">Phone <span className="font-normal text-slate-400">(optional)</span><input name="phone" type="tel" maxLength={40} className="field" /></label>
      <label className="block text-sm font-semibold text-navy-800 sm:col-span-2">
        Coach
        <select name="coach" className="field" defaultValue={user.uid}>
          <option value="">No coach yet</option>
          {team.map((m) => <option key={m.uid} value={m.uid}>{m.name}{m.uid === user.uid ? ' (me)' : ''}</option>)}
        </select>
      </label>
      {error && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{error}</p>}
      <div className="flex justify-end gap-2 sm:col-span-2">
        <button type="button" onClick={onClose} className="btn-ghost !py-2 !text-base">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary !py-2 !text-base disabled:opacity-60">{saving ? 'Adding…' : 'Add client'}</button>
      </div>
    </form>
  );
}
