import { useState } from 'react';
import { usePayLink, usePayments } from './data';
import { createPayLink, payUrl, revokePayLink } from './actions';
import type { Client, Role } from './types';
import { firstName, fullDate } from './format';
import { Card, ErrorNote } from './ui';
import { PLANS, planById, priceLabel } from '../plans';

const STATUS: Record<string, [string, string]> = {
  active: ['Active', 'bg-emerald-100 text-emerald-900'],
  trialing: ['Trial', 'bg-emerald-100 text-emerald-900'],
  paid: ['Paid', 'bg-emerald-100 text-emerald-900'],
  past_due: ['Payment failed', 'bg-red-100 text-red-800'],
  unpaid: ['Unpaid', 'bg-red-100 text-red-800'],
  incomplete: ['Incomplete', 'bg-amber-100 text-amber-900'],
  pending: ['Pending', 'bg-amber-100 text-amber-900'],
  canceled: ['Cancelled', 'bg-slate-200 text-slate-700'],
};

export function BillingBadge({ client }: { client: Client }) {
  if (!client.billing) return null;
  const [label, cls] = STATUS[client.billing.status] ?? [client.billing.status, 'bg-slate-100 text-slate-700'];
  return <span className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>;
}

const dollars = (cents: number) => `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: cents % 100 ? 2 : 0 })}`;

export function BillingCard({ client, role, run }: { client: Client; role: Role; run: (p: Promise<unknown>) => Promise<void> }) {
  const owner = role === 'owner';
  const b = client.billing;
  const payments = usePayments(client.id, owner && !!b);
  const link = usePayLink(owner ? client.payLink?.id : null).data;
  const [plan, setPlan] = useState(client.payLink?.plan ?? PLANS[0].id);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const linkOpen = link?.status === 'open' && link.expiresAt.toMillis() > Date.now();
  const url = link ? payUrl(link.id) : '';
  const linkPlan = planById(link?.plan);
  const message = linkPlan
    ? `Hi ${firstName(client.name)}! Here's your secure link to start ${linkPlan.name} (${priceLabel(linkPlan)}) at Continuum Performance: ${url}`
    : '';
  const stripeBase = `https://dashboard.stripe.com/${b?.livemode ? '' : 'test/'}`;

  return (
    <Card title="Membership & billing">
      <div className="space-y-4 text-sm">
        {b ? (
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <BillingBadge client={client} />
              <span className="font-semibold text-navy-900">{b.planName}</span>
              {!b.livemode && <span className="rounded bg-amber-100 px-1.5 text-[11px] font-semibold text-amber-900">TEST</span>}
            </div>
            {b.mode === 'subscription' && b.currentPeriodEnd && (
              <p className="text-slate-500">
                {b.cancelAtPeriodEnd ? 'Ends' : 'Renews'} {b.currentPeriodEnd.toDate().toLocaleDateString(undefined, { dateStyle: 'medium' })}
              </p>
            )}
            {b.since && <p className="text-slate-500">Since {b.since.toDate().toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>}
            {owner && b.customerId && (
              <a className="inline-block font-semibold text-flame-600" href={`${stripeBase}customers/${b.customerId}`} target="_blank" rel="noreferrer">
                Open in Stripe ↗
              </a>
            )}
          </div>
        ) : (
          <p className="text-slate-500">{owner ? 'Not paying online yet.' : 'No online membership yet.'}</p>
        )}

        {owner && (
          <div className="space-y-3 border-t border-slate-100 pt-4">
            <ErrorNote error={payments.error} />
            {linkOpen ? (
              <>
                <p className="text-slate-600">
                  Payment link for <strong>{linkPlan?.name}</strong> ({linkPlan && priceLabel(linkPlan)}), valid until{' '}
                  {link!.expiresAt.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}.
                </p>
                <div className="flex gap-2">
                  <input readOnly value={url} aria-label="Payment link" className="field !mt-0 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
                  <button
                    type="button"
                    className="btn-ghost shrink-0 !px-3 !py-2 !text-sm"
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
                    <a className="btn-primary !py-1.5 !text-sm" href={`mailto:${client.email}?subject=${encodeURIComponent('Your Continuum Performance membership')}&body=${encodeURIComponent(message)}`}>
                      Email link
                    </a>
                  )}
                  {client.phone && <a className="btn-ghost !py-1.5 !text-sm" href={`sms:${client.phone.replace(/[^\d+]/g, '')}?&body=${encodeURIComponent(message)}`}>Text link</a>}
                  <button type="button" className="px-2 text-xs font-semibold text-slate-500 hover:text-red-700" onClick={() => confirm('Cancel this payment link?') && run(revokePayLink(link!.id))}>
                    Cancel link
                  </button>
                </div>
              </>
            ) : (
              <>
                {link?.status === 'used' && <p className="text-emerald-800">The last payment link was paid.</p>}
                <label className="block font-semibold text-navy-800">
                  {b ? 'Send a link for another plan or pack' : 'Send a payment link'}
                  <select className="field" value={plan} onChange={(e) => setPlan(e.target.value)}>
                    {PLANS.map((p) => <option key={p.id} value={p.id}>{p.name} · {priceLabel(p)}</option>)}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={creating}
                  className="btn-primary w-full !py-2 !text-base disabled:opacity-60"
                  onClick={async () => {
                    setCreating(true);
                    await run(createPayLink(client, plan));
                    setCreating(false);
                  }}
                >
                  {creating ? 'Creating…' : 'Create payment link'}
                </button>
              </>
            )}

            {payments.data.length > 0 && (
              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payments</p>
                <ul className="mt-2 space-y-1.5">
                  {payments.data.map((p) => (
                    <li key={p.id} className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate text-slate-600">
                        {p.createdAt ? p.createdAt.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'} · {p.description}
                      </span>
                      <span className="shrink-0 font-semibold text-navy-900">
                        {p.receiptUrl ? <a href={p.receiptUrl} target="_blank" rel="noreferrer" className="hover:text-flame-600" title="Receipt">{dollars(p.amount)}</a> : dollars(p.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        {owner && client.source === 'website' && <p className="text-xs text-slate-500">Joined online on {fullDate(client.createdAt)}.</p>}
      </div>
    </Card>
  );
}
