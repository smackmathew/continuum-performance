// Runs the real leadAlert function against the Firestore emulator and a local
// stand-in for the Resend API. Run with: npm test (inside functions/).
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import functionsTest from 'firebase-functions-test';

process.env.GCLOUD_PROJECT = 'demo-continuum';
process.env.RESEND_API_KEY = 'test-key';
process.env.HUB_URL = 'https://continuum-performance.web.app/admin/';
process.env.ALERT_FROM = 'Continuum Performance <alerts@example.com>';

const sent = [];
let status = 200;
const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    sent.push({ auth: req.headers.authorization, body: JSON.parse(body) });
    res.writeHead(status, { 'content-type': 'application/json' }).end('{"id":"x"}');
  });
});

const fft = functionsTest({ projectId: 'demo-continuum' });
let leadAlert, db;

before(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  process.env.RESEND_API_URL = `http://127.0.0.1:${server.address().port}/emails`;
  ({ leadAlert } = await import('../index.js'));
  const { getFirestore } = await import('firebase-admin/firestore');
  db = getFirestore();
});
after(() => {
  server.close();
  fft.cleanup();
});
beforeEach(async () => {
  sent.length = 0;
  status = 200;
  for (const c of ['settings', 'team']) for (const d of (await db.collection(c).get()).docs) await d.ref.delete();
});

const lead = { name: 'Jordan Lee', email: 'jordan@example.com', phone: '555-0100', interest: 'Strength & Conditioning', message: 'Knee rehab', status: 'new' };
const fire = (data, id = 'lead123') =>
  fft.wrap(leadAlert)({ data: fft.firestore.makeDocumentSnapshot(data, `leads/${id}`), params: { leadId: id } });

test('emails the addresses in Settings, with a link to the lead and reply-to the visitor', async () => {
  await db.doc('settings/notifications').set({ leadAlertEmails: ['kate@example.com', 'front@example.com'] });
  await fire(lead);
  assert.equal(sent.length, 1);
  const { auth, body } = sent[0];
  assert.equal(auth, 'Bearer test-key');
  assert.deepEqual(body.to, ['kate@example.com', 'front@example.com']);
  assert.equal(body.from, 'Continuum Performance <alerts@example.com>');
  assert.equal(body.reply_to, 'jordan@example.com');
  assert.match(body.text, /https:\/\/continuum-performance\.web\.app\/admin\/#\/leads\/lead123/);
});

test('falls back to owners on the team when Settings has no list', async () => {
  await db.doc('team/kate').set({ name: 'Kate', email: 'Kate@Example.com', role: 'owner' });
  await db.doc('team/coach').set({ name: 'Coach', email: 'coach@example.com', role: 'staff' });
  await fire(lead);
  assert.deepEqual(sent[0].body.to, ['kate@example.com']);
});

test('sends nothing when there is nobody to tell', async () => {
  await fire(lead);
  assert.equal(sent.length, 0);
});

test('a failed send is logged, not thrown (no retry storm)', async () => {
  await db.doc('settings/notifications').set({ leadAlertEmails: ['kate@example.com'] });
  status = 500;
  await assert.doesNotReject(fire(lead));
  assert.equal(sent.length, 1);
});
