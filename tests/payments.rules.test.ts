import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc, Timestamp, updateDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;
beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-payments',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
afterAll(() => env.cleanup());

const days = (n: number) => Timestamp.fromMillis(Date.now() + n * 86400000);
const client = (extra: Record<string, unknown> = {}) => ({
  name: 'Jordan Lee', email: 'jordan@example.com', phone: '', assignedTo: 'coach', leadId: null, membership: '',
  checklist: {}, onboarding: { status: 'none' }, healthFlag: false,
  createdAt: Timestamp.now(), createdBy: 'kate', updatedAt: Timestamp.now(), updatedBy: 'kate', ...extra,
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'clients/c1'), client({ billing: { status: 'active', plan: 'small-group' } }));
    await setDoc(doc(db, 'clients/c1/payments/p1'), { amount: 18900 });
    await setDoc(doc(db, 'payLinks/open1'), { clientId: 'c1', firstName: 'Jordan', plan: 'small-group', status: 'open', createdAt: Timestamp.now(), createdBy: 'kate', expiresAt: days(30) });
  });
});

const visitor = () => env.unauthenticatedContext().firestore();
const coach = () => env.authenticatedContext('coach', { role: 'staff' }).firestore();
const owner = () => env.authenticatedContext('kate', { role: 'owner' }).firestore();
const link = (extra: Record<string, unknown> = {}) => ({
  clientId: 'c1', firstName: 'Jordan', plan: 'pt-8', status: 'open', createdAt: serverTimestamp(), createdBy: 'kate', expiresAt: days(30), ...extra,
});
const stamp = (uid: string) => ({ updatedAt: serverTimestamp(), updatedBy: uid });

describe('payment links', () => {
  it('only the owner creates them, for a real client and a known plan, expiring within 31 days', async () => {
    await assertSucceeds(setDoc(doc(owner(), 'payLinks/a'), link()));
    await assertFails(setDoc(doc(coach(), 'payLinks/b'), link({ createdBy: 'coach' })));
    await assertFails(setDoc(doc(visitor(), 'payLinks/c'), link()));
    await assertFails(setDoc(doc(owner(), 'payLinks/d'), link({ plan: 'free-forever' })));
    await assertFails(setDoc(doc(owner(), 'payLinks/e'), link({ clientId: 'nope' })));
    await assertFails(setDoc(doc(owner(), 'payLinks/f'), link({ expiresAt: days(90) })));
    await assertFails(setDoc(doc(owner(), 'payLinks/g'), link({ amount: 1 })));
  });

  it('anyone with the exact link can read it, nobody can list them', async () => {
    await assertSucceeds(getDoc(doc(visitor(), 'payLinks/open1')));
    await assertFails(getDocs(collection(visitor(), 'payLinks')));
    await assertFails(getDocs(collection(owner(), 'payLinks')));
  });

  it('only the owner can revoke; nobody in a browser can mark one used or change its plan', async () => {
    await assertFails(updateDoc(doc(visitor(), 'payLinks/open1'), { status: 'used' }));
    await assertFails(updateDoc(doc(owner(), 'payLinks/open1'), { plan: 'pt-8' }));
    await assertFails(updateDoc(doc(owner(), 'payLinks/open1'), { status: 'used' }));
    await assertFails(updateDoc(doc(coach(), 'payLinks/open1'), { status: 'revoked' }));
    await assertSucceeds(updateDoc(doc(owner(), 'payLinks/open1'), { status: 'revoked' }));
  });
});

describe('billing on clients', () => {
  it('the coach can see billing status; only the owner sees payment history', async () => {
    const c = await assertSucceeds(getDoc(doc(coach(), 'clients/c1')));
    expect(c.get('billing.status')).toBe('active');
    await assertFails(getDocs(collection(coach(), 'clients/c1/payments')));
    await assertSucceeds(getDocs(collection(owner(), 'clients/c1/payments')));
    await assertFails(setDoc(doc(owner(), 'clients/c1/payments/p2'), { amount: 1 }));
  });

  it('nobody can set or change billing from a browser, but other edits still work with billing present', async () => {
    await assertFails(updateDoc(doc(owner(), 'clients/c1'), { 'billing.status': 'canceled', ...stamp('kate') }));
    await assertFails(updateDoc(doc(owner(), 'clients/c1'), { source: 'website', ...stamp('kate') }));
    await assertFails(setDoc(doc(owner(), 'clients/c2'), client({ createdAt: serverTimestamp(), createdBy: 'kate', ...stamp('kate'), billing: { status: 'active' } })));
    await assertSucceeds(updateDoc(doc(owner(), 'clients/c1'), { membership: 'Small Group', ...stamp('kate') }));
    await assertSucceeds(updateDoc(doc(coach(), 'clients/c1'), { 'checklist.firstSession': serverTimestamp(), ...stamp('coach') }));
  });

  it('the owner can record the payment link sent to a client; a coach cannot', async () => {
    await assertSucceeds(updateDoc(doc(owner(), 'clients/c1'), { payLink: { id: 'open1', plan: 'small-group', sentAt: serverTimestamp() }, ...stamp('kate') }));
    await assertFails(updateDoc(doc(coach(), 'clients/c1'), { payLink: { id: 'x', plan: 'pt-8', sentAt: serverTimestamp() }, ...stamp('coach') }));
    await assertFails(updateDoc(doc(owner(), 'clients/c1'), { payLink: { id: 'x', amount: 1 }, ...stamp('kate') }));
  });
});
