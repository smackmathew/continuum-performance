import { programs } from '../content/site';

export default function Programs() {
  return (
    <section id="programs" className="section">
      <div className="container-x">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="eyebrow">Programs</p>
            <h2 className="h2">Coaching for every point on the continuum.</h2>
          </div>
          <a href="#contact" className="btn-ghost shrink-0">Not sure? Ask a coach</a>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {programs.map((p) => (
            <article key={p.name} className="flex flex-col rounded-xl border border-ink-700 bg-ink-900 p-7 transition hover:-translate-y-0.5 hover:border-volt-500/60">
              <p className="text-sm font-medium text-volt-400">{p.audience}</p>
              <h3 className="mt-2 font-display text-3xl font-bold uppercase text-white">{p.name}</h3>
              <p className="mt-3 text-zinc-400">{p.body}</p>
              <ul className="mt-6 flex flex-wrap gap-2">
                {p.points.map((pt) => (
                  <li key={pt} className="rounded-full border border-ink-600 px-3 py-1 text-sm text-zinc-300">
                    {pt}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
