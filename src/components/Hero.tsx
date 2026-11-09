import { hero } from '../content/site';

const base = import.meta.env.BASE_URL;

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pt-20 sm:pt-24">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#eef2f9_1px,transparent_1px),linear-gradient(to_bottom,#eef2f9_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_top_right,black_25%,transparent_70%)]" />
        <div className="absolute -right-32 -top-32 h-[34rem] w-[34rem] rounded-full bg-flame-200/40 blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 h-[28rem] w-[28rem] rounded-full bg-navy-100/60 blur-3xl" />
        <img src={`${base}logo-mark.png`} alt="" className="absolute -right-16 top-28 hidden w-[34rem] opacity-[0.07] lg:block" />
      </div>

      <div className="container-x relative flex min-h-[calc(100svh-6rem)] flex-col justify-center py-20">
        <p className="eyebrow">{hero.eyebrow}</p>
        <h1 className="mt-5 max-w-4xl font-display text-6xl font-extrabold uppercase leading-[0.88] text-navy-900 sm:text-7xl lg:text-8xl">
          {hero.title[0]}
          <br />
          <span className="text-flame-600">{hero.title[1]}</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg">{hero.body}</p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <a href={hero.primaryCta.href} className="btn-primary">
            {hero.primaryCta.label}
            <span aria-hidden="true">→</span>
          </a>
          <a href={hero.secondaryCta.href} className="btn-ghost">
            {hero.secondaryCta.label}
          </a>
        </div>
        <dl className="mt-16 grid max-w-2xl grid-cols-3 gap-6 border-t border-slate-200 pt-8">
          {hero.stats.map((s) => (
            <div key={s.label} className="flex flex-col-reverse">
              <dt className="mt-1 text-xs text-slate-500 sm:text-sm">{s.label}</dt>
              <dd className="font-display text-4xl font-bold text-navy-900 sm:text-5xl">{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
