import { hero } from '../content/site';

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pt-16">
      {/* Background: grid + glow, no photo required. Drop a hero image in /public and add it here if you like. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a1e25_1px,transparent_1px),linear-gradient(to_bottom,#1a1e25_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_top_right,black_20%,transparent_70%)]" />
        <div className="absolute -right-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-volt-500/10 blur-3xl" />
        <svg className="absolute -right-24 top-24 hidden h-[34rem] w-[34rem] text-ink-700 lg:block" viewBox="0 0 200 200" fill="none">
          <circle cx="100" cy="100" r="96" stroke="currentColor" strokeWidth="1" />
          <circle cx="100" cy="100" r="70" stroke="currentColor" strokeWidth="1" />
          <path d="M150 50a70 70 0 1 0 0 100" stroke="#d4ff3f" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>

      <div className="container-x relative flex min-h-[calc(100svh-4rem)] flex-col justify-center py-20">
        <p className="eyebrow">{hero.eyebrow}</p>
        <h1 className="mt-5 max-w-4xl font-display text-6xl font-extrabold uppercase leading-[0.88] text-white sm:text-7xl lg:text-8xl">
          {hero.title[0]}
          <br />
          <span className="text-volt-400">{hero.title[1]}</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-zinc-300">{hero.body}</p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <a href={hero.primaryCta.href} className="btn-primary">
            {hero.primaryCta.label}
            <span aria-hidden="true">→</span>
          </a>
          <a href={hero.secondaryCta.href} className="btn-ghost">
            {hero.secondaryCta.label}
          </a>
        </div>
        <dl className="mt-16 grid max-w-2xl grid-cols-3 gap-6 border-t border-ink-700 pt-8">
          {hero.stats.map((s) => (
            <div key={s.label} className="flex flex-col-reverse">
              <dt className="mt-1 text-xs text-zinc-400 sm:text-sm">{s.label}</dt>
              <dd className="font-display text-4xl font-bold text-white sm:text-5xl">{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
