// All of the site's words, prices and contact details live in this file.
// Anything marked PLACEHOLDER is sample content: replace it with the real thing
// before the site goes live.

export const business = {
  name: 'Continuum Performance',
  shortName: 'Continuum',
  tagline: 'Train for the long game.',
  // PLACEHOLDER contact details
  email: 'hello@continuumperformance.com',
  phone: '(555) 010-2040',
  address: {
    street: '100 Example Street, Suite 2',
    city: 'Your City',
    region: 'ST',
    postal: '00000',
  },
  mapUrl: 'https://maps.google.com/?q=100+Example+Street',
  hours: [
    { days: 'Mon – Fri', time: '5:30 am – 8:30 pm' },
    { days: 'Saturday', time: '7:00 am – 1:00 pm' },
    { days: 'Sunday', time: 'Open gym 8:00 am – 12:00 pm' },
  ],
  social: {
    instagram: 'https://instagram.com/',
    youtube: 'https://youtube.com/',
  },
};

export const hero = {
  eyebrow: 'Strength · Conditioning · Athletic Performance',
  title: ['Train for', 'the long game.'],
  body:
    'Coached training that meets you where you are and keeps you progressing — whether you are chasing a roster spot, a new deadlift PR, or just want to move well for decades.',
  primaryCta: { label: 'Book a free assessment', href: '#contact' },
  secondaryCta: { label: 'Explore programs', href: '#programs' },
  // PLACEHOLDER stats
  stats: [
    { value: '1:6', label: 'Max coach-to-athlete ratio' },
    { value: '12+', label: 'Years coaching' },
    { value: '400+', label: 'Athletes trained' },
  ],
};

export const method = {
  eyebrow: 'The Continuum Method',
  title: 'One path, four phases, no plateaus.',
  body:
    'Progress isn’t a straight line, but it should never be random. Every member moves through the same cycle, and every cycle starts from real data.',
  steps: [
    {
      name: 'Assess',
      body: 'A movement screen, strength baseline and conversation about your goals, history and schedule.',
    },
    {
      name: 'Build',
      body: 'A plan built around you: strength, mobility and conditioning in the right doses for your starting point.',
    },
    {
      name: 'Perform',
      body: 'Coached sessions, measurable targets and regular testing so you can see the needle move.',
    },
    {
      name: 'Sustain',
      body: 'Re-assess, adjust and keep going. Deloads, injury prevention and habits that last beyond the season.',
    },
  ],
};

export const programs = [
  {
    name: 'Athlete Development',
    audience: 'Ages 12 – college',
    body:
      'Speed, power and strength for youth, high-school and collegiate athletes, periodized around the competitive season.',
    points: ['Speed & agility', 'Olympic lifting progressions', 'In-season maintenance'],
  },
  {
    name: 'Strength & Conditioning',
    audience: 'Adults, all levels',
    body:
      'Small-group coached training. Barbell strength, conditioning and mobility, programmed in progressive blocks.',
    points: ['Max 6 per coach', 'Tracked progress', 'Scalable for any level'],
  },
  {
    name: '1:1 Personal Training',
    audience: 'Individual coaching',
    body:
      'Fully individual programming and undivided attention. Ideal for specific goals, return to training, or busy schedules.',
    points: ['Custom program', 'Flexible scheduling', 'Nutrition check-ins'],
  },
  {
    name: 'Return to Performance',
    audience: 'Post-rehab',
    body:
      'Bridging the gap between physical therapy and full training, working alongside your clinician when needed.',
    points: ['Graduated loading', 'Clinician communication', 'Re-injury prevention'],
  },
];

// PLACEHOLDER coaches: swap in real names, bios and photos (put images in /public).
export const coaches = [
  {
    name: 'Coach Name',
    role: 'Founder & Head Coach',
    credentials: 'CSCS, USAW-L1',
    bio: 'A short bio: background, coaching philosophy and the athletes they love working with.',
    initials: 'HC',
  },
  {
    name: 'Coach Name',
    role: 'Performance Coach',
    credentials: 'CSCS',
    bio: 'A short bio: background, coaching philosophy and the athletes they love working with.',
    initials: 'PC',
  },
  {
    name: 'Coach Name',
    role: 'Strength Coach',
    credentials: 'NASM-CPT',
    bio: 'A short bio: background, coaching philosophy and the athletes they love working with.',
    initials: 'SC',
  },
];

// PLACEHOLDER pricing
export const pricing = {
  note: 'Every membership starts with a free 45-minute assessment. No contracts; cancel with 30 days’ notice.',
  plans: [
    {
      name: 'Open Gym',
      price: '$89',
      period: '/month',
      blurb: 'For self-directed lifters who want a serious space.',
      features: ['Unlimited open-gym hours', 'Full equipment access', 'Quarterly assessment'],
      featured: false,
    },
    {
      name: 'Small Group',
      price: '$189',
      period: '/month',
      blurb: 'Our most popular way to train.',
      features: [
        'Unlimited coached sessions',
        'Progressive programming',
        'Open-gym access',
        'Assessment every 8 weeks',
      ],
      featured: true,
    },
    {
      name: '1:1 Coaching',
      price: '$75',
      period: '/session',
      blurb: 'Packages of 8, 12 or 16 sessions available.',
      features: ['Fully individual program', 'Flexible scheduling', 'Open-gym access', 'Nutrition check-ins'],
      featured: false,
    },
  ],
};

// PLACEHOLDER testimonials: replace with real quotes from members who agreed to be quoted.
export const testimonials = [
  {
    quote: 'Replace this with a real member quote about their results and experience.',
    name: 'Member name',
    detail: 'Member since 20XX',
  },
  {
    quote: 'Replace this with a real athlete or parent quote about the athlete program.',
    name: 'Member name',
    detail: 'Athlete parent',
  },
  {
    quote: 'Replace this with a real quote from someone who came back from an injury.',
    name: 'Member name',
    detail: 'Return to Performance',
  },
];

export const faqs = [
  {
    q: 'I’m out of shape. Is this for me?',
    a: 'Yes. Everyone starts with an assessment and every session is scaled to the person doing it. Our coaches care about where you are going, not where you start.',
  },
  {
    q: 'What happens at the free assessment?',
    a: 'About 45 minutes: a conversation about your goals and history, a movement screen, and a few baseline tests. You leave with a recommendation, whether or not you join.',
  },
  {
    q: 'Do you work with injured athletes?',
    a: 'Our Return to Performance program bridges the gap after physical therapy. We don’t diagnose or treat injuries, and we’re happy to coordinate with your clinician.',
  },
  {
    q: 'How old do young athletes need to be?',
    a: 'Athlete Development starts at 12. Younger athletes train in age-appropriate groups focused on movement quality, coordination and confidence.',
  },
  {
    q: 'Is there a contract?',
    a: 'No long-term contracts. Memberships are month-to-month with 30 days’ notice to cancel.',
  },
];

export const contact = {
  title: 'Start with a free assessment.',
  body: 'Tell us a little about yourself and a coach will get back to you within one business day.',
  interests: ['Athlete Development', 'Strength & Conditioning', '1:1 Personal Training', 'Return to Performance', 'Not sure yet'],
};
