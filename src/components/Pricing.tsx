import { pricing } from '../content/site';

export default function Pricing() {
  return (
    <section id="pricing" className="section">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Memberships</p>
          <h2 className="h2">Simple pricing. No contracts.</h2>
          <p className="mt-5 text-zinc-400">{pricing.note}</p>
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {pricing.plans.map((plan) => (
            <article
              key={plan.name}
              className={`relative flex flex-col rounded-xl border p-8 ${
                plan.featured ? 'border-volt-400 bg-ink-900 shadow-[0_0_60px_-20px] shadow-volt-500/40' : 'border-ink-700 bg-ink-900/50'
              }`}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-8 rounded-full bg-volt-400 px-3 py-0.5 font-display text-sm font-bold uppercase tracking-wide text-ink-950">
                  Most popular
                </span>
              )}
              <h3 className="font-display text-2xl font-bold uppercase text-white">{plan.name}</h3>
              <p className="mt-1 text-sm text-zinc-400">{plan.blurb}</p>
              <p className="mt-6 flex items-baseline gap-1">
                <span className="font-display text-6xl font-extrabold text-white">{plan.price}</span>
                <span className="text-zinc-400">{plan.period}</span>
              </p>
              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-3 text-zinc-300">
                    <svg viewBox="0 0 20 20" className="mt-0.5 h-5 w-5 shrink-0 text-volt-400" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z" clipRule="evenodd" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <a href="#contact" className={`mt-8 w-full ${plan.featured ? 'btn-primary' : 'btn-ghost'}`}>
                Get started
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
