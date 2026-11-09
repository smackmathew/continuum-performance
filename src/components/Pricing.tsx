import { pricing } from '../content/site';

export default function Pricing() {
  return (
    <section id="pricing" className="section">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Memberships</p>
          <h2 className="h2">Simple pricing. No contracts.</h2>
          <p className="mt-5">{pricing.note}</p>
        </div>
        <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-3">
          {pricing.plans.map((plan) => {
            const f = plan.featured;
            return (
              <article
                key={plan.name}
                className={`relative flex flex-col rounded-xl p-8 ${
                  f ? 'bg-navy-900 text-navy-200 shadow-xl shadow-navy-900/20 ring-2 ring-flame-500' : 'border border-slate-200 bg-white shadow-sm'
                }`}
              >
                {f && (
                  <span className="absolute -top-3 left-8 rounded-full bg-flame-600 px-3 py-0.5 font-display text-sm font-bold uppercase tracking-wide text-white">
                    Most popular
                  </span>
                )}
                <h3 className={`font-display text-2xl font-bold uppercase ${f ? 'text-white' : 'text-navy-900'}`}>{plan.name}</h3>
                <p className={`mt-1 text-sm ${f ? 'text-navy-200' : 'text-slate-500'}`}>{plan.blurb}</p>
                <p className="mt-6 flex items-baseline gap-1">
                  <span className={`font-display text-6xl font-extrabold ${f ? 'text-white' : 'text-navy-900'}`}>{plan.price}</span>
                  <span className={f ? 'text-navy-200' : 'text-slate-500'}>{plan.period}</span>
                </p>
                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((feat) => (
                    <li key={feat} className={`flex gap-3 ${f ? 'text-navy-100' : 'text-slate-700'}`}>
                      <svg viewBox="0 0 20 20" className={`mt-0.5 h-5 w-5 shrink-0 ${f ? 'text-flame-400' : 'text-flame-600'}`} fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z" clipRule="evenodd" />
                      </svg>
                      {feat}
                    </li>
                  ))}
                </ul>
                <a href="#contact" className={`mt-8 w-full ${f ? 'btn-primary' : 'btn-ghost'}`}>
                  Get started
                </a>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
