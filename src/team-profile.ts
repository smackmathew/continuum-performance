// A tiny record of who is signed in to the team hub on this device, so the
// public site can show their photo in the menu without loading Firebase.
// It holds only a display name and photo URL; access is still checked by
// Firebase sign-in and the security rules when the hub opens.

const KEY = 'cp.teamProfile';

export type TeamProfile = { name: string; photoURL: string | null };

export function readTeamProfile(): TeamProfile | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    return v && typeof v.name === 'string' ? { name: v.name, photoURL: typeof v.photoURL === 'string' ? v.photoURL : null } : null;
  } catch {
    return null;
  }
}

export function saveTeamProfile(p: TeamProfile | null) {
  try {
    if (p) localStorage.setItem(KEY, JSON.stringify(p));
    else localStorage.removeItem(KEY);
  } catch {
    // Private mode or storage blocked: the menu just shows the Team icon.
  }
}
