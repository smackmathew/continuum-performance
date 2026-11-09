import { testimonials } from '../content/site';

export default function Testimonials() {
  return (
    <section aria-labelledby="testimonials-title" className="section border-y border-ink-800 bg-ink-900">
      <div className="container-x">
        <p className="eyebrow">Members</p>
        <h2 id="testimonials-title" className="h2">The work speaks.</h2>
        <ul className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <li key={i}>
              <figure className="flex h-full flex-col rounded-xl border border-ink-700 bg-ink-950 p-7">
                <span className="font-display text-6xl leading-none text-volt-400" aria-hidden="true">“</span>
                <blockquote className="-mt-4 flex-1 text-lg text-zinc-200">{t.quote}</blockquote>
                <figcaption className="mt-6 border-t border-ink-700 pt-4">
                  <span className="font-semibold text-white">{t.name}</span>
                  <span className="block text-sm text-zinc-400">{t.detail}</span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
