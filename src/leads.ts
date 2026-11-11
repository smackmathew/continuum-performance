// Saves a contact-form submission to Firestore (collection "leads").
// The Firebase SDK is loaded only when someone submits, so it doesn't slow
// down the first page load.

import { firebaseConfig as config, useEmulators } from './firebase-config';

export type Lead = {
  name: string;
  email: string;
  phone: string;
  interest: string;
  message: string;
};

/** True when the site was built with Firebase settings, so leads can be saved. */
export const leadsEnabled = Boolean(config.apiKey) || useEmulators;

const limits: Record<keyof Lead, number> = { name: 120, email: 200, phone: 40, interest: 80, message: 4000 };

export async function saveLead(lead: Lead): Promise<void> {
  const [{ initializeApp, getApps }, { getFirestore, connectFirestoreEmulator, collection, addDoc, serverTimestamp }] = await Promise.all([
    import('firebase/app'),
    import('firebase/firestore/lite'),
  ]);
  const fresh = getApps().length === 0;
  const app = getApps()[0] ?? initializeApp({ ...config, apiKey: config.apiKey || 'emulator' });
  const db = getFirestore(app);
  if (fresh && useEmulators) connectFirestoreEmulator(db, '127.0.0.1', 8080);
  const clean = Object.fromEntries(
    (Object.keys(limits) as (keyof Lead)[]).map((k) => [k, lead[k].trim().slice(0, limits[k])]),
  ) as Lead;
  await addDoc(collection(db, 'leads'), { ...clean, createdAt: serverTimestamp(), status: 'new' });
}
