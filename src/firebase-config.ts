// Firebase web settings, shared by the public site (contact form) and the admin hub.
// These values are public by design; Firestore security rules protect the data.
const projectId = (import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined) || 'move-strong-fitness';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  projectId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined) || `${projectId}.firebaseapp.com`,
};

/** Local development/testing against the Firebase emulators (npm run dev:emulators). */
export const useEmulators = import.meta.env.VITE_USE_EMULATORS === '1';
