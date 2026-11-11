import { useEffect, useRef, useState } from 'react';
import { signOut, type User } from 'firebase/auth';
import { auth } from './firebase';
import { saveTeamProfile } from '../team-profile';
import type { Role } from './types';
import { Avatar } from './ui';

export function ProfileMenu({ user, name, role }: { user: User; name: string; role: Role }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account: ${name}`}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition hover:bg-slate-100 sm:pl-3"
      >
        <span className="hidden text-right text-sm leading-tight sm:block">
          <span className="block font-semibold text-navy-900">{name}</span>
          <span className="block text-xs text-slate-500">{role === 'owner' ? 'Owner' : 'Coach'}</span>
        </span>
        <Avatar name={name} photoURL={user.photoURL} className="h-9 w-9 text-sm ring-2 ring-white" />
        <svg viewBox="0 0 20 20" className={`h-4 w-4 text-slate-400 transition ${open ? 'rotate-180' : ''}`} fill="currentColor" aria-hidden="true">
          <path d="M5.2 7.5a.75.75 0 0 1 1.06 0L10 11.2l3.74-3.7a.75.75 0 1 1 1.06 1.06l-4.27 4.25a.75.75 0 0 1-1.06 0L5.2 8.56a.75.75 0 0 1 0-1.06Z" />
        </svg>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-navy-900/10">
          <div className="flex items-center gap-3 border-b border-slate-100 p-4">
            <Avatar name={name} photoURL={user.photoURL} className="h-11 w-11 text-base" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-navy-900">{name}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
              <span className="mt-1 inline-block rounded-full bg-navy-50 px-2 py-0.5 text-[11px] font-semibold text-navy-700">
                {role === 'owner' ? 'Owner · full access' : 'Coach'}
              </span>
            </div>
          </div>
          <a role="menuitem" href="/" className="block px-4 py-3 text-sm font-medium text-navy-800 hover:bg-mist">View website</a>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              saveTeamProfile(null);
              signOut(auth);
            }}
            className="block w-full border-t border-slate-100 px-4 py-3 text-left text-sm font-medium text-navy-800 hover:bg-mist"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
