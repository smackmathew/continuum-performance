import { useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { useLead } from '../data';
import { assign, convertLead, deleteLead, markRead, markUnread, setStatus } from '../actions';
import { STATUSES, type Role, type Status, type TeamMember } from '../types';
import { firstName, fullDate, when } from '../format';
import { Card, ErrorNote, Spinner, StatusPill } from '../ui';
import { NotesCard } from '../NotesCard';

export function LeadDetail({ id, team, user, role }: { id: string; team: TeamMember[]; user: User; role: Role }) {
  const { data: lead, loading, error, denied } = useLead(id);
  const [actionError, setActionError] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const firstLoad = useRef(true);

  const run = (p: Promise<unknown>) => p.then(() => setActionError(null)).catch((e: Error) => setActionError(e.message));

  // Opening an unread lead marks it read. Only on opening: if it becomes unread
  // while open (e.g. Kate assigns it to a coach), it stays unread for them.
  useEffect(() => {
    if (!lead || !firstLoad.current) return;
    firstLoad.current = false;
    if (!lead.readAt) run(markRead(id));
  }, [lead, id]);

  if (loading) return <Spinner />;
  if (!lead)
    return (
      <div className="space-y-4">
        <a href="#/" className="text-sm font-semibold text-flame-600">← Back to leads</a>
        <ErrorNote error={error} />
        {!error && (
          <p className="text-slate-600">
            {denied && role !== 'owner'
              ? 'This enquiry isn\u2019t assigned to you, or it has been reassigned or deleted.'
              : 'This lead doesn\u2019t exist any more.'}
          </p>
        )}
      </div>
    );

  const names = new Map(team.map((m) => [m.uid, m.name]));
  const subject = encodeURIComponent('Your free assessment at Continuum Performance');
  const greeting = encodeURIComponent(`Hi ${firstName(lead.name)},\n\nThanks for reaching out to Continuum Performance!\n\n`);


  return (
    <div className="space-y-5">
      <a href="#/" className="inline-block text-sm font-semibold text-flame-600 hover:text-flame-700">← Back to leads</a>
      <ErrorNote error={error || actionError} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="break-words font-display text-4xl font-bold uppercase leading-none text-navy-900">{lead.name}</h1>
          <p className="mt-2 text-sm text-slate-500">
            Enquired {when(lead.createdAt)} · {lead.interest}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`mailto:${lead.email}?subject=${subject}&body=${greeting}`} className="btn-primary !py-2 !text-base">Email</a>
          {lead.phone && <a href={`tel:${lead.phone.replace(/[^\d+]/g, '')}`} className="btn-ghost !py-2 !text-base">Call</a>}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-5">
          <Card title="Enquiry">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</dt>
                <dd className="mt-1 break-all"><a className="text-navy-900 hover:text-flame-600" href={`mailto:${lead.email}`}>{lead.email}</a></dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</dt>
                <dd className="mt-1 text-navy-900">{lead.phone ? <a className="hover:text-flame-600" href={`tel:${lead.phone.replace(/[^\d+]/g, '')}`}>{lead.phone}</a> : <span className="text-slate-400">Not given</span>}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Interested in</dt>
                <dd className="mt-1 text-navy-900">{lead.interest}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Received</dt>
                <dd className="mt-1 text-navy-900">{fullDate(lead.createdAt)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Message</dt>
                <dd className="mt-1 whitespace-pre-wrap text-slate-700">{lead.message || <span className="text-slate-400">No message</span>}</dd>
              </div>
            </dl>
          </Card>

          <NotesCard parent="leads" parentId={id} visible={!!lead} team={team} user={user} role={role} emptyText="No notes yet. Log calls, emails and anything the next coach should know." />
        </div>

        <aside className="space-y-5">
          <Card title="Pipeline">
            <div className="space-y-4">
              <div className="flex items-center justify-between"><span className="text-sm text-slate-500">Now</span><StatusPill status={lead.status} /></div>
              <label className="block text-sm font-semibold text-navy-800">
                Status
                <select className="field" value={lead.status} onChange={(e) => run(setStatus(id, e.target.value as Status))}>
                  {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </label>
              {role === 'owner' ? (
              <label className="block text-sm font-semibold text-navy-800">
                Assigned to
                <select className="field" value={lead.assignedTo ?? ''} onChange={(e) => run(assign(id, e.target.value || null))}>
                  <option value="">Unassigned</option>
                  {team.map((m) => <option key={m.uid} value={m.uid}>{m.name}{m.uid === user.uid ? ' (me)' : ''}</option>)}
                  {lead.assignedTo && !names.has(lead.assignedTo) && <option value={lead.assignedTo}>Former team member</option>}
                </select>
                <span className="mt-1 block text-xs font-normal text-slate-500">Assigning to a coach shows it to them as new.</span>
              </label>
              ) : (
                <p className="text-sm text-slate-600">Assigned to <strong className="text-navy-900">you</strong> by Kate.</p>
              )}
              {lead.updatedBy && (
                <p className="text-xs text-slate-500">
                  Last updated {when(lead.updatedAt)} by {lead.updatedBy === user.uid ? 'you' : (names.get(lead.updatedBy) ?? (role === 'owner' ? 'a team member' : 'Kate'))}.
                </p>
              )}
            </div>
          </Card>
          <Card>
            <div className="flex flex-col gap-2">
              {lead.clientId ? (
                <a href={`#/clients/${lead.clientId}`} className="btn-primary !py-2 !text-base">View client</a>
              ) : (
                role === 'owner' && (
                  <button
                    type="button"
                    disabled={converting}
                    className="btn-primary !py-2 !text-base disabled:opacity-60"
                    onClick={async () => {
                      setConverting(true);
                      try {
                        const cid = await convertLead(lead);
                        window.location.hash = `#/clients/${cid}`;
                      } catch (e) {
                        setActionError((e as Error).message);
                        setConverting(false);
                      }
                    }}
                  >
                    {converting ? 'Creating client…' : 'Convert to client'}
                  </button>
                )
              )}
              <button type="button" className="btn-ghost !py-2 !text-base" onClick={() => run(markUnread(id)).then(() => (window.location.hash = '#/'))}>
                Mark unread
              </button>
              {role === 'owner' && (
                <button
                  type="button"
                  className="rounded-md px-5 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                  onClick={() => confirm(`Permanently delete ${lead.name}'s enquiry? Its notes are deleted too.`) && run(deleteLead(id)).then(() => (window.location.hash = '#/'))}
                >
                  Delete lead
                </button>
              )}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
