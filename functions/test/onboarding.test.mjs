// Runs the real onboardingSubmitted function against the Firestore emulator
// and a local stand-in for the Resend API.
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import functionsTest from 'firebase-functions-test';

process.env.GCLOUD_PROJECT = 'demo-continuum';
process.env.RESEND_API_KEY = 'test-key';
process.env.HUB_URL = 'https://continuum-performance.web.app/admin/';
process.env.ALERT_FROM = 'Continuum Performance <alerts@example.com>';

const sent = [];
const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    sent.push(JSON.parse(body));
    res.writeHead(200, { 'content-type': 'application/json' }).end('{"id":"x"}');
  });
});
const fft = functionsTest({ projectId: 'demo-continuum' });
let onboardingSubmitted, db;

before(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  process.env.RESEND_API_URL = `http://127.0.0.1:${server.address().port}/emails`;
  ({ onboardingSubmitted } = await import('../index.js'));
  const { getFirestore } = await import('firebase-admin/firestore');
  db = getFirestore();
});
after(() => {
  server.close();
  fft.cleanup();
});
beforeEach(async () => {
  sent.length = 0;
  for (const c of ['settings', 'team', 'clients', 'invites']) for (const d of (await db.collection(c).get()).docs) await d.ref.delete();
  await db.doc('team/kate').set({ name: 'Kate', email: 'kate@example.com', role: 'owner' });
  await db.doc('team/alex').set({ name: 'Alex', email: 'alex@example.com', role: 'staff' });
  await db.doc('clients/c1').set({
    name: 'Jordan Lee', email: '', phone: '', assignedTo: 'alex', leadId: null, membership: '',
    checklist: { assessmentBooked: new Date() }, onboarding: { inviteId: 'tok123', status: 'sent' }, healthFlag: false,
  });
  await db.doc('invites/tok123').set({ clientId: 'c1', firstName: 'Jordan', status: 'submitted' });
});

const form = (yes) => ({
  about: { fullName: 'Jordan Lee' }, goals: {}, waiver: { agreed: true, signedName: 'Jordan Lee', signer: 'self', version: 'v' },
  health: { answers: { q1: false, q2: yes, q3: yes, q4: false, q5: false, q6: false, q7: false }, details: yes ? 'Knee' : '' },
});
const fire = (data) =>
  fft.wrap(onboardingSubmitted)({ data: fft.firestore.makeDocumentSnapshot(data, 'invites/tok123/submission/form'), params: { token: 'tok123', docId: 'form' } });

test('ticks the intake and health/waiver steps, flags "yes" answers and emails Kate and the coach', async () => {
  await fire(form(true));
  const c = (await db.doc('clients/c1').get()).data();
  assert.ok(c.checklist.intake && c.checklist.healthWaiver, 'both steps ticked');
  assert.ok(c.checklist.assessmentBooked, 'existing ticks kept');
  assert.equal(c.onboarding.status, 'submitted');
  assert.equal(c.healthFlag, true);
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].to, ['kate@example.com', 'alex@example.com']);
  assert.match(sent[0].subject, /health check needed/);
  assert.doesNotMatch(sent[0].html + sent[0].text, /Knee/, 'no health details in the email');
});

test('all "no" answers leave the health flag off', async () => {
  await fire(form(false));
  const c = (await db.doc('clients/c1').get()).data();
  assert.equal(c.healthFlag, false);
  assert.equal(sent[0].subject, 'Forms in: Jordan Lee');
});

test('a submission for a deleted client changes nothing and sends nothing', async () => {
  await db.doc('clients/c1').delete();
  await fire(form(true));
  assert.equal((await db.doc('clients/c1').get()).exists, false);
  assert.equal(sent.length, 0);
});
