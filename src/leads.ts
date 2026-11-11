// Saves a contact-form submission to Firestore (collection "leads").
// The Firebase SDK is loaded only when someone submits, so it doesn't slow
// down the first page load.

export type Lead = {
  name: string;
  email: string;
  phone: string;
  interest: string;
  message: string;
};

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined) || 'move-strong-fitness',
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

/** True when the site was built with Firebase settings, so leads can be saved. */
export const leadsEnabled = Boolean(config.apiKey);

const limits: Record<keyof Lead, number> = { name: 120, email: 200, phone: 40, interest: 80, message: 4000 };

export async function saveLead(lead: Lead): Promise<void> {
  const [{ initializeApp, getApps }, { getFirestore, collection, addDoc, serverTimestamp }] = await Promise.all([
    import('firebase/app'),
    import('firebase/firestore/lite'),
  ]);
  const app = getApps()[0] ?? initializeApp(config);
  const clean = Object.fromEntries(
    (Object.keys(limits) as (keyof Lead)[]).map((k) => [k, lead[k].trim().slice(0, limits[k])]),
  ) as Lead;
  await addDoc(collection(getFirestore(app), 'leads'), { ...clean, createdAt: serverTimestamp(), status: 'new' });
}
