import { business } from '../content/site';

export default function Logo({ className = '' }: { className?: string }) {
  return (
    <a href="#top" className={`flex items-center gap-2.5 ${className}`} aria-label={`${business.name} home`}>
      <svg viewBox="0 0 64 64" className="h-8 w-8" aria-hidden="true">
        <path d="M44 20a16 16 0 1 0 0 24" fill="none" stroke="#d4ff3f" strokeWidth="7" strokeLinecap="round" />
        <circle cx="46" cy="32" r="4.5" fill="#d4ff3f" />
      </svg>
      <span className="font-display text-xl font-bold uppercase leading-none tracking-wide text-white">
        Continuum<span className="block text-[0.7rem] font-semibold tracking-[0.35em] text-zinc-400">Performance</span>
      </span>
    </a>
  );
}
