import { useEffect } from 'react';
import type { User } from 'firebase/auth';
import { useClients, useLeads, useRoute, useSession, useTeam } from './data';
import type { Role } from './types';
import { ResponsiveLogo, Spinner } from './ui';
import { ProfileMenu } from './ProfileMenu';
import { NotOnTeam, SignIn } from './pages/SignIn';
import { Inbox } from './pages/Inbox';
import { LeadDetail } from './pages/LeadDetail';
import { Settings } from './pages/Settings';
import { Clients } from './pages/Clients';
import { ClientDetail } from './pages/ClientDetail';
import { saveTeamProfile } from '../team-profile';

export default function App() {
  const session = useSession();
  const notMember = session.state === 'signed-out' || (session.state === 'signed-in' && !session.role);
  useEffect(() => {
    if (notMember) saveTeamProfile(null);
  }, [notMember]);

  if (session.state === 'loading') return <Spinner label="Starting…" />;
  if (session.state === 'signed-out') return <SignIn />;
  if (!session.role) return <NotOnTeam email={session.user.email ?? 'this account'} onRetry={session.refresh} />;
  return <Hub user={session.user} role={session.role} />;
}

function Hub({ user, role }: { user: User; role: Role }) {
  const route = useRoute();
  const leads = useLeads(user.uid, role);
  const team = useTeam(user.uid, role);
  const clients = useClients(user.uid, role);
  const owner = role === 'owner';
  const unread = leads.data.filter((l) => !l.readAt).length;
  const me = team.data.find((m) => m.uid === user.uid)?.name || user.displayName || user.email || 'You';

  useEffect(() => {
    document.title = `${unread ? `(${unread}) ` : ''}Team hub · Continuum Performance`;
  }, [unread]);

  // Lets the public site show this person's photo in its menu.
  useEffect(() => {
    saveTeamProfile({ name: me, photoURL: user.photoURL });
  }, [me, user.photoURL]);

  const onSettings = owner && route.startsWith('/settings');
  const onClients = route.startsWith('/clients');
  const leadId = route.match(/^\/leads\/([^/]+)$/)?.[1];
  const clientId = route.match(/^\/clients\/([^/]+)$/)?.[1];
  const healthChecks = clients.data.filter((c) => c.healthFlag).length;
  const nav = [
    { href: '#/', label: owner ? 'Leads' : 'My leads', active: !onSettings && !onClients, badge: unread },
    { href: '#/clients', label: owner ? 'Clients' : 'My clients', active: onClients, badge: healthChecks },
    ...(owner ? [{ href: '#/settings', label: 'Settings', active: onSettings, badge: 0 }] : []),
  ];

  return (
    <div className="min-h-svh bg-mist">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur print:hidden">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:gap-4 sm:px-6">
          <a href="#/" className="shrink-0" aria-label="Team hub home"><ResponsiveLogo /></a>
          <nav className="flex gap-1" aria-label="Hub">
            {nav.map((n) => (
              <a
                key={n.href}
                href={n.href}
                aria-current={n.active ? 'page' : undefined}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-2 text-sm font-semibold sm:px-3 ${n.active ? 'bg-navy-50 text-navy-900' : 'text-slate-600 hover:text-navy-900'}`}
              >
                {n.label}
                {n.badge > 0 && (
                  <span className="rounded-full bg-flame-600 px-1.5 text-xs text-white" aria-label={n.href === '#/clients' ? `${n.badge} need a health check` : `${n.badge} unread`}>
                    {n.badge}
                  </span>
                )}
              </a>
            ))}
          </nav>
          <div className="ml-auto shrink-0">
            <ProfileMenu user={user} name={me} role={role} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {onSettings ? (
          <Settings team={team.data} />
        ) : clientId ? (
          <ClientDetail key={clientId} id={clientId} team={team.data} user={user} role={role} />
        ) : onClients ? (
          <Clients clients={clients.data} loading={clients.loading} error={clients.error} team={team.data} user={user} role={role} />
        ) : leadId ? (
          <LeadDetail key={leadId} id={leadId} team={team.data} user={user} role={role} />
        ) : (
          <Inbox leads={leads.data} loading={leads.loading} error={leads.error} team={team.data} user={user} role={role} />
        )}
      </main>
    </div>
  );
}
