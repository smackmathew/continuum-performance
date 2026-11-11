import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, Timestamp, updateDoc, where, writeBatch,
  type Firestore,
} from 'firebase/firestore';

let env: RulesTestEnvironment;
beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-onboarding',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
afterAll(() => env.cleanup());

const days = (n: number) => Timestamp.fromMillis(Date.now() + n * 86400000);
const baseClient = (extra: Record<string, unknown> = {}) => ({
  name: 'Jordan Lee', email: 'jordan@example.com', phone: '', assignedTo: 'coach', leadId: null, membership: '',
  checklist: {}, onboarding: { status: 'none' }, healthFlag: false,
  createdAt: Timestamp.now(), createdBy: 'kate', updatedAt: Timestamp.now(), updatedBy: 'kate', ...extra,
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'clients/c1'), baseClient());
    await setDoc(doc(db, 'clients/c2'), baseClient({ name: 'Other', assignedTo: 'other' }));
    await setDoc(doc(db, 'leads/l1'), { name: 'Jordan Lee', email: 'jordan@example.com', phone: '', interest: 'x', message: '', createdAt: Timestamp.now(), status: 'joined', assignedTo: 'coach' });
    await setDoc(doc(db, 'invites/open1'), { clientId: 'c1', firstName: 'Jordan', status: 'open', createdAt: Timestamp.now(), createdBy: 'kate', expiresAt: days(14) });
    await setDoc(doc(db, 'invites/old1'), { clientId: 'c1', firstName: 'Jordan', status: 'open', createdAt: Timestamp.now(), createdBy: 'kate', expiresAt: days(-1) });
    await setDoc(doc(db, 'invites/other1'), { clientId: 'c2', firstName: 'Other', status: 'submitted', createdAt: Timestamp.now(), createdBy: 'kate', expiresAt: days(14), submittedAt: Timestamp.now() });
    await setDoc(doc(db, 'invites/other1/submission/form'), { about: { fullName: 'Other' } });
  });
});

const visitor = () => env.unauthenticatedContext().firestore();
const coach = () => env.authenticatedContext('coach', { role: 'staff' }).firestore();
const owner = () => env.authenticatedContext('kate', { role: 'owner' }).firestore();
const stamp = (uid: string) => ({ updatedAt: serverTimestamp(), updatedBy: uid });
const newClient = (uid: string, extra: Record<string, unknown> = {}) =>
  baseClient({ createdAt: serverTimestamp(), createdBy: uid, ...stamp(uid), ...extra });

const answers = () => ({
  about: { fullName: 'Jordan Lee', dob: '1990-04-02', email: 'jordan@example.com', phone: '555', emergencyName: 'Sam', emergencyPhone: '556' },
  goals: { goals: 'Get strong', experience: 'some', sport: '', injuries: 'Left knee', availability: ['Mon AM', 'Wed PM'], heardFrom: 'Friend' },
  health: { answers: { q1: false, q2: false, q3: true, q4: false, q5: false, q6: false, q7: false }, details: 'Knee surgery 2024' },
  waiver: { agreed: true, signedName: 'Jordan Lee', signer: 'self', version: 'draft-1' },
  submittedAt: serverTimestamp(), userAgent: 'test',
});
function submit(db: Firestore, token: string, data: Record<string, unknown> = answers()) {
  const b = writeBatch(db);
  b.set(doc(db, `invites/${token}/submission/form`), data);
  b.update(doc(db, `invites/${token}`), { status: 'submitted', submittedAt: serverTimestamp() });
  return b.commit();
}

describe('clients', () => {
  it('the owner sees all clients; a coach only their own', async () => {
    const all = await assertSucceeds(getDocs(query(collection(owner(), 'clients'), orderBy('createdAt', 'desc'))));
    expect(all.size).toBe(2);
    await assertSucceeds(getDoc(doc(coach(), 'clients/c1')));
    await assertFails(getDoc(doc(coach(), 'clients/c2')));
    const mine = await assertSucceeds(getDocs(query(collection(coach(), 'clients'), where('assignedTo', '==', 'coach'), orderBy('createdAt', 'desc'))));
    expect(mine.size).toBe(1);
    await assertFails(getDocs(collection(coach(), 'clients')));
    await assertFails(getDoc(doc(visitor(), 'clients/c1')));
  });

  it('only the owner creates clients, with a valid shape', async () => {
    await assertSucceeds(setDoc(doc(owner(), 'clients/new'), newClient('kate')));
    await assertFails(setDoc(doc(coach(), 'clients/new2'), newClient('coach')));
    await assertFails(setDoc(doc(owner(), 'clients/new3'), newClient('kate', { healthFlag: true })));
    await assertFails(setDoc(doc(owner(), 'clients/new4'), newClient('kate', { name: '' })));
    await assertFails(setDoc(doc(owner(), 'clients/new5'), newClient('kate', { email: 'nope' })));
    await assertFails(setDoc(doc(owner(), 'clients/new6'), newClient('kate', { checklist: { hacked: true } })));
    await assertFails(setDoc(doc(owner(), 'clients/new7'), newClient('kate', { extra: 1 })));
  });

  it('a coach can tick the checklist and record a link, but not reassign, rename or clear a health flag', async () => {
    await assertSucceeds(updateDoc(doc(coach(), 'clients/c1'), { 'checklist.assessmentBooked': serverTimestamp(), ...stamp('coach') }));
    await assertSucceeds(updateDoc(doc(coach(), 'clients/c1'), { onboarding: { inviteId: 'x', status: 'sent', sentAt: serverTimestamp() }, ...stamp('coach') }));
    await assertFails(updateDoc(doc(coach(), 'clients/c1'), { assignedTo: 'coach2', ...stamp('coach') }));
    await assertFails(updateDoc(doc(coach(), 'clients/c1'), { name: 'X', ...stamp('coach') }));
    await assertFails(updateDoc(doc(coach(), 'clients/c1'), { healthFlag: false, membership: 'Gold', ...stamp('coach') }));
    await assertFails(updateDoc(doc(coach(), 'clients/c2'), { 'checklist.firstSession': serverTimestamp(), ...stamp('coach') }));
    await assertFails(deleteDoc(doc(coach(), 'clients/c1')));
  });

  it('the owner manages everything except who created it and which lead it came from', async () => {
    await assertSucceeds(updateDoc(doc(owner(), 'clients/c1'), { assignedTo: 'other', membership: 'Small Group', healthFlag: false, ...stamp('kate') }));
    await assertFails(updateDoc(doc(owner(), 'clients/c1'), { leadId: 'l9', ...stamp('kate') }));
    await assertFails(updateDoc(doc(owner(), 'clients/c1'), { createdBy: 'x', ...stamp('kate') }));
    await assertFails(updateDoc(doc(owner(), 'clients/c1'), { membership: 'x' }));
    await assertSucceeds(deleteDoc(doc(owner(), 'clients/c2')));
  });

  it('client notes follow the client', async () => {
    const note = (uid: string) => ({ text: 'Assessment went well', authorUid: uid, authorName: 'X', createdAt: serverTimestamp() });
    await assertSucceeds(addDoc(collection(coach(), 'clients/c1/notes'), note('coach')));
    await assertFails(addDoc(collection(coach(), 'clients/c2/notes'), note('coach')));
    await assertFails(getDocs(collection(coach(), 'clients/c2/notes')));
    await assertSucceeds(getDocs(collection(owner(), 'clients/c2/notes')));
  });

  it('the owner can link a lead to its client; a coach cannot', async () => {
    await assertSucceeds(updateDoc(doc(owner(), 'leads/l1'), { clientId: 'c1', ...stamp('kate') }));
    await assertFails(updateDoc(doc(coach(), 'leads/l1'), { clientId: 'c2', ...stamp('coach') }));
  });
});

describe('onboarding links', () => {
  const invite = (uid: string, extra: Record<string, unknown> = {}) => ({
    clientId: 'c1', firstName: 'Jordan', status: 'open', createdAt: serverTimestamp(), createdBy: uid, expiresAt: days(14), ...extra,
  });

  it('the owner or the client’s coach creates a link; others cannot; expiry is capped', async () => {
    await assertSucceeds(setDoc(doc(owner(), 'invites/a'), invite('kate')));
    await assertSucceeds(setDoc(doc(coach(), 'invites/b'), invite('coach')));
    await assertFails(setDoc(doc(coach(), 'invites/c'), invite('coach', { clientId: 'c2' })));
    await assertFails(setDoc(doc(visitor(), 'invites/d'), invite('x')));
    await assertFails(setDoc(doc(owner(), 'invites/e'), invite('kate', { expiresAt: days(60) })));
    await assertFails(setDoc(doc(owner(), 'invites/f'), invite('kate', { status: 'submitted' })));
  });

  it('anyone with the exact link can open it, but links can never be listed', async () => {
    await assertSucceeds(getDoc(doc(visitor(), 'invites/open1')));
    await assertFails(getDocs(collection(visitor(), 'invites')));
    await assertFails(getDocs(collection(coach(), 'invites')));
  });

  it('the client submits once; the answers can’t be read back through the link', async () => {
    await assertSucceeds(submit(visitor(), 'open1'));
    const inv = await getDoc(doc(visitor(), 'invites/open1'));
    expect(inv.get('status')).toBe('submitted');
    await assertFails(getDoc(doc(visitor(), 'invites/open1/submission/form')));
    await assertFails(submit(visitor(), 'open1'));
    await assertFails(setDoc(doc(visitor(), 'invites/open1/submission/form'), answers()));
  });

  it('rejects expired or revoked links, missing signatures and extra fields', async () => {
    await assertFails(submit(visitor(), 'old1'));
    await assertFails(submit(visitor(), 'open1', { ...answers(), waiver: { agreed: false, signedName: 'J', signer: 'self', version: 'v' } }));
    await assertFails(submit(visitor(), 'open1', { ...answers(), waiver: { agreed: true, signedName: 'Jordan', signer: 'friend', version: 'v' } }));
    await assertFails(submit(visitor(), 'open1', { ...answers(), health: { answers: { q1: 'yes' }, details: '' } }));
    await assertFails(submit(visitor(), 'open1', { ...answers(), sneaky: true }));
    // Flipping the status without answers, or writing answers without flipping, both fail.
    await assertFails(updateDoc(doc(visitor(), 'invites/open1'), { status: 'submitted', submittedAt: serverTimestamp() }));
    await assertFails(setDoc(doc(visitor(), 'invites/open1/submission/form'), answers()));
    await assertSucceeds(updateDoc(doc(coach(), 'invites/open1'), { status: 'revoked' }));
    await assertFails(submit(visitor(), 'open1'));
  });

  it('only the owner and the client’s coach can read the answers', async () => {
    await assertSucceeds(submit(visitor(), 'open1'));
    await assertSucceeds(getDoc(doc(owner(), 'invites/open1/submission/form')));
    await assertSucceeds(getDoc(doc(coach(), 'invites/open1/submission/form')));
    await assertFails(getDoc(doc(coach(), 'invites/other1/submission/form')));
    await assertFails(getDoc(doc(env.authenticatedContext('stranger').firestore(), 'invites/open1/submission/form')));
    await assertFails(updateDoc(doc(owner(), 'invites/open1/submission/form'), { 'waiver.signedName': 'Forged' }));
  });
});
