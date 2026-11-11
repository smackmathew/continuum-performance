import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, Timestamp, updateDoc, where,
} from 'firebase/firestore';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-continuum',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
afterAll(() => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const base = { email: 'x@example.com', phone: '', interest: 'Not sure yet', message: 'Hi', createdAt: Timestamp.now(), status: 'new' };
    await setDoc(doc(db, 'leads/lead1'), { ...base, name: 'Jordan Lee', assignedTo: 'coach' });
    await setDoc(doc(db, 'leads/lead2'), { ...base, name: 'Unassigned Una' });
    await setDoc(doc(db, 'leads/lead3'), { ...base, name: 'Other Otto', assignedTo: 'other' });
    await setDoc(doc(db, 'leads/lead1/notes/n1'), { text: 'Called', authorUid: 'coach', authorName: 'Coach', createdAt: Timestamp.now() });
    await setDoc(doc(db, 'leads/lead3/notes/n3'), { text: 'Mine', authorUid: 'other', authorName: 'Other', createdAt: Timestamp.now() });
    await setDoc(doc(db, 'team/kate'), { name: 'Kate', email: 'kate@example.com', role: 'owner' });
    await setDoc(doc(db, 'team/coach'), { name: 'Coach', email: 'coach@example.com', role: 'staff' });
  });
});

const visitor = () => env.unauthenticatedContext().firestore();
const stranger = () => env.authenticatedContext('stranger').firestore();
const staff = () => env.authenticatedContext('coach', { role: 'staff' }).firestore();
const owner = () => env.authenticatedContext('kate', { role: 'owner' }).firestore();
const goodLead = () => ({
  name: 'Jordan Lee', email: 'jordan@example.com', phone: '', interest: 'Not sure yet',
  message: 'Coming back from a knee injury.', createdAt: serverTimestamp(), status: 'new',
});
const work = (uid: string, extra: Record<string, unknown> = {}) => ({ updatedAt: serverTimestamp(), updatedBy: uid, ...extra });

describe('public contact form', () => {
  it('lets a visitor submit a valid lead', async () => {
    await assertSucceeds(addDoc(collection(visitor(), 'leads'), goodLead()));
  });

  it('rejects missing, extra or oversized fields', async () => {
    const { phone: _omit, ...missing } = goodLead();
    await assertFails(addDoc(collection(visitor(), 'leads'), missing));
    await assertFails(addDoc(collection(visitor(), 'leads'), { ...goodLead(), isAdmin: true }));
    await assertFails(addDoc(collection(visitor(), 'leads'), { ...goodLead(), name: '' }));
    await assertFails(addDoc(collection(visitor(), 'leads'), { ...goodLead(), message: 'x'.repeat(4001) }));
  });

  it('rejects a bad email, a client-chosen time or a different status', async () => {
    await assertFails(addDoc(collection(visitor(), 'leads'), { ...goodLead(), email: 'not-an-email' }));
    await assertFails(addDoc(collection(visitor(), 'leads'), { ...goodLead(), createdAt: Timestamp.fromMillis(0) }));
    await assertFails(addDoc(collection(visitor(), 'leads'), { ...goodLead(), status: 'joined' }));
  });

  it('never lets a visitor or a signed-in non-member read, change or delete leads', async () => {
    for (const db of [visitor(), stranger()]) {
      await assertFails(getDoc(doc(db, 'leads/lead1')));
      await assertFails(getDoc(doc(db, 'leads/lead2')));
      await assertFails(getDocs(collection(db, 'leads')));
      await assertFails(updateDoc(doc(db, 'leads/lead1'), { status: 'contacted' }));
      await assertFails(deleteDoc(doc(db, 'leads/lead1')));
      await assertFails(getDocs(collection(db, 'leads/lead1/notes')));
      await assertFails(getDoc(doc(db, 'team/kate')));
      await assertFails(getDoc(doc(db, 'settings/notifications')));
    }
  });
});

describe('owner: leads', () => {
  it('sees every lead', async () => {
    const all = await assertSucceeds(getDocs(query(collection(owner(), 'leads'), orderBy('createdAt', 'desc'))));
    if (all.size !== 3) throw new Error(`expected 3 leads, got ${all.size}`);
  });

  it('assigns, works and deletes leads', async () => {
    await assertSucceeds(updateDoc(doc(owner(), 'leads/lead2'), work('kate', { assignedTo: 'coach', readAt: null })));
    await assertSucceeds(updateDoc(doc(owner(), 'leads/lead1'), work('kate', { status: 'assessment' })));
    await assertSucceeds(deleteDoc(doc(owner(), 'leads/lead3')));
  });

  it('still cannot edit what the visitor sent or fake the author/time', async () => {
    await assertFails(updateDoc(doc(owner(), 'leads/lead1'), work('kate', { email: 'other@example.com' })));
    await assertFails(updateDoc(doc(owner(), 'leads/lead1'), work('coach', { status: 'contacted' })));
    await assertFails(updateDoc(doc(owner(), 'leads/lead1'), work('kate', { status: 'vip' })));
  });
});

describe('coach (staff): leads', () => {
  it('sees only leads assigned to them', async () => {
    await assertSucceeds(getDoc(doc(staff(), 'leads/lead1')));
    await assertFails(getDoc(doc(staff(), 'leads/lead2')));
    await assertFails(getDoc(doc(staff(), 'leads/lead3')));
    const mine = await assertSucceeds(getDocs(query(collection(staff(), 'leads'), where('assignedTo', '==', 'coach'), orderBy('createdAt', 'desc'))));
    if (mine.size !== 1) throw new Error(`expected 1 lead, got ${mine.size}`);
    await assertFails(getDocs(collection(staff(), 'leads')));
  });

  it('can work their own lead: status and read state', async () => {
    await assertSucceeds(updateDoc(doc(staff(), 'leads/lead1'), work('coach', { status: 'contacted', readAt: serverTimestamp() })));
  });

  it('cannot reassign, claim, or touch other leads', async () => {
    await assertFails(updateDoc(doc(staff(), 'leads/lead1'), work('coach', { assignedTo: 'other' })));
    await assertFails(updateDoc(doc(staff(), 'leads/lead1'), work('coach', { assignedTo: null })));
    await assertFails(updateDoc(doc(staff(), 'leads/lead2'), work('coach', { assignedTo: 'coach' })));
    await assertFails(updateDoc(doc(staff(), 'leads/lead3'), work('coach', { status: 'contacted' })));
  });

  it('cannot delete leads', async () => {
    await assertFails(deleteDoc(doc(staff(), 'leads/lead1')));
  });
});

describe('notes', () => {
  const note = (uid: string, extra: Record<string, unknown> = {}) => ({ text: 'Left a voicemail', authorUid: uid, authorName: 'Coach', createdAt: serverTimestamp(), ...extra });

  it('a coach reads and adds notes only on their own leads', async () => {
    await assertSucceeds(getDocs(collection(staff(), 'leads/lead1/notes')));
    await assertSucceeds(addDoc(collection(staff(), 'leads/lead1/notes'), note('coach')));
    await assertFails(getDocs(collection(staff(), 'leads/lead3/notes')));
    await assertFails(addDoc(collection(staff(), 'leads/lead2/notes'), note('coach')));
  });

  it('rejects notes posted as someone else, empty, or edited later', async () => {
    await assertFails(addDoc(collection(staff(), 'leads/lead1/notes'), note('kate')));
    await assertFails(addDoc(collection(staff(), 'leads/lead1/notes'), note('coach', { text: '' })));
    await assertFails(updateDoc(doc(staff(), 'leads/lead1/notes/n1'), { text: 'changed' }));
  });

  it('the author can delete their note; the owner can delete any', async () => {
    await assertFails(deleteDoc(doc(staff(), 'leads/lead3/notes/n3')));
    await assertSucceeds(deleteDoc(doc(staff(), 'leads/lead1/notes/n1')));
    await assertSucceeds(deleteDoc(doc(owner(), 'leads/lead3/notes/n3')));
  });

  it('the owner reads and adds notes on any lead', async () => {
    await assertSucceeds(getDocs(collection(owner(), 'leads/lead3/notes')));
    await assertSucceeds(addDoc(collection(owner(), 'leads/lead2/notes'), note('kate', { authorName: 'Kate' })));
  });
});

describe('team and settings', () => {
  it('the owner reads the team list; a coach reads only their own record; nobody writes it from a browser', async () => {
    await assertSucceeds(getDocs(collection(owner(), 'team')));
    await assertSucceeds(getDoc(doc(staff(), 'team/coach')));
    await assertFails(getDoc(doc(staff(), 'team/kate')));
    await assertFails(getDocs(collection(staff(), 'team')));
    await assertFails(setDoc(doc(owner(), 'team/coach'), { name: 'x', email: 'x@example.com', role: 'owner' }));
    await assertFails(setDoc(doc(staff(), 'team/coach'), { name: 'x', email: 'x@example.com', role: 'owner' }));
  });

  it('only the owner can change alert settings, with a valid shape', async () => {
    const settings = (uid: string, extra: Record<string, unknown> = {}) => ({ leadAlertEmails: ['kate@example.com'], updatedAt: serverTimestamp(), updatedBy: uid, ...extra });
    await assertFails(setDoc(doc(staff(), 'settings/notifications'), settings('coach')));
    await assertSucceeds(setDoc(doc(owner(), 'settings/notifications'), settings('kate')));
    await assertFails(getDoc(doc(staff(), 'settings/notifications')));
    await assertSucceeds(getDoc(doc(owner(), 'settings/notifications')));
    await assertFails(setDoc(doc(owner(), 'settings/notifications'), settings('kate', { leadAlertEmails: Array(11).fill('a@b.co') })));
    await assertFails(setDoc(doc(owner(), 'settings/notifications'), settings('kate', { extra: true })));
  });

  it('everything else stays closed', async () => {
    await assertFails(getDoc(doc(owner(), 'payments/abc')));
    await assertFails(setDoc(doc(owner(), 'payments/abc'), { a: 1 }));
  });
});
