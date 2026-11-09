import { faqs } from '../content/site';

export default function Faq() {
  return (
    <section id="faq" className="section">
      <div className="container-x grid gap-12 lg:grid-cols-[1fr_2fr]">
        <div>
          <p className="eyebrow">FAQ</p>
          <h2 className="h2">Questions, answered.</h2>
          <p className="mt-5 text-zinc-400">
            Something else on your mind? <a href="#contact" className="text-volt-400 underline-offset-4 hover:underline">Ask us directly.</a>
          </p>
        </div>
        <div className="divide-y divide-ink-700 border-y border-ink-700">
          {faqs.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-display text-xl font-semibold uppercase text-white [&::-webkit-details-marker]:hidden">
                {f.q}
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-ink-600 text-volt-400 transition group-open:rotate-45" aria-hidden="true">
                  +
                </span>
              </summary>
              <p className="mt-3 max-w-2xl text-zinc-400">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
