// Runs the real startCheckout and stripeWebhook functions against the Firestore
// emulator, a local stand-in for the Stripe API, and a stand-in for Resend.
import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import Stripe from 'stripe';
import functionsTest from 'firebase-functions-test';

process.env.GCLOUD_PROJECT = 'demo-continuum';
process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
process.env.RESEND_API_KEY = 'test-key';
process.env.ALERT_FROM = 'CP <alerts@example.com>';
process.env.HUB_URL = 'https://continuum-performance.web.app/admin/';
process.env.SITE_URL = 'https://continuum-performance.web.app';

const listen = (srv) => new Promise((r) => srv.listen(0, '127.0.0.1', () => r(srv.address().port)));
const stripeCalls = [];
const fakeStripe = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    stripeCalls.push({ method: req.method, path: req.url, auth: req.headers.authorization, form: new URLSearchParams(body) });
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ id: 'cs_test_1', object: 'checkout.session', url: 'https://checkout.stripe.test/cs_test_1' }));
  });
});
const emails = [];
const fakeResend = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    emails.push(JSON.parse(body));
    res.writeHead(200).end('{"id":"e"}');
  });
});

const fft = functionsTest({ projectId: 'demo-continuum' });
let base, db, server, signer;

before(async () => {
  process.env.STRIPE_API_HOST = '127.0.0.1';
  process.env.STRIPE_API_PORT = String(await listen(fakeStripe));
  process.env.RESEND_API_URL = `http://127.0.0.1:${await listen(fakeResend)}/emails`;
  const fns = await import('../index.js');
  const app = express();
  app.use(express.raw({ type: '*/*' }), (req, _res, next) => {
    req.rawBody = req.body;
    try { req.body = JSON.parse(req.body.toString() || '{}'); } catch { req.body = {}; }
    next();
  });
  app.all('/startCheckout', (req, res) => fns.startCheckout(req, res));
  app.all('/stripeWebhook', (req, res) => fns.stripeWebhook(req, res));
  server = http.createServer(app);
  base = `http://127.0.0.1:${await listen(server)}`;
  const { getFirestore } = await import('firebase-admin/firestore');
  db = getFirestore();
  signer = new Stripe('sk_test_fake');
});
after(() => {
  for (const s of [fakeStripe, fakeResend, server]) s.close();
  fft.cleanup();
});
beforeEach(async () => {
  stripeCalls.length = 0;
  emails.length = 0;
  for (const c of ['clients', 'payLinks', 'stripeEvents', 'team', 'settings']) {
    for (const d of (await db.collection(c).get()).docs) await db.recursiveDelete(d.ref);
  }
  await db.doc('team/kate').set({ name: 'Kate', email: 'kate@example.com', role: 'owner' });
  await db.doc('clients/c1').set({
    name: 'Jordan Lee', email: 'jordan@example.com', phone: '', assignedTo: 'alex', leadId: null, membership: '',
    checklist: { assessmentDone: new Date() }, onboarding: { status: 'submitted' }, healthFlag: false,
  });
});

const post = (path, body, headers = {}) =>
  fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
const later = (days) => new Date(Date.now() + days * 86400000);
const sendEvent = (type, object, id = `evt_${Math.random().toString(36).slice(2)}`) => {
  const payload = JSON.stringify({ id, object: 'event', type, data: { object } });
  const header = signer.webhooks.generateTestHeaderString({ payload, secret: 'whsec_test_secret' });
  return post('/stripeWebhook', payload, { 'stripe-signature': header });
};

describe('startCheckout', () => {
  test('a website Join button starts a monthly subscription at the plan price', async () => {
    const res = await post('/startCheckout', { plan: 'small-group' });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).url, 'https://checkout.stripe.test/cs_test_1');
    const { path, auth, form } = stripeCalls[0];
    assert.equal(path, '/v1/checkout/sessions');
    assert.equal(auth, 'Bearer sk_test_fake');
    assert.equal(form.get('mode'), 'subscription');
    assert.equal(form.get('line_items[0][price_data][unit_amount]'), '18900');
    assert.equal(form.get('line_items[0][price_data][recurring][interval]'), 'month');
    assert.equal(form.get('metadata[plan]'), 'small-group');
    assert.equal(form.get('metadata[source]'), 'website');
    assert.equal(form.get('phone_number_collection[enabled]'), 'true');
    assert.equal(form.get('client_reference_id'), null);
    assert.match(form.get('success_url'), /^https:\/\/continuum-performance\.web\.app\/pay\/\?status=success/);
  });

  test('rejects unknown plans and non-POST requests, and never takes a price from the request', async () => {
    assert.equal((await post('/startCheckout', { plan: 'free-forever' })).status, 400);
    assert.equal((await fetch(base + '/startCheckout')).status, 405);
    await post('/startCheckout', { plan: 'open-gym', amount: 1, unit_amount: 1 });
    assert.equal(stripeCalls[0].form.get('line_items[0][price_data][unit_amount]'), '8900');
  });

  test('a hub payment link charges its own plan to that client, ignoring any plan in the request', async () => {
    await db.doc('payLinks/tokOpen1234567890ab').set({ clientId: 'c1', firstName: 'Jordan', plan: 'pt-8', status: 'open', expiresAt: later(30) });
    const res = await post('/startCheckout', { token: 'tokOpen1234567890ab', plan: 'open-gym' });
    assert.equal(res.status, 200);
    const { form } = stripeCalls[0];
    assert.equal(form.get('mode'), 'payment');
    assert.equal(form.get('line_items[0][price_data][unit_amount]'), '60000');
    assert.equal(form.get('client_reference_id'), 'c1');
    assert.equal(form.get('customer_email'), 'jordan@example.com');
    assert.equal(form.get('metadata[payLink]'), 'tokOpen1234567890ab');
    assert.equal(form.get('customer_creation'), 'always');
  });

  test('used, revoked, expired and unknown links are refused', async () => {
    await db.doc('payLinks/tokUsed1234567890ab').set({ clientId: 'c1', firstName: 'J', plan: 'pt-8', status: 'used', expiresAt: later(30) });
    await db.doc('payLinks/tokOld12345678901ab').set({ clientId: 'c1', firstName: 'J', plan: 'pt-8', status: 'open', expiresAt: later(-1) });
    assert.equal((await post('/startCheckout', { token: 'tokUsed1234567890ab' })).status, 410);
    assert.equal((await post('/startCheckout', { token: 'tokOld12345678901ab' })).status, 410);
    assert.equal((await post('/startCheckout', { token: 'tokMissing123456789' })).status, 404);
    assert.equal((await post('/startCheckout', { token: '../../etc' })).status, 404);
    assert.equal(stripeCalls.length, 0);
  });
});

describe('stripeWebhook', () => {
  const session = (extra = {}) => ({
    id: 'cs_1', object: 'checkout.session', mode: 'subscription', payment_status: 'paid', customer: 'cus_1', subscription: 'sub_1',
    invoice: 'in_1', amount_total: 18900, currency: 'usd', livemode: false, created: 1762800000,
    customer_details: { email: 'jordan@example.com', name: 'Jordan Lee', phone: null },
    client_reference_id: 'c1', metadata: { plan: 'small-group', clientId: 'c1', payLink: 'tokOpen1234567890ab', source: 'link' }, ...extra,
  });

  test('rejects events without a valid Stripe signature and changes nothing', async () => {
    const payload = JSON.stringify({ id: 'evt_x', type: 'checkout.session.completed', data: { object: session() } });
    assert.equal((await post('/stripeWebhook', payload, { 'stripe-signature': 't=1,v1=forged' })).status, 400);
    assert.equal((await post('/stripeWebhook', payload)).status, 400);
    assert.equal((await db.doc('clients/c1').get()).get('billing'), undefined);
  });

  test('a paid hub link sets billing and membership, ticks the checklist, records the payment and emails Kate', async () => {
    await db.doc('payLinks/tokOpen1234567890ab').set({ clientId: 'c1', firstName: 'Jordan', plan: 'small-group', status: 'open', expiresAt: later(30) });
    const res = await sendEvent('checkout.session.completed', session(), 'evt_1');
    assert.equal(res.status, 200);
    const c = (await db.doc('clients/c1').get()).data();
    assert.equal(c.billing.status, 'active');
    assert.equal(c.billing.plan, 'small-group');
    assert.equal(c.billing.customerId, 'cus_1');
    assert.equal(c.billing.subscriptionId, 'sub_1');
    assert.equal(c.membership, 'Small Group');
    assert.ok(c.checklist.membership && c.checklist.assessmentDone, 'membership ticked, other ticks kept');
    const pays = await db.collection('clients/c1/payments').get();
    assert.deepEqual(pays.docs.map((d) => [d.id, d.get('amount')]), [['in_1', 18900]]);
    assert.equal((await db.doc('payLinks/tokOpen1234567890ab').get()).get('status'), 'used');
    assert.equal(emails.length, 1);
    assert.match(emails[0].subject, /New membership: Jordan Lee/);
    assert.deepEqual(emails[0].to, ['kate@example.com']);
    assert.match(emails[0].text, /#\/clients\/c1/);

    // Stripe can deliver the same event twice: nothing happens the second time.
    const again = await sendEvent('checkout.session.completed', session(), 'evt_1');
    assert.equal((await again.json()).result, 'duplicate');
    assert.equal(emails.length, 1);

    // The first invoice's own event updates the same payment record instead of adding another.
    await sendEvent('invoice.paid', { id: 'in_1', object: 'invoice', customer: 'cus_1', amount_paid: 18900, currency: 'usd', hosted_invoice_url: 'https://inv/1', created: 1762800000 });
    await sendEvent('invoice.paid', { id: 'in_2', object: 'invoice', customer: 'cus_1', amount_paid: 18900, currency: 'usd', hosted_invoice_url: 'https://inv/2', created: 1765400000 });
    const after = await db.collection('clients/c1/payments').get();
    assert.deepEqual(after.docs.map((d) => d.id).sort(), ['in_1', 'in_2']);
    assert.equal((await db.doc('clients/c1/payments/in_1').get()).get('receiptUrl'), 'https://inv/1');
  });

  test('someone joining from the website becomes a new client', async () => {
    const res = await sendEvent('checkout.session.completed', session({
      client_reference_id: null, customer: 'cus_9', subscription: null, invoice: null, mode: 'payment', amount_total: 90000,
      customer_details: { email: 'New.Person@Example.com', name: 'New Person', phone: '+15550100' }, metadata: { plan: 'pt-12', source: 'website' },
    }));
    assert.equal((await res.json()).result, 'client created');
    const q = await db.collection('clients').where('email', '==', 'new.person@example.com').get();
    assert.equal(q.size, 1);
    const c = q.docs[0].data();
    assert.equal(c.name, 'New Person');
    assert.equal(c.source, 'website');
    assert.equal(c.assignedTo, null);
    assert.equal(c.billing.status, 'paid');
    assert.equal(c.billing.mode, 'payment');
    assert.equal(c.membership, '1:1 Coaching · 12 sessions');
    assert.match(emails[0].text, /joined online without an assessment/);
  });

  test('a website buyer who is already a client (same email) is matched, not duplicated', async () => {
    await sendEvent('checkout.session.completed', session({ client_reference_id: null, metadata: { plan: 'open-gym', source: 'website' }, customer_details: { email: 'Jordan@Example.com', name: 'J' } }));
    assert.equal((await db.collection('clients').get()).size, 1);
    assert.equal((await db.doc('clients/c1').get()).get('billing.plan'), 'open-gym');
  });

  test('failed payments, recoveries and cancellations update the status and email Kate', async () => {
    await sendEvent('checkout.session.completed', session());
    emails.length = 0;
    await sendEvent('invoice.payment_failed', { id: 'in_3', object: 'invoice', customer: 'cus_1', amount_due: 18900 });
    assert.equal((await db.doc('clients/c1').get()).get('billing.status'), 'past_due');
    assert.match(emails[0].subject, /Payment failed: Jordan Lee/);
    await sendEvent('invoice.paid', { id: 'in_3', object: 'invoice', customer: 'cus_1', amount_paid: 18900, currency: 'usd', created: 1765400000 });
    assert.equal((await db.doc('clients/c1').get()).get('billing.status'), 'active');
    await sendEvent('customer.subscription.updated', { id: 'sub_1', object: 'subscription', customer: 'cus_1', status: 'active', cancel_at_period_end: true, items: { data: [{ current_period_end: 1767990000 }] } });
    const c = (await db.doc('clients/c1').get()).data();
    assert.equal(c.billing.cancelAtPeriodEnd, true);
    assert.equal(c.billing.currentPeriodEnd.toMillis(), 1767990000 * 1000);
    await sendEvent('customer.subscription.deleted', { id: 'sub_1', object: 'subscription', customer: 'cus_1', status: 'canceled' });
    assert.equal((await db.doc('clients/c1').get()).get('billing.status'), 'canceled');
    assert.match(emails.at(-1).subject, /Membership ended: Jordan Lee/);
  });

  test('events for unknown customers or other types are acknowledged and ignored', async () => {
    assert.equal((await (await sendEvent('invoice.paid', { id: 'in_x', customer: 'cus_unknown', amount_paid: 1 })).json()).result, 'ignored: no matching client');
    assert.equal((await (await sendEvent('charge.refunded', { id: 'ch_1' })).json()).result, 'ignored: charge.refunded');
  });
});
