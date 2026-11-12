// Builds the new-lead alert email and works out who receives it.
// Kept free of Firebase imports so it can be unit-tested directly.

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const oneLine = (s) => String(s ?? '').replace(/[\r\n\t]+/g, ' ').trim();

const escape = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/**
 * Recipients: the owner-managed list in settings/notifications, falling back to
 * every owner on the team. Invalid and duplicate addresses are dropped.
 */
export function recipients(settingsEmails, team) {
  const pick = Array.isArray(settingsEmails) && settingsEmails.length
    ? settingsEmails
    : (team ?? []).filter((m) => m.role === 'owner').map((m) => m.email);
  return [...new Set(pick.map((e) => String(e ?? '').trim().toLowerCase()).filter((e) => EMAIL.test(e)))].slice(0, 10);
}

export function buildAlert(lead, { id, hubUrl, from }) {
  const link = `${hubUrl.replace(/\/?$/, '/')}#/leads/${encodeURIComponent(id)}`;
  const rows = [
    ['Name', lead.name],
    ['Email', lead.email],
    ['Phone', lead.phone || 'Not given'],
    ['Interested in', lead.interest],
  ];
  const message = String(lead.message ?? '').trim() || 'No message';

  const text = [
    `New enquiry from the Continuum Performance website.`,
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    'Message:',
    message,
    '',
    `Open it in the team hub: ${link}`,
    'Reply to this email to answer them directly.',
  ].join('\n');

  const html = `<!doctype html><html><body style="margin:0;background:#f5f7fb;font-family:Inter,Arial,sans-serif;color:#0b1730">
<div style="max-width:560px;margin:0 auto;padding:24px">
  <div style="background:#0b1730;color:#fff;border-radius:12px 12px 0 0;padding:18px 24px;border-bottom:4px solid #d63a0f">
    <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#ff9e75">New website enquiry</div>
    <div style="font-size:22px;font-weight:700;margin-top:4px">${escape(lead.name)}</div>
  </div>
  <div style="background:#fff;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px;padding:24px">
    <table role="presentation" style="width:100%;border-collapse:collapse;font-size:15px">
      ${rows.map(([k, v]) => `<tr><td style="padding:6px 0;color:#64748b;width:130px;vertical-align:top">${escape(k)}</td><td style="padding:6px 0">${escape(v)}</td></tr>`).join('')}
    </table>
    <div style="margin-top:16px;padding:14px 16px;background:#f5f7fb;border-radius:8px;white-space:pre-wrap;font-size:15px;line-height:1.5">${escape(message)}</div>
    <a href="${escape(link)}" style="display:inline-block;margin-top:20px;background:#d63a0f;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:6px">Open in the team hub</a>
    <p style="margin:16px 0 0;font-size:13px;color:#64748b">Reply to this email to answer ${escape(String(lead.name ?? '').split(' ')[0] || 'them')} directly.</p>
  </div>
</div></body></html>`;

  return {
    from,
    reply_to: EMAIL.test(String(lead.email ?? '')) ? lead.email : undefined,
    subject: `New enquiry: ${oneLine(lead.name || 'Someone').slice(0, 80)} (${oneLine(lead.interest).slice(0, 40)})`,
    text,
    html,
  };
}

/** Alert list (or owners) plus the client's coach, de-duplicated. */
export function recipientsWithCoach(settingsEmails, team, coachUid) {
  const base = recipients(settingsEmails, team);
  const coach = (team ?? []).find((m) => m.uid === coachUid);
  return recipients([...base, ...(coach?.email ? [coach.email] : [])], []);
}

/**
 * "Forms are in" email. Deliberately contains no health answers, only whether
 * the client answered yes to any health question, and a link to read them in the hub.
 */
export function buildOnboardingAlert(client, { clientId, hubUrl, from, healthYes }) {
  const link = `${hubUrl.replace(/\/?$/, '/')}#/clients/${encodeURIComponent(clientId)}`;
  const name = oneLine(client.name || 'A new client');
  const flag = healthYes > 0
    ? `They answered "yes" to ${healthYes} health screen question${healthYes === 1 ? '' : 's'}. Review their answers and get a doctor's clearance if needed before training.`
    : 'They answered "no" to every health screen question.';
  const text = [`${name} has completed their new member forms (intake, health screen and waiver).`, '', flag, '', `Open their client page: ${link}`].join('\n');
  const html = `<!doctype html><html><body style="margin:0;background:#f5f7fb;font-family:Inter,Arial,sans-serif;color:#0b1730">
<div style="max-width:560px;margin:0 auto;padding:24px">
  <div style="background:#0b1730;color:#fff;border-radius:12px 12px 0 0;padding:18px 24px;border-bottom:4px solid #d63a0f">
    <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#ff9e75">Forms received</div>
    <div style="font-size:22px;font-weight:700;margin-top:4px">${escape(name)}</div>
  </div>
  <div style="background:#fff;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px;padding:24px;font-size:15px;line-height:1.5">
    <p style="margin:0">${escape(name)} has completed their intake questionnaire, health screen and waiver.</p>
    <p style="margin:16px 0 0;padding:12px 14px;border-radius:8px;${healthYes > 0 ? 'background:#fef2f2;color:#991b1b' : 'background:#ecfdf5;color:#065f46'}">${escape(flag)}</p>
    <a href="${escape(link)}" style="display:inline-block;margin-top:20px;background:#d63a0f;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:6px">Open client page</a>
  </div>
</div></body></html>`;
  return { from, subject: `Forms in: ${name.slice(0, 80)}${healthYes > 0 ? ' (health check needed)' : ''}`, text, html };
}

/** Billing emails (new membership, cancellation, failed payment). No card details, just facts and a link. */
export function buildBillingAlert({ subject, lines, clientId, hubUrl, from }) {
  const link = clientId ? `${hubUrl.replace(/\/?$/, '/')}#/clients/${encodeURIComponent(clientId)}` : null;
  const text = [...lines, ...(link ? ['', `Open their client page: ${link}`] : [])].join('\n');
  const html = `<!doctype html><html><body style="margin:0;background:#f5f7fb;font-family:Inter,Arial,sans-serif;color:#0b1730">
<div style="max-width:560px;margin:0 auto;padding:24px">
  <div style="background:#0b1730;color:#fff;border-radius:12px 12px 0 0;padding:18px 24px;border-bottom:4px solid #d63a0f">
    <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#ff9e75">Billing</div>
    <div style="font-size:20px;font-weight:700;margin-top:4px">${escape(oneLine(subject))}</div>
  </div>
  <div style="background:#fff;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px;padding:24px;font-size:15px;line-height:1.5">
    ${lines.map((l) => `<p style="margin:0 0 12px">${escape(l)}</p>`).join('')}
    ${link ? `<a href="${escape(link)}" style="display:inline-block;margin-top:8px;background:#d63a0f;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:6px">Open client page</a>` : ''}
  </div>
</div></body></html>`;
  return { from, subject: oneLine(subject).slice(0, 150), text, html };
}
