// Gives someone access to the team hub, changes their role, or removes them.
// Run by the "Team access" GitHub workflow (Actions tab). The person must have
// signed in to /admin once with Google first, so their account exists.
//
//   node scripts/team-access.mjs <email> <owner|staff|remove> [display name]

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const [email, action, ...nameParts] = process.argv.slice(2);
const projectId = process.env.FIREBASE_PROJECT_ID || 'move-strong-fitness';

if (!email || !['owner', 'staff', 'remove'].includes(action)) {
  console.error('Usage: node scripts/team-access.mjs <email> <owner|staff|remove> [display name]');
  process.exit(2);
}

initializeApp({ credential: applicationDefault(), projectId });
const auth = getAuth();
const db = getFirestore();

let user;
try {
  user = await auth.getUserByEmail(email.trim().toLowerCase());
} catch (err) {
  if (err.code === 'auth/user-not-found') {
    console.error(`No account for ${email} yet. Ask them to open /admin and sign in with Google once, then run this again.`);
    process.exit(1);
  }
  throw err;
}

if (action === 'remove') {
  await auth.setCustomUserClaims(user.uid, { ...(user.customClaims ?? {}), role: null });
  await auth.revokeRefreshTokens(user.uid); // signs them out everywhere within the hour
  await db.doc(`team/${user.uid}`).delete();
  console.log(`Removed ${user.email} from the team. They have been signed out.`);
} else {
  if (action === 'staff') {
    const owners = await db.collection('team').where('role', '==', 'owner').get();
    if (owners.size === 1 && owners.docs[0].id === user.uid) {
      console.error(`${user.email} is the only owner. Make someone else an owner first.`);
      process.exit(1);
    }
  }
  const name = nameParts.join(' ').trim() || user.displayName || user.email.split('@')[0];
  await auth.setCustomUserClaims(user.uid, { ...(user.customClaims ?? {}), role: action });
  await db.doc(`team/${user.uid}`).set({ name, email: user.email, role: action, photoURL: user.photoURL ?? null });
  console.log(`${user.email} is now ${action === 'owner' ? 'an owner' : 'staff'} (shown as "${name}"). They can press "Check again" in the hub, or sign out and back in.`);
}

// List the team for the log.
const team = await db.collection('team').orderBy('name').get();
console.log('\nTeam now:');
for (const d of team.docs) console.log(`  ${d.get('name')} <${d.get('email')}>: ${d.get('role')}`);
