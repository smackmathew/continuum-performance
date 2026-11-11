import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, Timestamp, updateDoc,
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
    await setDoc(doc(db, 'leads/lead1'), {
      name: 'Jordan Lee', email: 'jordan@example.com', phone: '', interest: 'Not sure yet',
      message: 'Hi', createdAt: Timestamp.now(), status: 'new',
    });
    await setDoc(doc(db, 'leads/lead1/notes/n1'), { text: 'Called', authorUid: 'coach', authorName: 'Coach', createdAt: Timestamp.now() });
    await setDoc(doc(db, 'team/kate'), { name: 'Kate', email: 'kate@example.com', role: 'owner' });
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
      await assertFails(getDocs(collection(db, 'leads')));
      await assertFails(updateDoc(doc(db, 'leads/lead1'), { status: 'contacted' }));
      await assertFails(deleteDoc(doc(db, 'leads/lead1')));
      await assertFails(getDocs(collection(db, 'leads/lead1/notes')));
      await assertFails(getDoc(doc(db, 'team/kate')));
    }
  });
});

describe('team: leads', () => {
  it('staff and owner can read leads', async () => {
    await assertSucceeds(getDocs(collection(staff(), 'leads')));
    await assertSucceeds(getDoc(doc(owner(), 'leads/lead1')));
  });

  it('staff can change status, assignee and read state', async () => {
    await assertSucceeds(updateDoc(doc(staff(), 'leads/lead1'), work('coach', { status: 'contacted', assignedTo: 'kate', readAt: serverTimestamp() })));
    await assertSucceeds(updateDoc(doc(staff(), 'leads/lead1'), work('coach', { readAt: null, assignedTo: null })));
  });

  it('rejects an unknown status, editing what the visitor sent, or a faked author/time', async () => {
    await assertFails(updateDoc(doc(staff(), 'leads/lead1'), work('coach', { status: 'vip' })));
    await assertFails(updateDoc(doc(staff(), 'leads/lead1'), work('coach', { email: 'other@example.com' })));
    await assertFails(updateDoc(doc(staff(), 'leads/lead1'), work('kate', { status: 'contacted' })));
    await assertFails(updateDoc(doc(staff(), 'leads/lead1'), { status: 'contacted', updatedAt: Timestamp.fromMillis(0), updatedBy: 'coach' }));
  });

  it('only the owner can delete a lead', async () => {
    await assertFails(deleteDoc(doc(staff(), 'leads/lead1')));
    await assertSucceeds(deleteDoc(doc(owner(), 'leads/lead1')));
  });
});

describe('team: notes', () => {
  const note = (uid: string, extra: Record<string, unknown> = {}) => ({ text: 'Left a voicemail', authorUid: uid, authorName: 'Coach', createdAt: serverTimestamp(), ...extra });

  it('team members can read and add notes as themselves', async () => {
    await assertSucceeds(getDocs(collection(staff(), 'leads/lead1/notes')));
    await assertSucceeds(addDoc(collection(staff(), 'leads/lead1/notes'), note('coach')));
  });

  it('rejects notes posted as someone else, empty, or edited later', async () => {
    await assertFails(addDoc(collection(staff(), 'leads/lead1/notes'), note('kate')));
    await assertFails(addDoc(collection(staff(), 'leads/lead1/notes'), note('coach', { text: '' })));
    await assertFails(updateDoc(doc(staff(), 'leads/lead1/notes/n1'), { text: 'changed' }));
  });

  it('authors and the owner can delete notes; other staff cannot', async () => {
    await assertFails(deleteDoc(doc(env.authenticatedContext('other', { role: 'staff' }).firestore(), 'leads/lead1/notes/n1')));
    await assertSucceeds(deleteDoc(doc(staff(), 'leads/lead1/notes/n1')));
  });
});

describe('team and settings', () => {
  it('team members can read the team list, but nobody can write it from a browser', async () => {
    await assertSucceeds(getDocs(collection(staff(), 'team')));
    await assertFails(setDoc(doc(owner(), 'team/coach'), { name: 'x', email: 'x@example.com', role: 'owner' }));
  });

  it('only the owner can change alert settings, with a valid shape', async () => {
    const settings = (uid: string, extra: Record<string, unknown> = {}) => ({ leadAlertEmails: ['kate@example.com'], updatedAt: serverTimestamp(), updatedBy: uid, ...extra });
    await assertFails(setDoc(doc(staff(), 'settings/notifications'), settings('coach')));
    await assertSucceeds(setDoc(doc(owner(), 'settings/notifications'), settings('kate')));
    await assertSucceeds(getDoc(doc(staff(), 'settings/notifications')));
    await assertFails(setDoc(doc(owner(), 'settings/notifications'), settings('kate', { leadAlertEmails: Array(11).fill('a@b.co') })));
    await assertFails(setDoc(doc(owner(), 'settings/notifications'), settings('kate', { extra: true })));
  });

  it('everything else stays closed', async () => {
    await assertFails(getDoc(doc(owner(), 'clients/abc')));
    await assertFails(setDoc(doc(owner(), 'clients/abc'), { a: 1 }));
  });
});
