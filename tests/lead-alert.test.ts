import { describe, expect, it } from 'vitest';
// @ts-expect-error plain JS module without types
import { buildAlert, recipients } from '../functions/email.js';

describe('alert recipients', () => {
  it('uses the settings list, normalised and de-duplicated, ignoring junk', () => {
    expect(recipients([' Kate@Example.com', 'kate@example.com', 'nope', '', null], [])).toEqual(['kate@example.com']);
  });
  it('falls back to team owners when the list is empty or missing', () => {
    const team = [{ role: 'owner', email: 'kate@example.com' }, { role: 'staff', email: 'coach@example.com' }];
    expect(recipients([], team)).toEqual(['kate@example.com']);
    expect(recipients(undefined, team)).toEqual(['kate@example.com']);
  });
  it('returns nobody when there is no list and no owner', () => {
    expect(recipients([], [{ role: 'staff', email: 'c@example.com' }])).toEqual([]);
  });
});

describe('alert email', () => {
  const lead = { name: 'Jordan <b>Lee</b>', email: 'jordan@example.com', phone: '', interest: 'Strength & Conditioning', message: 'Line one\n<script>x</script>' };
  const email = buildAlert(lead, { id: 'abc123', hubUrl: 'https://continuum-performance.web.app/admin', from: 'CP <a@b.co>' });

  it('links to the lead in the hub and lets Kate reply to the visitor', () => {
    expect(email.text).toContain('https://continuum-performance.web.app/admin/#/leads/abc123');
    expect(email.html).toContain('https://continuum-performance.web.app/admin/#/leads/abc123');
    expect(email.reply_to).toBe('jordan@example.com');
    expect(email.subject).toBe('New enquiry: Jordan <b>Lee</b> (Strength & Conditioning)');
  });
  it('escapes everything the visitor typed in the HTML version', () => {
    expect(email.html).not.toContain('<script>');
    expect(email.html).not.toContain('<b>Lee</b>');
    expect(email.html).toContain('&lt;script&gt;');
    expect(email.text).toContain('Phone: Not given');
  });
  it('drops an invalid reply-to', () => {
    expect(buildAlert({ ...lead, email: 'bad' }, { id: 'x', hubUrl: 'https://h/', from: 'f' }).reply_to).toBeUndefined();
  });
});

describe('alert subject', () => {
  it('keeps the subject on one line', () => {
    const e = buildAlert({ name: 'A\r\nBcc: x@y.z', email: 'a@b.co', phone: '', interest: 'X\nY', message: '' }, { id: 'i', hubUrl: 'https://h/', from: 'f' });
    expect(e.subject).toBe('New enquiry: A Bcc: x@y.z (X Y)');
  });
});

// @ts-expect-error plain JS module without types
import { buildOnboardingAlert, recipientsWithCoach } from '../functions/email.js';

describe('onboarding alert', () => {
  const team = [
    { uid: 'kate', role: 'owner', email: 'kate@example.com' },
    { uid: 'alex', role: 'staff', email: 'alex@example.com' },
  ];
  it('goes to the alert list (or owners) plus the client’s coach, without duplicates', () => {
    expect(recipientsWithCoach([], team, 'alex')).toEqual(['kate@example.com', 'alex@example.com']);
    expect(recipientsWithCoach(['front@example.com'], team, 'alex')).toEqual(['front@example.com', 'alex@example.com']);
    expect(recipientsWithCoach([], team, 'kate')).toEqual(['kate@example.com']);
    expect(recipientsWithCoach([], team, null)).toEqual(['kate@example.com']);
  });
  it('flags health "yes" answers without including any health details, and links to the client', () => {
    const e = buildOnboardingAlert({ name: 'Jordan <Lee>' }, { clientId: 'c1', hubUrl: 'https://h/admin', from: 'f', healthYes: 2 });
    expect(e.subject).toBe('Forms in: Jordan <Lee> (health check needed)');
    expect(e.text).toContain('https://h/admin/#/clients/c1');
    expect(e.text).toContain('"yes" to 2 health screen questions');
    expect(e.html).not.toContain('<Lee>');
    const ok = buildOnboardingAlert({ name: 'Sam' }, { clientId: 'c2', hubUrl: 'https://h/admin/', from: 'f', healthYes: 0 });
    expect(ok.subject).toBe('Forms in: Sam');
    expect(ok.text).toContain('"no" to every');
  });
});
