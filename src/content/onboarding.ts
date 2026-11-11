// Everything a new client reads and answers on the onboarding form (/start).
// Kate: review the health questions, and replace the PLACEHOLDER waiver below
// with your own (ideally checked by a lawyer) before real clients sign.
// When you change the waiver text, bump WAIVER_VERSION so each signed form
// records which version the client agreed to.

export const HEALTH_QUESTIONS = [
  { id: 'q1', text: 'Has a doctor ever said you have a heart condition or high blood pressure?' },
  { id: 'q2', text: 'Do you feel pain in your chest at rest, during daily activities, or when you exercise?' },
  { id: 'q3', text: 'In the last 12 months, have you lost your balance because of dizziness, or lost consciousness?' },
  { id: 'q4', text: 'Have you been diagnosed with any other chronic medical condition (other than heart disease or high blood pressure)?' },
  { id: 'q5', text: 'Are you currently taking prescribed medication for a chronic medical condition?' },
  {
    id: 'q6',
    text: 'Do you have, or have you had in the last 12 months, a bone, joint or soft-tissue problem (muscle, ligament or tendon) that could get worse with more physical activity?',
  },
  { id: 'q7', text: 'Has a doctor ever said you should only do medically supervised physical activity?' },
] as const;

export type HealthQuestionId = (typeof HEALTH_QUESTIONS)[number]['id'];

export const EXPERIENCE_OPTIONS = [
  { id: 'new', label: 'New to structured training' },
  { id: 'some', label: 'Some experience (on and off)' },
  { id: 'regular', label: 'Train regularly' },
  { id: 'athlete', label: 'Competitive athlete' },
];

export const AVAILABILITY_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const AVAILABILITY_TIMES = ['Early AM', 'Midday', 'Evening'];

export const WAIVER_VERSION = 'placeholder-2026-11';

// PLACEHOLDER: sample wording only, not legal advice. Replace before use.
export const WAIVER_TITLE = 'Assumption of risk, release and waiver of liability';
export const WAIVER_PARAGRAPHS = [
  'PLACEHOLDER WAIVER: replace this text with Continuum Performance’s own waiver before real clients sign it.',
  'I understand that strength training, conditioning and other physical activity involve a risk of injury, including muscle strains, sprains, fractures and, in rare cases, serious injury or death. I am voluntarily participating in activities at Continuum Performance with knowledge of these risks.',
  'I confirm that I have answered the health screening questions truthfully and completely, and that I will tell my coach about any change in my health. If I answered “yes” to any question, I understand I may need clearance from a doctor before training.',
  'I agree to follow my coach’s instructions, use equipment properly, and stop and tell a coach if I feel pain, dizziness or discomfort.',
  'To the fullest extent permitted by law, I release Continuum Performance, its owners, coaches and staff from liability for any injury, loss or damage arising from my participation, except where caused by their gross negligence or willful misconduct.',
  'I consent to emergency medical treatment if needed and understand I am responsible for any resulting costs.',
  'If I am signing on behalf of a participant under 18, I confirm I am their parent or legal guardian and agree to these terms on their behalf.',
];
