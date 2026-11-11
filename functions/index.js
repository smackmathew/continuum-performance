import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { defineSecret, defineString } from 'firebase-functions/params';
import { logger } from 'firebase-functions';
import { buildAlert, buildOnboardingAlert, recipients, recipientsWithCoach } from './email.js';

initializeApp();

const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
const ALERT_FROM = defineString('ALERT_FROM', { default: 'Continuum Performance <onboarding@resend.dev>' });
const HUB_URL = defineString('HUB_URL', { default: 'https://continuum-performance.web.app/admin/' });

/** Emails the team when someone submits the website's contact form. */
export const leadAlert = onDocumentCreated(
  { document: 'leads/{leadId}', region: 'us-central1', secrets: [RESEND_API_KEY], retry: false },
  async (event) => {
    const lead = event.data?.data();
    if (!lead) return;
    const db = getFirestore();
    const [settings, team] = await Promise.all([db.doc('settings/notifications').get(), db.collection('team').get()]);
    const to = recipients(settings.get('leadAlertEmails'), team.docs.map((d) => d.data()));
    if (!to.length) {
      logger.warn('New lead but no alert recipients: add emails in hub Settings or an owner on the team.', { leadId: event.params.leadId });
      return;
    }

    const email = buildAlert(lead, { id: event.params.leadId, hubUrl: HUB_URL.value(), from: ALERT_FROM.value() });
    if (await send({ ...email, to }, 'Lead alert', { leadId: event.params.leadId }))
      logger.info('Lead alert sent', { leadId: event.params.leadId, recipients: to.length });
  },
);

/** Sends through Resend; logs and returns false on failure instead of throwing. */
async function send(email, what, context) {
  // RESEND_API_URL is only set when testing against a local stand-in for Resend.
  const res = await fetch(process.env.RESEND_API_URL || 'https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY.value()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(email),
  });
  if (!res.ok) {
    logger.error(`${what} email failed`, { status: res.status, body: (await res.text()).slice(0, 500), ...context });
    return false;
  }
  return true;
}

/**
 * When a client submits their onboarding forms: tick the intake and
 * health/waiver steps, flag any "yes" on the health screen, and email the
 * alert list (or owners) plus the client's coach.
 */
export const onboardingSubmitted = onDocumentCreated(
  { document: 'invites/{token}/submission/{docId}', region: 'us-central1', secrets: [RESEND_API_KEY], retry: false },
  async (event) => {
    const form = event.data?.data();
    if (!form) return;
    const db = getFirestore();
    const invite = await db.doc(`invites/${event.params.token}`).get();
    const clientId = invite.get('clientId');
    if (!clientId) return logger.warn('Submission for an unknown link', { token: event.params.token.slice(0, 4) });
    const clientRef = db.doc(`clients/${clientId}`);
    const client = await clientRef.get();
    if (!client.exists) return logger.warn('Submission for a deleted client', { clientId });

    const healthYes = Object.values(form.health?.answers ?? {}).filter((v) => v === true).length;
    const now = FieldValue.serverTimestamp();
    await clientRef.update({
      'checklist.intake': now,
      'checklist.healthWaiver': now,
      onboarding: { ...(client.get('onboarding') ?? {}), inviteId: event.params.token, status: 'submitted', submittedAt: now },
      ...(healthYes > 0 ? { healthFlag: true } : {}),
      updatedAt: now,
      updatedBy: 'system',
    });

    const [settings, team] = await Promise.all([db.doc('settings/notifications').get(), db.collection('team').get()]);
    const to = recipientsWithCoach(settings.get('leadAlertEmails'), team.docs.map((d) => ({ uid: d.id, ...d.data() })), client.get('assignedTo'));
    if (!to.length) return logger.warn('Forms submitted but no one to email', { clientId });
    const email = buildOnboardingAlert(client.data(), { clientId, hubUrl: HUB_URL.value(), from: ALERT_FROM.value(), healthYes });
    if (await send({ ...email, to }, 'Onboarding alert', { clientId }))
      logger.info('Onboarding alert sent', { clientId, recipients: to.length, healthYes });
  },
);
