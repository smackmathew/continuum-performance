import { business } from '../content/site';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="border-t border-ink-800 py-12">
      <div className="container-x flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div>
          <Logo />
          <p className="mt-3 font-display uppercase tracking-wide text-zinc-500">{business.tagline}</p>
        </div>
        <div className="flex gap-6 text-sm text-zinc-400">
          <a href={business.social.instagram} target="_blank" rel="noreferrer" className="hover:text-volt-300">Instagram</a>
          <a href={business.social.youtube} target="_blank" rel="noreferrer" className="hover:text-volt-300">YouTube</a>
          <a href={`mailto:${business.email}`} className="hover:text-volt-300">Email</a>
        </div>
      </div>
      <p className="container-x mt-10 text-xs text-zinc-600">
        © {new Date().getFullYear()} {business.name}. All rights reserved.
      </p>
    </footer>
  );
}
