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

Submissions are saved to the **`leads`** collection in Firestore in the Firebase project named move-strong
(project ID `move-strong-fitness`). View them in the [Firebase console](https://console.firebase.google.com/project/move-strong-fitness/firestore)
→ Firestore → `leads` (newest have `status: "new"`).

`firestore.rules` lets the public site *add* a lead (with checked fields and a server timestamp)
and nothing else: no browser can read, change or delete leads, and every other collection is
closed. `npm test` checks those rules against the Firestore emulator (needs Java 11+).

The site needs the project's web-app config at build time (these values are public by design;
the rules are what protect the data). In the Firebase console → Project settings → General → Your
apps, add a **Web app** if there isn't one, then set these as repository variables (Settings →
Secrets and variables → Actions → **Variables**):

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_APP_ID`

For local builds put the same values in `.env.local` (see `.env.example`). Built without them, the
form falls back to opening the visitor's email app.

## Developing

```bash
npm ci
npm run dev       # http://localhost:5173
npm test          # Firestore rules tests against the emulator
npm run build     # type-check and build to dist/
```

## Deploying

`.github/workflows/deploy.yml` tests and builds every push and pull request, and deploys `main` to
**Firebase Hosting** at https://continuum-performance.web.app along with the Firestore rules. The
project's other address, https://move-strong-fitness.web.app, permanently redirects there. It signs in with a
service-account key stored as a repository secret:

1. Firebase console → Project settings → **Service accounts** → **Generate new private key**.
   If a deploy fails with a permission error, the project's Owner needs to give that service
   account (its `client_email` in the key file) the **Firebase Admin** and **Service Usage Consumer**
   roles in Google Cloud → IAM.
2. GitHub → Settings → Secrets and variables → Actions → **New repository secret**: name
   `FIREBASE_SERVICE_ACCOUNT`, value = the whole contents of the downloaded JSON file. Then delete
   the file from your computer.

A custom domain is added in the Firebase console → Hosting → **Add custom domain**.

## Cleaning out old data

The `move-strong-fitness` project was used before. **Actions → Firebase inventory & cleanup → Run
workflow** lists what's in it: Firestore collections and document counts, Authentication users,
Storage files, Cloud Functions and Hosting sites. Run it once with no boxes ticked to see what's
there, then again with the boxes for what to delete and `move-strong-fitness` typed in the confirmation
box. The `leads` collection is never deleted. Deleting is permanent.
