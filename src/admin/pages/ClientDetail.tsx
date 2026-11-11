import { useState } from 'react';
import type { User } from 'firebase/auth';
import { useClient, useInvite, useSubmission } from '../data';
import { createInvite, deleteClient, inviteUrl, revokeInvite, tickStep, updateClient } from '../actions';
import { CHECKLIST, type Client, type Role, type SubmissionData, type TeamMember } from '../types';
import { firstName, fullDate, when } from '../format';
import { Card, ErrorNote, Spinner } from '../ui';
import { NotesCard } from '../NotesCard';
import { FormsBadge, HealthFlag, progress } from './Clients';
import { EXPERIENCE_OPTIONS, HEALTH_QUESTIONS } from '../../content/onboarding';
import { pricing } from '../../content/site';

export function ClientDetail({ id, team, user, role }: { id: string; team: TeamMember[]; user: User; role: Role }) {
  const { data: client, loading, error, denied } = useClient(id);
  const [actionError, setActionError] = useState<string | null>(null);
  const run = (p: Promise<unknown>) => p.then(() => setActionError(null)).catch((e: Error) => setActionError(e.message));
  const owner = role === 'owner';

  if (loading) return <Spinner />;
  if (!client)
    return (
      <div className="space-y-4">
        <a href="#/clients" className="text-sm font-semibold text-flame-600">← Back to clients</a>
        <ErrorNote error={error} />
        {!error && <p className="text-slate-600">{denied && !owner ? 'This client isn’t assigned to you.' : 'This client doesn’t exist any more.'}</p>}
      </div>
    );

  const done = progress(client);
  const tel = client.phone.replace(/[^\d+]/g, '');

  return (
    <div className="space-y-5">
      <a href="#/clients" className="inline-block text-sm font-semibold text-flame-600 hover:text-flame-700 print:hidden">← Back to clients</a>
      <ErrorNote error={error || actionError} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="min-w-0">
          <h1 className="break-words font-display text-4xl font-bold uppercase leading-none text-navy-900">{client.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <FormsBadge client={client} />
            {client.healthFlag && <HealthFlag />}
            <span>Client since {when(client.createdAt)}</span>
            {client.leadId && owner && <a className="font-semibold text-flame-600" href={`#/leads/${client.leadId}`}>Original enquiry</a>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {client.email && <a href={`mailto:${client.email}`} className="btn-primary !py-2 !text-base">Email</a>}
          {tel && <a href={`tel:${tel}`} className="btn-ghost !py-2 !text-base">Call</a>}
          {tel && <a href={`sms:${tel}`} className="btn-ghost !py-2 !text-base">Text</a>}
        </div>
      </div>

      {client.healthFlag && (
        <div role="note" className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <p><strong>Health screen:</strong> {firstName(client.name)} answered &ldquo;yes&rdquo; to at least one question. Review their answers below and get a doctor&apos;s clearance if needed before training.</p>
          {owner && (
            <button type="button" onClick={() => confirm('Mark this client as medically cleared to train?') && run(updateClient(client.id, { healthFlag: false }))} className="btn-ghost shrink-0 !border-red-300 !bg-white !py-2 !text-base">
              Mark cleared
            </button>
          )}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-5">
          <OnboardingForms client={client} run={run} />
          <NotesCard parent="clients" parentId={id} visible team={team} user={user} role={role} emptyText="No notes yet. Log the assessment, programming decisions and check-ins." />
        </div>

        <aside className="space-y-5 print:hidden">
          <Card title={`Onboarding ${done}/${CHECKLIST.length}`}>
            <ul className="space-y-1">
              {CHECKLIST.map((s) => {
                const at = client.checklist?.[s.id];
                return (
                  <li key={s.id}>
                    <label className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 hover:bg-mist">
                      <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-flame-600" checked={!!at} onChange={(e) => run(tickStep(client.id, s.id, e.target.checked))} />
                      <span className="text-sm">
                        <span className={at ? 'text-slate-500 line-through decoration-slate-300' : 'font-medium text-navy-900'}>{s.label}</span>
                        {at && <span className="block text-xs text-slate-400">{when(at)}</span>}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card title="Details">
            {owner ? <OwnerDetails client={client} team={team} user={user} run={run} /> : (
              <dl className="space-y-3 text-sm">
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Membership</dt><dd className="text-navy-900">{client.membership || 'Not chosen yet'}</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</dt><dd className="break-all text-navy-900">{client.email || '—'}</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</dt><dd className="text-navy-900">{client.phone || '—'}</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Coach</dt><dd className="text-navy-900">You</dd></div>
              </dl>
            )}
          </Card>

          {owner && (
            <button
              type="button"
              className="w-full rounded-md px-5 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
              onClick={() => confirm(`Delete ${client.name}'s client record and notes? Submitted forms are kept.`) && run(deleteClient(client.id)).then(() => (window.location.hash = '#/clients'))}
            >
              Delete client
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}

function OwnerDetails({ client, team, user, run }: { client: Client; team: TeamMember[]; user: User; run: (p: Promise<unknown>) => Promise<void> }) {
  const save = (field: 'name' | 'email' | 'phone' | 'membership', value: string) => {
    const v = value.trim();
    if (v === client[field] || (field === 'name' && !v)) return;
    run(updateClient(client.id, { [field]: field === 'email' ? v.toLowerCase() : v }));
  };
  return (
    <div className="space-y-4">
      <label className="block text-sm font-semibold text-navy-800">
        Coach
        <select className="field" value={client.assignedTo ?? ''} onChange={(e) => run(updateClient(client.id, { assignedTo: e.target.value || null }))}>
          <option value="">No coach yet</option>
          {team.map((m) => <option key={m.uid} value={m.uid}>{m.name}{m.uid === user.uid ? ' (me)' : ''}</option>)}
        </select>
      </label>
      <label className="block text-sm font-semibold text-navy-800">
        Membership
        <input className="field" list="memberships" defaultValue={client.membership} maxLength={80} onBlur={(e) => save('membership', e.target.value)} placeholder="Choose or type" />
        <datalist id="memberships">{pricing.plans.map((p) => <option key={p.name} value={p.name} />)}</datalist>
      </label>
      {(['name', 'email', 'phone'] as const).map((f) => (
        <label key={f} className="block text-sm font-semibold capitalize text-navy-800">
          {f}
          <input className="field" type={f === 'email' ? 'email' : f === 'phone' ? 'tel' : 'text'} defaultValue={client[f]} maxLength={f === 'email' ? 200 : f === 'phone' ? 40 : 120} onBlur={(e) => save(f, e.target.value)} />
        </label>
      ))}
    </div>
  );
}

function OnboardingForms({ client, run }: { client: Client; run: (p: Promise<unknown>) => Promise<void> }) {
  const inviteId = client.onboarding?.inviteId ?? null;
  const invite = useInvite(inviteId);
  const inv = invite.data;
  const submitted = inv?.status === 'submitted';
  const submission = useSubmission(inviteId, submitted);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const expired = inv?.status === 'open' && inv.expiresAt.toMillis() < Date.now();
  const live = inv?.status === 'open' && !expired;
  const url = inviteId ? inviteUrl(inviteId) : '';
  const fname = firstName(client.name);
  const message = `Hi ${fname}! Welcome to Continuum Performance. Before your first session, please fill in your new member forms (about 5 minutes): ${url}`;

  async function newLink() {
    setCreating(true);
    await run(createInvite(client));
    setCreating(false);
  }

  return (
    <Card title="Intake, health screen & waiver">
      {submitted ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between print:hidden">
            <p className="text-sm text-emerald-800"><strong>Forms received</strong> {fullDate(inv?.submittedAt)}.</p>
            <button type="button" onClick={() => window.print()} className="btn-ghost !py-1.5 !text-sm">Print / save PDF</button>
          </div>
          <ErrorNote error={submission.error} />
          {submission.data ? <Answers s={submission.data} name={client.name} /> : !submission.error && <Spinner label="Loading answers…" />}
        </div>
      ) : live ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Send {fname} this private link. It works once, until {inv!.expiresAt.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}.
            You&apos;ll see their answers here as soon as they submit.
          </p>
          <div className="flex gap-2">
            <input readOnly value={url} className="field !mt-0 font-mono text-xs" aria-label="Onboarding link" onFocus={(e) => e.currentTarget.select()} />
            <button
              type="button"
              className="btn-ghost shrink-0 !py-2 !text-base"
              onClick={async () => {
                await navigator.clipboard?.writeText(url).catch(() => {});
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {client.email && (
              <a className="btn-primary !py-2 !text-base" href={`mailto:${client.email}?subject=${encodeURIComponent('Your Continuum Performance welcome forms')}&body=${encodeURIComponent(message)}`}>
                Email link
              </a>
            )}
            {client.phone && <a className="btn-ghost !py-2 !text-base" href={`sms:${client.phone.replace(/[^\d+]/g, '')}?&body=${encodeURIComponent(message)}`}>Text link</a>}
            <button type="button" className="rounded-md px-3 py-2 text-sm font-semibold text-slate-500 hover:text-red-700" onClick={() => confirm('Revoke this link? It will stop working immediately.') && run(revokeInvite(client))}>
              Revoke link
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            {inv?.status === 'revoked' || client.onboarding?.status === 'revoked'
              ? 'The last link was revoked. '
              : expired
                ? 'The last link expired before it was used. '
                : ''}
            Create a private link for {fname} to fill in their intake questionnaire, health screen and waiver on their phone. No account needed.
          </p>
          <button type="button" disabled={creating} onClick={newLink} className="btn-primary !py-2 !text-base disabled:opacity-60">
            {creating ? 'Creating…' : inviteId ? 'Create a new link' : 'Create onboarding link'}
          </button>
        </div>
      )}
    </Card>
  );
}

const Row = ({ k, v }: { k: string; v?: string | null }) => (
  <div className="grid grid-cols-[9rem_1fr] gap-3 py-1.5 text-sm">
    <dt className="text-slate-500">{k}</dt>
    <dd className="whitespace-pre-wrap break-words text-navy-900">{v?.trim() ? v : <span className="text-slate-400">—</span>}</dd>
  </div>
);

function Answers({ s, name }: { s: SubmissionData; name: string }) {
  const yes = HEALTH_QUESTIONS.filter((q) => s.health.answers[q.id]);
  return (
    <div className="space-y-6">
      <h2 className="hidden font-display text-2xl font-bold uppercase text-navy-900 print:block">{name}: new member forms</h2>
      <section>
        <h3 className="font-display text-lg font-bold uppercase text-navy-900">About</h3>
        <dl className="divide-y divide-slate-100">
          <Row k="Full name" v={s.about.fullName} />
          <Row k="Date of birth" v={s.about.dob} />
          <Row k="Email" v={s.about.email} />
          <Row k="Phone" v={s.about.phone} />
          <Row k="Emergency contact" v={[s.about.emergencyName, s.about.emergencyPhone].filter(Boolean).join(' · ')} />
        </dl>
      </section>
      <section>
        <h3 className="font-display text-lg font-bold uppercase text-navy-900">Goals &amp; history</h3>
        <dl className="divide-y divide-slate-100">
          <Row k="Goals" v={s.goals.goals} />
          <Row k="Experience" v={EXPERIENCE_OPTIONS.find((o) => o.id === s.goals.experience)?.label ?? s.goals.experience} />
          <Row k="Sport / position" v={s.goals.sport} />
          <Row k="Injuries" v={s.goals.injuries} />
          <Row k="Availability" v={s.goals.availability?.join(', ')} />
          <Row k="Heard about us" v={s.goals.heardFrom} />
        </dl>
      </section>
      <section>
        <h3 className="font-display text-lg font-bold uppercase text-navy-900">
          Health screen {yes.length > 0 ? <span className="text-red-700">· {yes.length} &ldquo;yes&rdquo;</span> : <span className="text-emerald-700">· all &ldquo;no&rdquo;</span>}
        </h3>
        <ol className="mt-2 space-y-1.5">
          {HEALTH_QUESTIONS.map((q, i) => {
            const y = s.health.answers[q.id];
            return (
              <li key={q.id} className={`flex gap-3 rounded-md px-3 py-2 text-sm ${y ? 'bg-red-50 text-red-900' : 'text-slate-700'}`}>
                <span className={`w-9 shrink-0 font-bold ${y ? 'text-red-700' : 'text-slate-400'}`}>{y ? 'YES' : 'No'}</span>
                <span><span className="text-slate-400">{i + 1}.</span> {q.text}</span>
              </li>
            );
          })}
        </ol>
        {s.health.details && <dl className="mt-2"><Row k="Details" v={s.health.details} /></dl>}
      </section>
      <section>
        <h3 className="font-display text-lg font-bold uppercase text-navy-900">Waiver</h3>
        <p className="mt-1 text-sm text-navy-900">
          Signed <strong className="font-display text-xl">{s.waiver.signedName}</strong>
          {s.waiver.signer === 'guardian' ? ' as parent/guardian' : ''} on {fullDate(s.submittedAt)}.
        </p>
        <p className="text-xs text-slate-500">Waiver version: {s.waiver.version}</p>
      </section>
    </div>
  );
}
