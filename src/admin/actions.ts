import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { auth, db } from './firebase';
import { Timestamp } from 'firebase/firestore';
import type { ChecklistStep, Client, Lead, Status } from './types';

const stamp = () => ({ updatedAt: serverTimestamp(), updatedBy: auth.currentUser!.uid });

export const setStatus = (id: string, status: Status) => updateDoc(doc(db, 'leads', id), { status, ...stamp() });
/** Owner only. Assigning to someone else marks it unread, so it shows as new for them. */
export const assign = (id: string, uid: string | null) =>
  updateDoc(doc(db, 'leads', id), {
    assignedTo: uid,
    ...(uid && uid !== auth.currentUser!.uid ? { readAt: null } : {}),
    ...stamp(),
  });
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

export const addNote = (parent: 'leads' | 'clients', parentId: string, text: string) => {
  const u = auth.currentUser!;
  return addDoc(collection(db, parent, parentId, 'notes'), {
    text: text.trim().slice(0, 5000),
    authorUid: u.uid,
    authorName: (u.displayName || u.email || 'Team member').slice(0, 120),
    createdAt: serverTimestamp(),
  });
};
export const deleteNote = (parent: 'leads' | 'clients', parentId: string, noteId: string) => deleteDoc(doc(db, parent, parentId, 'notes', noteId));

export const saveAlertEmails = (emails: string[]) =>
  setDoc(doc(db, 'settings', 'notifications'), { leadAlertEmails: emails.slice(0, 10), ...stamp() });

// ---- Clients ---------------------------------------------------------------

type NewClient = { name: string; email: string; phone: string; assignedTo: string | null };

const clientFields = (c: NewClient, leadId: string | null) => ({
  name: c.name.trim().slice(0, 120),
  email: c.email.trim().toLowerCase().slice(0, 200),
  phone: c.phone.trim().slice(0, 40),
  assignedTo: c.assignedTo,
  leadId,
  membership: '',
  checklist: {},
  onboarding: { status: 'none' },
  healthFlag: false,
  createdAt: serverTimestamp(),
  createdBy: auth.currentUser!.uid,
  ...stamp(),
});

/** Owner only. Returns the new client's id. */
export async function createClient(c: NewClient) {
  const ref = doc(collection(db, 'clients'));
  await setDoc(ref, clientFields(c, null));
  return ref.id;
}

/** Owner only: makes a client from a lead (same coach) and links the two. */
export async function convertLead(lead: Lead) {
  const ref = doc(collection(db, 'clients'));
  const batch = writeBatch(db);
  batch.set(ref, clientFields({ name: lead.name, email: lead.email, phone: lead.phone, assignedTo: lead.assignedTo ?? null }, lead.id));
  batch.update(doc(db, 'leads', lead.id), { clientId: ref.id, status: 'joined', ...stamp() });
  await batch.commit();
  return ref.id;
}

export const tickStep = (clientId: string, step: ChecklistStep, done: boolean) =>
  updateDoc(doc(db, 'clients', clientId), { [`checklist.${step}`]: done ? serverTimestamp() : null, ...stamp() });

/** Owner only. */
export const updateClient = (clientId: string, fields: Partial<Pick<Client, 'name' | 'email' | 'phone' | 'assignedTo' | 'membership' | 'healthFlag'>>) =>
  updateDoc(doc(db, 'clients', clientId), { ...fields, ...stamp() });

/** Owner only: deletes the client and its notes (submitted forms stay under their link). */
export async function deleteClient(id: string) {
  const notes = await getDocs(collection(db, 'clients', id, 'notes'));
  const batch = writeBatch(db);
  notes.forEach((n) => batch.delete(n.ref));
  batch.delete(doc(db, 'clients', id));
  await batch.commit();
}

const LINK_DAYS = 14;

/** Creates a private onboarding link (valid 14 days) and records it on the client. */
export async function createInvite(client: Client) {
  const ref = doc(collection(db, 'invites')); // 20-character random id = the private token
  const batch = writeBatch(db);
  batch.set(ref, {
    clientId: client.id,
    firstName: client.name.trim().split(/\s+/)[0].slice(0, 60),
    status: 'open',
    createdAt: serverTimestamp(),
    createdBy: auth.currentUser!.uid,
    expiresAt: Timestamp.fromMillis(Date.now() + LINK_DAYS * 86400000),
  });
  batch.update(doc(db, 'clients', client.id), {
    onboarding: { inviteId: ref.id, status: 'sent', sentAt: serverTimestamp(), submittedAt: null },
    ...stamp(),
  });
  await batch.commit();
  return ref.id;
}

export async function revokeInvite(client: Client) {
  const batch = writeBatch(db);
  batch.update(doc(db, 'invites', client.onboarding.inviteId!), { status: 'revoked' });
  batch.update(doc(db, 'clients', client.id), { onboarding: { ...client.onboarding, status: 'revoked' }, ...stamp() });
  await batch.commit();
}

export const inviteUrl = (token: string) => `${window.location.origin}/start/?t=${token}`;

// ---- Payments (owner only) ------------------------------------------------------

const PAY_LINK_DAYS = 30;

/** Creates a private payment link for a plan and records it on the client. */
export async function createPayLink(client: Client, plan: string) {
  const ref = doc(collection(db, 'payLinks'));
  const batch = writeBatch(db);
  batch.set(ref, {
    clientId: client.id,
    firstName: client.name.trim().split(/\s+/)[0].slice(0, 60),
    plan,
    status: 'open',
    createdAt: serverTimestamp(),
    createdBy: auth.currentUser!.uid,
    expiresAt: Timestamp.fromMillis(Date.now() + PAY_LINK_DAYS * 86400000),
  });
  batch.update(doc(db, 'clients', client.id), { payLink: { id: ref.id, plan, sentAt: serverTimestamp() }, ...stamp() });
  await batch.commit();
  return ref.id;
}

export const revokePayLink = (id: string) => updateDoc(doc(db, 'payLinks', id), { status: 'revoked' });

export const payUrl = (token: string) => `${window.location.origin}/pay/?t=${token}`;
