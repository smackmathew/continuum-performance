import type { Timestamp } from 'firebase/firestore';

export function when(ts: Timestamp | null | undefined): string {
  if (!ts) return 'just now';
  const d = ts.toDate();
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
}

export function fullDate(ts: Timestamp | null | undefined): string {
  return ts ? ts.toDate().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'just now';
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;
