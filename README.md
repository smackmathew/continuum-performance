# Continuum Performance

Marketing website for Continuum Performance: a single-page site for a strength, conditioning and
athletic-performance gym. React + TypeScript (Vite) and Tailwind CSS.

Sections: hero, the Continuum Method (Assess → Build → Perform → Sustain), programs, coaches,
memberships/pricing, member testimonials, FAQ, and a contact / free-assessment form.

## Editing the content

Every word, price and contact detail is in **`src/content/site.ts`**. Anything marked
`PLACEHOLDER` there is sample content: the address, phone, email, hours, coaches, prices, stats
and testimonials all need replacing with the real thing before launch. Coach photos go in
`public/` (see the comment in `src/components/Coaches.tsx`).

## Brand

- **Logo** (`public/`): `logo.png` (dark, for white backgrounds), `logo-white.png` (for navy
  backgrounds), `logo-mark.png` (the wing-C mark alone) and the favicons, all made from the supplied
  black-on-white logo with transparent backgrounds. The logo is tinted the brand navy (`#0b1730`).
- **Colors** (`tailwind.config.js`): white background, **navy** (`navy-900` `#0b1730`) for headings and
  dark sections, **flame** red-orange (`flame-600` `#d63a0f`) for buttons and accents, and `mist`
  (`#f5f7fb`) for light-gray sections. Use `flame-600` or darker for text and buttons on white and
  `flame-400` on navy; those pairings meet WCAG AA contrast.

## Contact form

By default the form opens the visitor's email app, addressed to the email in `site.ts`. To have
submissions arrive without that step, create a form at a service such as Formspree or Basin and
set its URL as `VITE_CONTACT_ENDPOINT` (in `.env.local` for local builds, or as a repository
variable under Settings → Secrets and variables → Actions → Variables for the deployed site).

## Developing

```bash
npm ci
npm run dev       # http://localhost:5173
npm run build     # type-check and build to dist/
npm run preview   # serve the built site
```

## Deploying

`.github/workflows/deploy.yml` builds every push and pull request, and deploys `main` to GitHub
Pages. Turn Pages on once under Settings → Pages → Source: **GitHub Actions**. The build uses
relative paths, so `dist/` also works as-is on Netlify, Vercel, Firebase Hosting or any static host;
point a custom domain at whichever you choose.
