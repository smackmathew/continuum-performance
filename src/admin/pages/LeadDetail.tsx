import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { User } from 'firebase/auth';
import { useLead, useNotes } from '../data';
import { addNote, assign, deleteLead, deleteNote, markRead, markUnread, setStatus } from '../actions';
import { STATUSES, type Role, type Status, type TeamMember } from '../types';
import { firstName, fullDate, when } from '../format';
import { Avatar, Card, ErrorNote, Spinner, StatusPill } from '../ui';

export function LeadDetail({ id, team, user, role }: { id: string; team: TeamMember[]; user: User; role: Role }) {
  const { data: lead, loading, error } = useLead(id);
  const notes = useNotes(id);
  const [actionError, setActionError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const autoRead = useRef(false);

  const run = (p: Promise<unknown>) => p.then(() => setActionError(null)).catch((e: Error) => setActionError(e.message));

  // Opening an unread lead marks it read (once per visit).
  useEffect(() => {
    if (lead && !lead.readAt && !autoRead.current) {
      autoRead.current = true;
      run(markRead(id));
    }
  }, [lead, id]);

  if (loading) return <Spinner />;
  if (!lead)
    return (
      <div className="space-y-4">
        <a href="#/" className="text-sm font-semibold text-flame-600">← Back to leads</a>
        <ErrorNote error={error} />
        {!error && <p className="text-slate-600">This lead doesn&apos;t exist any more.</p>}
      </div>
    );

  const names = new Map(team.map((m) => [m.uid, m.name]));
  const subject = encodeURIComponent('Your free assessment at Continuum Performance');
  const greeting = encodeURIComponent(`Hi ${firstName(lead.name)},\n\nThanks for reaching out to Continuum Performance!\n\n`);

  async function submitNote(e: FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setSaving(true);
    await run(addNote(id, note).then(() => setNote('')));
    setSaving(false);
  }

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

          <Card title={`Notes (${notes.data.length})`}>
            <ErrorNote error={notes.error} />
            {notes.data.length === 0 ? (
              <p className="text-sm text-slate-500">No notes yet. Log calls, emails and anything the next coach should know.</p>
            ) : (
              <ol className="space-y-4">
                {notes.data.map((n) => (
                  <li key={n.id} className="flex gap-3">
                    <Avatar name={n.authorName} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-semibold text-navy-900">{n.authorName}</span>{' '}
                        <span className="text-slate-400">· {when(n.createdAt)}</span>
                        {(n.authorUid === user.uid || role === 'owner') && (
                          <button type="button" onClick={() => confirm('Delete this note?') && run(deleteNote(id, n.id))} className="ml-2 text-xs text-slate-400 hover:text-red-700">
                            Delete
                          </button>
                        )}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-slate-700">{n.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <form onSubmit={submitNote} className="mt-5 border-t border-slate-100 pt-5">
              <label htmlFor="note" className="sr-only">Add a note</label>
              <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={5000} placeholder="Add a note…" className="field !mt-0 resize-y" />
              <div className="mt-2 flex justify-end">
                <button type="submit" disabled={saving || !note.trim()} className="btn-primary !py-2 !text-base disabled:opacity-50">
                  {saving ? 'Saving…' : 'Add note'}
                </button>
              </div>
            </form>
          </Card>
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
              <label className="block text-sm font-semibold text-navy-800">
                Assigned to
                <select className="field" value={lead.assignedTo ?? ''} onChange={(e) => run(assign(id, e.target.value || null))}>
                  <option value="">Unassigned</option>
                  {team.map((m) => <option key={m.uid} value={m.uid}>{m.name}{m.uid === user.uid ? ' (me)' : ''}</option>)}
                  {lead.assignedTo && !names.has(lead.assignedTo) && <option value={lead.assignedTo}>Former team member</option>}
                </select>
              </label>
              {lead.updatedBy && (
                <p className="text-xs text-slate-500">Last updated {when(lead.updatedAt)} by {names.get(lead.updatedBy) ?? 'a team member'}.</p>
              )}
            </div>
          </Card>
          <Card>
            <div className="flex flex-col gap-2">
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
