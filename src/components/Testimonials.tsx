import { testimonials } from '../content/site';

export default function Testimonials() {
  return (
    <section aria-labelledby="testimonials-title" className="on-dark section bg-navy-900 text-navy-200">
      <div className="container-x">
        <p className="eyebrow">Members</p>
        <h2 id="testimonials-title" className="h2">The work speaks.</h2>
        <ul className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <li key={i}>
              <figure className="flex h-full flex-col rounded-xl border border-navy-700 bg-navy-800/60 p-7">
                <span className="font-display text-6xl leading-none text-flame-400" aria-hidden="true">“</span>
                <blockquote className="-mt-4 flex-1 text-lg text-white">{t.quote}</blockquote>
                <figcaption className="mt-6 border-t border-navy-700 pt-4">
                  <span className="font-semibold text-white">{t.name}</span>
                  <span className="block text-sm text-navy-200">{t.detail}</span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
