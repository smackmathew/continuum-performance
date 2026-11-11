import type { ReactNode } from 'react';
import { statusLabel } from './types';

// The hub is always served from the site root (/admin/), so assets use root paths.
export function Logo({ className = 'h-9' }: { className?: string }) {
  return <img src="/logo.png" alt="Continuum Performance" width={900} height={288} className={`w-auto ${className}`} />;
}

/** Wide logo on larger screens, just the wing mark on phones. */
export function ResponsiveLogo() {
  return (
    <>
      <img src="/logo-mark.png" alt="Continuum Performance" width={798} height={621} className="h-8 w-auto sm:hidden" />
      <Logo className="hidden h-9 sm:block" />
    </>
  );
}

const pill: Record<string, string> = {
  new: 'bg-flame-100 text-flame-800',
  contacted: 'bg-navy-100 text-navy-800',
  assessment: 'bg-amber-100 text-amber-900',
  joined: 'bg-emerald-100 text-emerald-900',
  not_a_fit: 'bg-slate-200 text-slate-700',
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${pill[status] ?? pill.not_a_fit}`}>
      {statusLabel(status)}
    </span>
  );
}

export function Avatar({ name, photoURL, className = 'h-7 w-7 text-xs' }: { name: string; photoURL?: string | null; className?: string }) {
  if (photoURL)
    return <img src={photoURL} alt="" title={name} referrerPolicy="no-referrer" className={`inline-block shrink-0 rounded-full object-cover ${className}`} />;
  const initials = name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
  return (
    <span title={name} className={`inline-grid shrink-0 place-items-center rounded-full bg-navy-800 font-semibold text-white ${className}`}>
      {initials}
    </span>
  );
}

export function Card({ title, action, children, className = '' }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <h2 className="font-display text-lg font-bold uppercase tracking-wide text-navy-900">{title}</h2>
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      Something went wrong: {error}
    </p>
  );
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-16 text-slate-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-flame-600" aria-hidden="true" />
      {label}
    </div>
  );
}
