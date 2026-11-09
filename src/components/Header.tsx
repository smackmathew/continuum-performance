import { useEffect, useState } from 'react';
import Logo from './Logo';

const links = [
  { href: '#method', label: 'Method' },
  { href: '#programs', label: 'Programs' },
  { href: '#coaches', label: 'Coaches' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 bg-white/95 backdrop-blur transition ${
        scrolled || open ? 'border-b border-slate-200 shadow-sm' : 'border-b border-transparent'
      }`}
    >
      <div className="container-x flex h-20 items-center justify-between sm:h-24">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-semibold text-navy-800 transition hover:text-flame-600">
              {l.label}
            </a>
          ))}
          <a href="#contact" className="btn-primary !py-2 !text-base">
            Free assessment
          </a>
        </nav>
        <button
          type="button"
          className="rounded p-2 text-navy-900 md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((o) => !o)}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>
      {open && (
        <nav id="mobile-nav" className="container-x pb-6 md:hidden" aria-label="Mobile">
          <ul className="flex flex-col gap-1">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} onClick={() => setOpen(false)} className="block rounded px-2 py-3 font-display text-xl uppercase text-navy-900 hover:text-flame-600">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <a href="#contact" onClick={() => setOpen(false)} className="btn-primary mt-4 w-full">
            Book a free assessment
          </a>
        </nav>
      )}
    </header>
  );
}
