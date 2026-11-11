import { useState, type FormEvent } from 'react';
import type { User } from 'firebase/auth';
import { useNotes } from './data';
import { addNote, deleteNote } from './actions';
import type { Role, TeamMember } from './types';
import { when } from './format';
import { Avatar, Card, ErrorNote } from './ui';

/** The notes thread on a lead or a client page. */
export function NotesCard({ parent, parentId, visible, team, user, role, emptyText }: {
  parent: 'leads' | 'clients';
  parentId: string;
  /** False until the lead/client itself has loaded, to hide permission errors. */
  visible: boolean;
  team: TeamMember[];
  user: User;
  role: Role;
  emptyText: string;
}) {
  const notes = useNotes(parent, parentId);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = (p: Promise<unknown>) => p.then(() => setError(null)).catch((e: Error) => setError(e.message));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setSaving(true);
    await run(addNote(parent, parentId, note).then(() => setNote('')));
    setSaving(false);
  }

  return (
    <Card title={`Notes (${notes.data.length})`}>
      <ErrorNote error={visible ? notes.error || error : error} />
      {notes.data.length === 0 ? (
        <p className="text-sm text-slate-500">{emptyText}</p>
      ) : (
        <ol className="space-y-4">
          {notes.data.map((n) => (
            <li key={n.id} className="flex gap-3">
              <Avatar name={n.authorName} photoURL={team.find((m) => m.uid === n.authorUid)?.photoURL ?? (n.authorUid === user.uid ? user.photoURL : null)} />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-semibold text-navy-900">{n.authorName}</span>{' '}
                  <span className="text-slate-400">· {when(n.createdAt)}</span>
                  {(n.authorUid === user.uid || role === 'owner') && (
                    <button type="button" onClick={() => confirm('Delete this note?') && run(deleteNote(parent, parentId, n.id))} className="ml-2 text-xs text-slate-400 hover:text-red-700">
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
      <form onSubmit={submit} className="mt-5 border-t border-slate-100 pt-5">
        <label htmlFor="note" className="sr-only">Add a note</label>
        <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={5000} placeholder="Add a note…" className="field !mt-0 resize-y" />
        <div className="mt-2 flex justify-end">
          <button type="submit" disabled={saving || !note.trim()} className="btn-primary !py-2 !text-base disabled:opacity-50">
            {saving ? 'Saving…' : 'Add note'}
          </button>
        </div>
      </form>
    </Card>
  );
}
