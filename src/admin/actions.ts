import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { Status } from './types';

const stamp = () => ({ updatedAt: serverTimestamp(), updatedBy: auth.currentUser!.uid });

export const setStatus = (id: string, status: Status) => updateDoc(doc(db, 'leads', id), { status, ...stamp() });
export const assign = (id: string, uid: string | null) => updateDoc(doc(db, 'leads', id), { assignedTo: uid, ...stamp() });
export const markRead = (id: string) => updateDoc(doc(db, 'leads', id), { readAt: serverTimestamp(), ...stamp() });
export const markUnread = (id: string) => updateDoc(doc(db, 'leads', id), { readAt: null, ...stamp() });
/** Owner only: deletes the lead and its notes together. */
export async function deleteLead(id: string) {
  const notes = await getDocs(collection(db, 'leads', id, 'notes'));
  const batch = writeBatch(db);
  notes.forEach((n) => batch.delete(n.ref));
  batch.delete(doc(db, 'leads', id));
  await batch.commit();
}

export const addNote = (leadId: string, text: string) => {
  const u = auth.currentUser!;
  return addDoc(collection(db, 'leads', leadId, 'notes'), {
    text: text.trim().slice(0, 5000),
    authorUid: u.uid,
    authorName: (u.displayName || u.email || 'Team member').slice(0, 120),
    createdAt: serverTimestamp(),
  });
};
export const deleteNote = (leadId: string, noteId: string) => deleteDoc(doc(db, 'leads', leadId, 'notes', noteId));

export const saveAlertEmails = (emails: string[]) =>
  setDoc(doc(db, 'settings', 'notifications'), { leadAlertEmails: emails.slice(0, 10), ...stamp() });
