import { useEffect, useState } from 'react';
import { readTeamProfile, type TeamProfile } from '../team-profile';

/**
 * Top-right link to the team hub. Shows the signed-in team member's photo when
 * they've used the hub on this device; otherwise a small "Team" person icon.
 */
export default function TeamButton() {
  const [profile, setProfile] = useState<TeamProfile | null>(null);
  const [photoFailed, setPhotoFailed] = useState(false);

  useEffect(() => {
    setProfile(readTeamProfile());
    const onStorage = (e: StorageEvent) => e.key === 'cp.teamProfile' && setProfile(readTeamProfile());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  if (profile) {
    const initials = profile.name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
    return (
      <a href="/admin/" title={`Team hub (${profile.name})`} aria-label={`Team hub, signed in as ${profile.name}`} className="shrink-0 rounded-full ring-2 ring-transparent transition hover:ring-flame-500">
        {profile.photoURL && !photoFailed ? (
          <img src={profile.photoURL} alt="" referrerPolicy="no-referrer" onError={() => setPhotoFailed(true)} className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <span className="grid h-9 w-9 place-items-center rounded-full bg-navy-800 text-sm font-semibold text-white">{initials || '?'}</span>
        )}
      </a>
    );
  }

  return (
    <a href="/admin/" title="Team sign-in" aria-label="Team sign-in" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-navy-900">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="12" cy="8" r="3.75" />
        <path d="M4.75 19.5a7.25 7.25 0 0 1 14.5 0" strokeLinecap="round" />
      </svg>
    </a>
  );
}
