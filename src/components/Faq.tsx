import { faqs } from '../content/site';

export default function Faq() {
  return (
    <section id="faq" className="section">
      <div className="container-x grid gap-12 lg:grid-cols-[1fr_2fr]">
        <div>
          <p className="eyebrow">FAQ</p>
          <h2 className="h2">Questions, answered.</h2>
          <p className="mt-5">
            Something else on your mind?{' '}
            <a href="#contact" className="font-semibold text-flame-600 underline-offset-4 hover:underline">Ask us directly.</a>
          </p>
        </div>
        <div className="divide-y divide-slate-200 border-y border-slate-200">
          {faqs.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-display text-xl font-semibold uppercase text-navy-900 [&::-webkit-details-marker]:hidden">
                {f.q}
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-slate-300 text-flame-600 transition group-open:rotate-45 group-open:border-flame-600 group-open:bg-flame-600 group-open:text-white" aria-hidden="true">
                  +
                </span>
              </summary>
              <p className="mt-3 max-w-2xl">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
