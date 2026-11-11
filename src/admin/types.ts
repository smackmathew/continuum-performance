import type { Timestamp } from 'firebase/firestore';

export type Role = 'owner' | 'staff';

export const STATUSES = [
  { id: 'new', label: 'New' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'assessment', label: 'Assessment booked' },
  { id: 'joined', label: 'Joined' },
  { id: 'not_a_fit', label: 'Not a fit' },
] as const;
export type Status = (typeof STATUSES)[number]['id'];
export const statusLabel = (s: string) => STATUSES.find((x) => x.id === s)?.label ?? s;

export type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  interest: string;
  message: string;
  createdAt: Timestamp | null;
  status: Status;
  assignedTo?: string | null;
  readAt?: Timestamp | null;
  updatedAt?: Timestamp;
  updatedBy?: string;
};

export type Note = {
  id: string;
  text: string;
  authorUid: string;
  authorName: string;
  createdAt: Timestamp | null;
};

export type TeamMember = { uid: string; name: string; email: string; role: Role; photoURL?: string | null };
