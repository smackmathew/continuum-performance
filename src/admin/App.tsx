import { useEffect } from 'react';
import { signOut, type User } from 'firebase/auth';
import { auth } from './firebase';
import { useLeads, useRoute, useSession, useTeam } from './data';
import type { Role } from './types';
import { Avatar, ResponsiveLogo, Spinner } from './ui';
import { NotOnTeam, SignIn } from './pages/SignIn';
import { Inbox } from './pages/Inbox';
import { LeadDetail } from './pages/LeadDetail';
import { Settings } from './pages/Settings';

export default function App() {
  const session = useSession();
  if (session.state === 'loading') return <Spinner label="Starting…" />;
  if (session.state === 'signed-out') return <SignIn />;
  if (!session.role) return <NotOnTeam email={session.user.email ?? 'this account'} onRetry={session.refresh} />;
  return <Hub user={session.user} role={session.role} />;
}

function Hub({ user, role }: { user: User; role: Role }) {
  const route = useRoute();
  const leads = useLeads();
  const team = useTeam();
  const unread = leads.data.filter((l) => !l.readAt).length;

  useEffect(() => {
    document.title = `${unread ? `(${unread}) ` : ''}Team hub · Continuum Performance`;
  }, [unread]);

  const me = team.data.find((m) => m.uid === user.uid)?.name || user.displayName || user.email || 'You';
  const leadId = route.match(/^\/leads\/([^/]+)$/)?.[1];
  const nav = [
    { href: '#/', label: 'Leads', active: !route.startsWith('/settings'), badge: unread },
    { href: '#/settings', label: 'Settings', active: route.startsWith('/settings'), badge: 0 },
  ];

  return (
    <div className="min-h-svh bg-mist">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:gap-4 sm:px-6">
          <a href="#/" className="shrink-0" aria-label="Team hub home"><ResponsiveLogo /></a>
          <nav className="flex gap-1" aria-label="Hub">
            {nav.map((n) => (
              <a
                key={n.href}
                href={n.href}
                aria-current={n.active ? 'page' : undefined}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm font-semibold sm:px-3 ${n.active ? 'bg-navy-50 text-navy-900' : 'text-slate-600 hover:text-navy-900'}`}
              >
                {n.label}
                {n.badge > 0 && <span className="rounded-full bg-flame-600 px-1.5 text-xs text-white" aria-label={`${n.badge} unread`}>{n.badge}</span>}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <span className="hidden text-right text-sm sm:block">
              <span className="block font-semibold text-navy-900">{me}</span>
              <span className="block text-xs capitalize text-slate-500">{role}</span>
            </span>
            <Avatar name={me} className="hidden h-9 w-9 text-sm sm:inline-grid" />
            <button type="button" onClick={() => signOut(auth)} className="whitespace-nowrap text-sm font-semibold text-slate-500 hover:text-navy-900">Sign out</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {route.startsWith('/settings') ? (
          <Settings team={team.data} role={role} />
        ) : leadId ? (
          <LeadDetail key={leadId} id={leadId} team={team.data} user={user} role={role} />
        ) : (
          <Inbox leads={leads.data} loading={leads.loading} error={leads.error} team={team.data} user={user} />
        )}
      </main>
    </div>
  );
}
