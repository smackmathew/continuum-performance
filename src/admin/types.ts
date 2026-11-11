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
  clientId?: string | null;
};

export type Note = {
  id: string;
  text: string;
  authorUid: string;
  authorName: string;
  createdAt: Timestamp | null;
};

export type TeamMember = { uid: string; name: string; email: string; role: Role; photoURL?: string | null };

export const CHECKLIST = [
  { id: 'assessmentBooked', label: 'Assessment booked' },
  { id: 'assessmentDone', label: 'Assessment done' },
  { id: 'intake', label: 'Intake questionnaire' },
  { id: 'healthWaiver', label: 'Health screen & waiver signed' },
  { id: 'membership', label: 'Membership chosen' },
  { id: 'firstSession', label: 'First session' },
  { id: 'checkIn30', label: '30-day check-in' },
] as const;
export type ChecklistStep = (typeof CHECKLIST)[number]['id'];

export type Client = {
  id: string;
  name: string;
  email: string;
  phone: string;
  assignedTo: string | null;
  leadId: string | null;
  membership: string;
  checklist: Partial<Record<ChecklistStep, Timestamp | null>>;
  onboarding: { inviteId?: string | null; status?: 'none' | 'sent' | 'submitted' | 'revoked'; sentAt?: Timestamp | null; submittedAt?: Timestamp | null };
  healthFlag: boolean;
  createdAt: Timestamp | null;
  createdBy: string;
  updatedAt?: Timestamp;
  updatedBy?: string;
};

export type Invite = {
  id: string;
  clientId: string;
  firstName: string;
  status: 'open' | 'submitted' | 'revoked';
  createdAt: Timestamp | null;
  expiresAt: Timestamp;
  submittedAt?: Timestamp | null;
};

export type SubmissionData = {
  about: { fullName: string; dob: string; email: string; phone: string; emergencyName: string; emergencyPhone: string };
  goals: { goals: string; experience: string; sport: string; injuries: string; availability: string[]; heardFrom: string };
  health: { answers: Record<string, boolean>; details: string };
  waiver: { agreed: boolean; signedName: string; signer: 'self' | 'guardian'; version: string };
  submittedAt: Timestamp | null;
};
