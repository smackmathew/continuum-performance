import { useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { STATUSES, type Lead, type TeamMember } from '../types';
import { when } from '../format';
import { Avatar, ErrorNote, Spinner, StatusPill } from '../ui';

type Filter = 'open' | 'all' | (typeof STATUSES)[number]['id'];
const OPEN = new Set(['new', 'contacted', 'assessment']);

export function Inbox({ leads, loading, error, team, user }: { leads: Lead[]; loading: boolean; error: string | null; team: TeamMember[]; user: User }) {
  const [filter, setFilter] = useState<Filter>('open');
  const [mine, setMine] = useState(false);
  const [q, setQ] = useState('');
  const names = useMemo(() => new Map(team.map((m) => [m.uid, m.name])), [team]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: leads.length, open: 0 };
    for (const l of leads) {
      c[l.status] = (c[l.status] ?? 0) + 1;
      if (OPEN.has(l.status)) c.open += 1;
    }
    return c;
  }, [leads]);

  const shown = leads.filter((l) => {
    if (filter === 'open' ? !OPEN.has(l.status) : filter !== 'all' && l.status !== filter) return false;
    if (mine && l.assignedTo !== user.uid) return false;
    const s = q.trim().toLowerCase();
    return !s || [l.name, l.email, l.phone, l.message, l.interest].some((v) => v?.toLowerCase().includes(s));
  });

  const tabs: { id: Filter; label: string }[] = [{ id: 'open', label: 'Open' }, ...STATUSES, { id: 'all', label: 'All' }];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold uppercase text-navy-900">Leads</h1>
          <p className="text-sm text-slate-500">Enquiries from the website, newest first. Updates live.</p>
        </div>
        <div className="flex gap-2">
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, message…" aria-label="Search leads" className="field !mt-0 sm:w-72" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Filter by status" className="-mx-1 flex max-w-full gap-1 overflow-x-auto px-1 pb-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={filter === t.id}
              onClick={() => setFilter(t.id)}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                filter === t.id ? 'bg-navy-900 text-white' : 'bg-white text-navy-800 ring-1 ring-slate-200 hover:ring-navy-300'
              }`}
            >
              {t.label} <span className={filter === t.id ? 'text-navy-200' : 'text-slate-400'}>{counts[t.id] ?? 0}</span>
            </button>
          ))}
        </div>
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm font-medium text-navy-800">
          <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} className="h-4 w-4 accent-flame-600" />
          Assigned to me
        </label>
      </div>

      <ErrorNote error={error} />
      {loading ? (
        <Spinner />
      ) : shown.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-slate-500">
          {leads.length === 0 ? 'No enquiries yet. New ones from the website appear here instantly.' : 'Nothing matches these filters.'}
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {shown.map((l) => {
            const unread = !l.readAt;
            const assignee = l.assignedTo ? names.get(l.assignedTo) : undefined;
            return (
              <li key={l.id}>
                <a href={`#/leads/${l.id}`} className="flex gap-3 px-4 py-4 transition hover:bg-mist sm:items-center sm:px-5">
                  <span aria-hidden="true" className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full sm:mt-0 ${unread ? 'bg-flame-600' : 'bg-transparent'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className={`truncate text-navy-900 ${unread ? 'font-bold' : 'font-medium'}`}>
                        {l.name}
                        {unread && <span className="sr-only"> (unread)</span>}
                      </span>
                      <StatusPill status={l.status} />
                      <span className="text-xs text-slate-500">{l.interest}</span>
                    </div>
                    <p className={`mt-1 truncate text-sm ${unread ? 'text-slate-700' : 'text-slate-500'}`}>{l.message || l.email}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <time className="whitespace-nowrap text-xs text-slate-500">{when(l.createdAt)}</time>
                    {assignee && <Avatar name={assignee} className="h-6 w-6 text-[10px]" />}
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
