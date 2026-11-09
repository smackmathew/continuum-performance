import { business } from '../content/site';

const base = import.meta.env.BASE_URL;

/** The full Continuum Performance lockup. `light` is the white version for navy backgrounds. */
export default function Logo({ light = false, className = 'h-12 sm:h-16' }: { light?: boolean; className?: string }) {
  return (
    <a href="#top" className="inline-flex shrink-0 items-center" aria-label={`${business.name} home`}>
      <img src={`${base}${light ? 'logo-white.png' : 'logo.png'}`} alt={business.name} width={900} height={288} className={`w-auto ${className}`} />
    </a>
  );
}
