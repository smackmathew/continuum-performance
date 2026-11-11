import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, doc, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { Lead, Note, Role, TeamMember } from './types';

export type Session =
  | { state: 'loading' }
  | { state: 'signed-out' }
  | { state: 'signed-in'; user: User; role: Role | null; refresh: () => Promise<void> };

/** The signed-in user and their team role (from the custom claim set by the Team access workflow). */
export function useSession(): Session {
  const [session, setSession] = useState<Session>({ state: 'loading' });
  useEffect(
    () =>
      onAuthStateChanged(auth, async (user) => {
        if (!user) return setSession({ state: 'signed-out' });
        const read = async (force: boolean) => {
          const token = await user.getIdTokenResult(force);
          const r = token.claims.role;
          const role = r === 'owner' || r === 'staff' ? r : null;
          setSession({ state: 'signed-in', user, role, refresh: () => read(true) });
        };
        await read(false);
      }),
    [],
  );
  return session;
}

type Live<T> = { data: T; loading: boolean; error: string | null; denied: boolean };

function useLive<T>(subscribe: (set: (v: T) => void, fail: (e: Error) => void) => () => void, initial: T, deps: unknown[]): Live<T> {
  const [state, setState] = useState<Live<T>>({ data: initial, loading: true, error: null, denied: false });
  useEffect(() => {
    setState((s) => ({ ...s, loading: true }));
    return subscribe(
      (data) => setState({ data, loading: false, error: null, denied: false }),
      (e) => {
        const denied = (e as { code?: string }).code === 'permission-denied';
        setState((s) => ({ ...s, loading: false, denied, error: denied ? null : e.message }));
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

/** The owner sees every lead; staff only see leads assigned to them (the rules enforce this too). */
export const useLeads = (uid: string, role: Role) =>
  useLive<Lead[]>(
    (set, fail) =>
      onSnapshot(
        role === 'owner'
          ? query(collection(db, 'leads'), orderBy('createdAt', 'desc'), limit(500))
          : query(collection(db, 'leads'), where('assignedTo', '==', uid), orderBy('createdAt', 'desc'), limit(500)),
        (snap) => set(snap.docs.map((d) => ({ id: d.id, ...(d.data({ serverTimestamps: 'estimate' }) as Omit<Lead, 'id'>) }))),
        fail,
      ),
    [],
    [uid, role],
  );

export const useLead = (id: string) =>
  useLive<Lead | null>(
    (set, fail) =>
      onSnapshot(
        doc(db, 'leads', id),
        (d) => set(d.exists() ? { id: d.id, ...(d.data({ serverTimestamps: 'estimate' }) as Omit<Lead, 'id'>) } : null),
        fail,
      ),
    null,
    [id],
  );

export const useNotes = (leadId: string) =>
  useLive<Note[]>(
    (set, fail) =>
      onSnapshot(
        query(collection(db, 'leads', leadId, 'notes'), orderBy('createdAt', 'asc')),
        (snap) => set(snap.docs.map((d) => ({ id: d.id, ...(d.data({ serverTimestamps: 'estimate' }) as Omit<Note, 'id'>) }))),
        fail,
      ),
    [],
    [leadId],
  );

/** The owner gets the whole team; staff can only read their own record. */
export const useTeam = (uid: string, role: Role) =>
  useLive<TeamMember[]>(
    (set, fail) =>
      role === 'owner'
        ? onSnapshot(
            collection(db, 'team'),
            (snap) => set(snap.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<TeamMember, 'uid'>) })).sort((a, b) => a.name.localeCompare(b.name))),
            fail,
          )
        : onSnapshot(doc(db, 'team', uid), (d) => set(d.exists() ? [{ uid: d.id, ...(d.data() as Omit<TeamMember, 'uid'>) }] : []), fail),
    [],
    [uid, role],
  );

export const useAlertEmails = () =>
  useLive<string[]>(
    (set, fail) => onSnapshot(doc(db, 'settings', 'notifications'), (d) => set((d.data()?.leadAlertEmails as string[]) ?? []), fail),
    [],
    [],
  );

/** Tiny hash router: #/ , #/leads/:id , #/settings */
export function useRoute(): string {
  const [route, setRoute] = useState(() => window.location.hash.replace(/^#/, '') || '/');
  useEffect(() => {
    const on = () => setRoute(window.location.hash.replace(/^#/, '') || '/');
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
