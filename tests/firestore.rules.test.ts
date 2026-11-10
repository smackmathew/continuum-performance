import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { addDoc, collection, doc, getDoc, getDocs, serverTimestamp, setDoc, Timestamp, updateDoc, deleteDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-continuum',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
afterAll(() => env.cleanup());
beforeEach(() => env.clearFirestore());

const visitor = () => env.unauthenticatedContext().firestore();
const signedIn = () => env.authenticatedContext('someone').firestore();
const good = () => ({
  name: 'Jordan Lee',
  email: 'jordan@example.com',
  phone: '',
  interest: 'Not sure yet',
  message: 'Coming back from a knee injury.',
  createdAt: serverTimestamp(),
  status: 'new',
});

describe('leads', () => {
  it('lets a visitor submit a valid lead', async () => {
    await assertSucceeds(addDoc(collection(visitor(), 'leads'), good()));
  });

  it('rejects missing, extra or oversized fields', async () => {
    const { phone: _omit, ...missing } = good();
    await assertFails(addDoc(collection(visitor(), 'leads'), missing));
    await assertFails(addDoc(collection(visitor(), 'leads'), { ...good(), isAdmin: true }));
    await assertFails(addDoc(collection(visitor(), 'leads'), { ...good(), name: '' }));
    await assertFails(addDoc(collection(visitor(), 'leads'), { ...good(), message: 'x'.repeat(4001) }));
  });

  it('rejects a bad email, a client-chosen time or a different status', async () => {
    await assertFails(addDoc(collection(visitor(), 'leads'), { ...good(), email: 'not-an-email' }));
    await assertFails(addDoc(collection(visitor(), 'leads'), { ...good(), createdAt: Timestamp.fromMillis(0) }));
    await assertFails(addDoc(collection(visitor(), 'leads'), { ...good(), status: 'contacted' }));
  });

  it('never lets a browser read, change or delete leads, even when signed in', async () => {
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'leads/existing'), { name: 'x' }));
    for (const db of [visitor(), signedIn()]) {
      await assertFails(getDoc(doc(db, 'leads/existing')));
      await assertFails(getDocs(collection(db, 'leads')));
      await assertFails(updateDoc(doc(db, 'leads/existing'), { status: 'contacted' }));
      await assertFails(deleteDoc(doc(db, 'leads/existing')));
    }
  });
});

describe('everything else', () => {
  it('is closed to reads and writes', async () => {
    await assertFails(getDoc(doc(signedIn(), 'users/abc')));
    await assertFails(setDoc(doc(visitor(), 'users/abc'), { a: 1 }));
  });
});
