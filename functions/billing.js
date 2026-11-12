// Stripe billing: creating checkout sessions and applying Stripe webhook events
// to Firestore. Firebase wiring (secrets, HTTP) lives in index.js; this file is
// plain logic so it can be tested against the emulator and a fake Stripe.

import { createRequire } from 'node:module';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

const require = createRequire(import.meta.url);
const { currency: CURRENCY, plans: PLAN_LIST } = require('./plans.json');
export const PLANS = Object.fromEntries(PLAN_LIST.map((p) => [p.id, p]));

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const money = (cents) => `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;

/**
 * Creates a Stripe Checkout session for a website "Join" button ({ plan }) or a
 * payment link Kate sent from the hub ({ token }). Prices always come from
 * plans.json, never from the request.
 */
export async function createCheckout({ stripe, db, body, siteUrl }) {
  const site = siteUrl.replace(/\/$/, '');
  let plan;
  let clientId = null;
  let client = null;
  let token = null;

  if (typeof body?.token === 'string' && body.token) {
    token = body.token;
    if (!/^[A-Za-z0-9]{16,64}$/.test(token)) throw new HttpError(404, 'This payment link isn’t valid.');
    const link = await db.doc(`payLinks/${token}`).get();
    if (!link.exists) throw new HttpError(404, 'This payment link isn’t valid.');
    if (link.get('status') !== 'open') throw new HttpError(410, 'This payment link has already been used or was cancelled.');
    if (link.get('expiresAt').toMillis() < Date.now()) throw new HttpError(410, 'This payment link has expired.');
    plan = PLANS[link.get('plan')];
    clientId = link.get('clientId');
    const snap = await db.doc(`clients/${clientId}`).get();
    if (!snap.exists) throw new HttpError(410, 'This payment link is no longer active.');
    client = snap.data();
  } else {
    plan = PLANS[body?.plan];
  }
  if (!plan) throw new HttpError(400, 'Unknown plan.');

  const metadata = { plan: plan.id, source: token ? 'link' : 'website', ...(clientId ? { clientId } : {}), ...(token ? { payLink: token } : {}) };
  const price_data = {
    currency: CURRENCY,
    unit_amount: plan.amount,
    product_data: { name: plan.name, description: plan.description },
    ...(plan.mode === 'subscription' ? { recurring: { interval: plan.interval } } : {}),
  };
  const back = token ? `t=${encodeURIComponent(token)}` : `plan=${encodeURIComponent(plan.id)}`;
  const existingCustomer = client?.billing?.customerId;

  const session = await stripe.checkout.sessions.create({
    mode: plan.mode,
    line_items: [{ price_data, quantity: 1 }],
    success_url: `${site}/pay/?status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site}/pay/?${back}&status=cancelled`,
    allow_promotion_codes: true,
    metadata,
    ...(clientId ? { client_reference_id: clientId } : {}),
    ...(existingCustomer ? { customer: existingCustomer } : client?.email ? { customer_email: client.email } : {}),
    ...(token ? {} : { phone_number_collection: { enabled: true } }),
    ...(plan.mode === 'subscription'
      ? { subscription_data: { metadata } }
      : { payment_intent_data: { metadata, description: plan.name }, ...(existingCustomer ? {} : { customer_creation: 'always' }) }),
  });
  return { url: session.url };
}

const tsFromUnix = (s) => (typeof s === 'number' ? Timestamp.fromMillis(s * 1000) : null);

async function findClientBy(db, field, value) {
  if (!value) return null;
  const q = await db.collection('clients').where(field, '==', value).limit(1).get();
  return q.empty ? null : q.docs[0];
}

/**
 * Applies one verified Stripe event. Returns a short description of what
 * happened (for logs and tests). `notify(subject, lines)` emails the team.
 */
export async function applyStripeEvent({ event, db, notify }) {
  const marker = db.doc(`stripeEvents/${event.id}`);
  if ((await marker.get()).exists) return 'duplicate';
  const result = await handle(event, db, notify);
  await marker.set({ type: event.type, result, at: FieldValue.serverTimestamp() });
  return result;
}

async function handle(event, db, notify) {
  const o = event.data.object;
  const now = FieldValue.serverTimestamp();

  switch (event.type) {
    case 'checkout.session.completed': {
      const plan = PLANS[o.metadata?.plan];
      if (!plan) return 'ignored: unknown plan';
      const details = o.customer_details ?? {};
      const email = (details.email || o.customer_email || '').toLowerCase();

      // Who is this? The hub's link says; otherwise match by email or create a client.
      let ref = null;
      let created = false;
      const id = o.client_reference_id || o.metadata?.clientId;
      if (id && (await db.doc(`clients/${id}`).get()).exists) ref = db.doc(`clients/${id}`);
      if (!ref && email) ref = (await findClientBy(db, 'email', email))?.ref ?? null;
      if (!ref) {
        ref = db.collection('clients').doc();
        created = true;
        await ref.set({
          name: (details.name || email || 'New member').slice(0, 120),
          email: email.slice(0, 200),
          phone: (details.phone || '').slice(0, 40),
          assignedTo: null,
          leadId: null,
          membership: '',
          checklist: {},
          onboarding: { status: 'none' },
          healthFlag: false,
          source: 'website',
          createdAt: now,
          createdBy: 'stripe',
          updatedAt: now,
          updatedBy: 'stripe',
        });
      }

      const isSub = o.mode === 'subscription';
      await ref.update({
        billing: {
          status: isSub ? 'active' : o.payment_status === 'paid' ? 'paid' : 'pending',
          plan: plan.id,
          planName: plan.name,
          mode: o.mode,
          customerId: o.customer ?? null,
          subscriptionId: o.subscription ?? null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          livemode: !!o.livemode,
          since: tsFromUnix(o.created),
        },
        membership: plan.name,
        'checklist.membership': now,
        updatedAt: now,
        updatedBy: 'stripe',
      });
      // First payment. For subscriptions the doc id is the invoice id, so the
      // matching invoice.paid event updates the same record instead of duplicating it.
      await ref.collection('payments').doc(o.invoice || o.id).set(
        { amount: o.amount_total ?? plan.amount, currency: o.currency || 'usd', description: plan.name, status: 'paid', createdAt: tsFromUnix(o.created) ?? now, livemode: !!o.livemode },
        { merge: true },
      );
      if (o.metadata?.payLink) await db.doc(`payLinks/${o.metadata.payLink}`).set({ status: 'used', usedAt: now }, { merge: true });

      const name = created ? details.name || email : (await ref.get()).get('name');
      await notify(`New membership: ${name} · ${plan.name}`, [
        `${name} just paid for ${plan.name} (${money(o.amount_total ?? plan.amount)}${isSub ? ` per ${plan.interval}` : ''}).`,
        created ? 'They joined online without an assessment, so a new client was created. Assign them a coach and send their onboarding forms.' : 'Their client record has been updated.',
        { clientId: ref.id },
      ]);
      return created ? 'client created' : 'client updated';
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const doc = (await findClientBy(db, 'billing.subscriptionId', o.id)) ?? (await findClientBy(db, 'billing.customerId', o.customer));
      if (!doc) return 'ignored: no matching client';
      const status = event.type.endsWith('deleted') ? 'canceled' : o.status;
      const periodEnd = o.items?.data?.[0]?.current_period_end ?? o.current_period_end;
      await doc.ref.update({
        'billing.status': status,
        'billing.subscriptionId': o.id,
        'billing.cancelAtPeriodEnd': !!o.cancel_at_period_end,
        'billing.currentPeriodEnd': tsFromUnix(periodEnd),
        updatedAt: now,
        updatedBy: 'stripe',
      });
      if (status === 'canceled') await notify(`Membership ended: ${doc.get('name')}`, [`${doc.get('name')}'s ${doc.get('billing.planName') || 'membership'} has been cancelled.`, { clientId: doc.id }]);
      return `status ${status}`;
    }

    case 'invoice.paid':
    case 'invoice.payment_failed': {
      const doc = await findClientBy(db, 'billing.customerId', o.customer);
      if (!doc) return 'ignored: no matching client';
      if (event.type === 'invoice.paid') {
        await doc.ref.collection('payments').doc(o.id).set(
          {
            amount: o.amount_paid,
            currency: o.currency,
            description: o.lines?.data?.[0]?.description || doc.get('billing.planName') || 'Membership',
            status: 'paid',
            receiptUrl: o.hosted_invoice_url ?? null,
            createdAt: tsFromUnix(o.status_transitions?.paid_at ?? o.created),
            livemode: !!o.livemode,
          },
          { merge: true },
        );
        if (doc.get('billing.status') === 'past_due') await doc.ref.update({ 'billing.status': 'active', updatedAt: now, updatedBy: 'stripe' });
        return 'payment recorded';
      }
      await doc.ref.update({ 'billing.status': 'past_due', updatedAt: now, updatedBy: 'stripe' });
      await notify(`Payment failed: ${doc.get('name')}`, [
        `A ${money(o.amount_due ?? 0)} payment from ${doc.get('name')} for ${doc.get('billing.planName') || 'their membership'} failed.`,
        'Stripe will retry and email them to update their card.',
        { clientId: doc.id },
      ]);
      return 'marked past due';
    }

    default:
      return `ignored: ${event.type}`;
  }
}
