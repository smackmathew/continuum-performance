import { initializeApp } from 'firebase/app';
import { connectFirestoreEmulator, doc, getDoc, getFirestore, serverTimestamp, writeBatch, type Timestamp } from 'firebase/firestore/lite';
import { firebaseConfig, useEmulators } from '../firebase-config';

const app = initializeApp({ ...firebaseConfig, apiKey: firebaseConfig.apiKey || 'emulator' });
const db = getFirestore(app);
if (useEmulators) connectFirestoreEmulator(db, '127.0.0.1', 8080);

export type InviteState =
  | { kind: 'missing' }
  | { kind: 'expired' }
  | { kind: 'revoked' }
  | { kind: 'submitted' }
  | { kind: 'open'; firstName: string };

export async function loadInvite(token: string): Promise<InviteState> {
  if (!/^[A-Za-z0-9]{16,64}$/.test(token)) return { kind: 'missing' };
  const snap = await getDoc(doc(db, 'invites', token));
  if (!snap.exists()) return { kind: 'missing' };
  const d = snap.data() as { status: string; firstName: string; expiresAt: Timestamp };
  if (d.status === 'submitted') return { kind: 'submitted' };
  if (d.status === 'revoked') return { kind: 'revoked' };
  if (d.expiresAt.toMillis() < Date.now()) return { kind: 'expired' };
  return { kind: 'open', firstName: d.firstName };
}

export type Submission = {
  about: { fullName: string; dob: string; email: string; phone: string; emergencyName: string; emergencyPhone: string };
  goals: { goals: string; experience: string; sport: string; injuries: string; availability: string[]; heardFrom: string };
  health: { answers: Record<string, boolean>; details: string };
  waiver: { agreed: true; signedName: string; signer: 'self' | 'guardian'; version: string };
};

/** Saves the answers and closes the link in one step, so it can only happen once. */
export async function submitForms(token: string, s: Submission) {
  const batch = writeBatch(db);
  batch.set(doc(db, 'invites', token, 'submission', 'form'), {
    ...s,
    submittedAt: serverTimestamp(),
    userAgent: navigator.userAgent.slice(0, 400),
  });
  batch.update(doc(db, 'invites', token), { status: 'submitted', submittedAt: serverTimestamp() });
  await batch.commit();
}
