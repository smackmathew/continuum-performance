import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { defineSecret, defineString } from 'firebase-functions/params';
import { logger } from 'firebase-functions';
import { buildAlert, recipients } from './email.js';

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
    // RESEND_API_URL is only set when testing against a local stand-in for Resend.
    const res = await fetch(process.env.RESEND_API_URL || 'https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY.value()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...email, to }),
    });
    if (!res.ok) {
      logger.error('Lead alert email failed', { status: res.status, body: (await res.text()).slice(0, 500), leadId: event.params.leadId });
      return;
    }
    logger.info('Lead alert sent', { leadId: event.params.leadId, recipients: to.length });
  },
);
