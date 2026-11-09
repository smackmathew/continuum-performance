import { business } from '../content/site';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="border-t-4 border-flame-600 bg-navy-950 py-12 text-navy-200">
      <div className="container-x flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div>
          <Logo light className="h-12" />
          <p className="mt-4 font-display uppercase tracking-wide text-navy-300">{business.tagline}</p>
        </div>
        <div className="flex gap-6 text-sm">
          <a href={business.social.instagram} target="_blank" rel="noreferrer" className="hover:text-flame-300">Instagram</a>
          <a href={business.social.youtube} target="_blank" rel="noreferrer" className="hover:text-flame-300">YouTube</a>
          <a href={`mailto:${business.email}`} className="hover:text-flame-300">Email</a>
        </div>
      </div>
      <p className="container-x mt-10 text-xs text-navy-400">
        © {new Date().getFullYear()} {business.name}. All rights reserved.
      </p>
    </footer>
  );
}
