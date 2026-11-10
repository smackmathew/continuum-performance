// Inventory, and optionally clear out, data left in the Firebase project from
// its earlier use, so it can be used for Continuum Performance.
//
// Run by the "Firebase inventory & cleanup" GitHub workflow (Actions tab), which
// signs in with the FIREBASE_SERVICE_ACCOUNT secret. To run it yourself:
//   GOOGLE_APPLICATION_CREDENTIALS=key.json node scripts/firebase-cleanup.mjs [--delete-firestore] [--delete-auth-users] [--delete-storage]
//
// With no flags it only reports. The "leads" collection (contact-form
// submissions for this site) is never deleted.

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

const projectId = process.env.FIREBASE_PROJECT_ID || 'move-strong';
const KEEP = new Set(['leads']);
const flags = new Set(process.argv.slice(2));
const del = {
  firestore: flags.has('--delete-firestore'),
  auth: flags.has('--delete-auth-users'),
  storage: flags.has('--delete-storage'),
};

initializeApp({ credential: applicationDefault(), projectId });
const db = getFirestore();

console.log(`Project: ${projectId}`);
console.log(`Mode: ${Object.values(del).some(Boolean) ? 'DELETE ' + Object.keys(del).filter((k) => del[k]).join(', ') : 'inventory only (nothing is deleted)'}\n`);

// Firestore
console.log('== Firestore (default database)');
try {
  const cols = await db.listCollections();
  if (!cols.length) console.log('  (no collections)');
  for (const col of cols) {
    const count = (await col.count().get()).data().count;
    const keep = KEEP.has(col.id);
    console.log(`  ${col.id}: ${count} top-level document(s)${keep ? '  [kept: used by this site]' : ''}`);
    if (del.firestore && !keep) {
      await db.recursiveDelete(col);
      console.log(`    deleted ${col.id} and everything under it`);
    }
  }
} catch (err) {
  console.log(`  could not read Firestore: ${err.message}`);
}

// Authentication users
console.log('\n== Authentication users');
try {
  let total = 0;
  let pageToken;
  do {
    const page = await getAuth().listUsers(1000, pageToken);
    total += page.users.length;
    if (del.auth && page.users.length) {
      const res = await getAuth().deleteUsers(page.users.map((u) => u.uid));
      console.log(`  deleted ${res.successCount} user(s)${res.failureCount ? `, ${res.failureCount} failed` : ''}`);
    }
    pageToken = page.pageToken;
  } while (pageToken);
  console.log(`  ${total} user account(s) found`);
} catch (err) {
  console.log(`  could not read users: ${err.message}`);
}

// Cloud Storage (default Firebase bucket; newer projects use .firebasestorage.app)
console.log('\n== Cloud Storage');
let bucketFound = false;
for (const name of [`${projectId}.firebasestorage.app`, `${projectId}.appspot.com`]) {
  try {
    const bucket = getStorage().bucket(name);
    const [exists] = await bucket.exists();
    if (!exists) continue;
    bucketFound = true;
    const [files] = await bucket.getFiles({ maxResults: 1000 });
    console.log(`  ${name}: ${files.length}${files.length === 1000 ? '+' : ''} file(s)`);
    if (del.storage && files.length) {
      await bucket.deleteFiles({ force: true });
      console.log(`    deleted all files in ${name}`);
    }
  } catch (err) {
    bucketFound = true;
    console.log(`  ${name}: could not read (${err.message})`);
  }
}
if (!bucketFound) console.log('  (no default Storage bucket found)');
