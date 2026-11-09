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
            <article key={p.name} className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-0.5 hover:border-flame-300 hover:shadow-md">
              <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-flame-600 to-flame-400 opacity-0 transition group-hover:opacity-100" />
              <p className="text-sm font-semibold text-flame-600">{p.audience}</p>
              <h3 className="mt-2 font-display text-3xl font-bold uppercase text-navy-900">{p.name}</h3>
              <p className="mt-3">{p.body}</p>
              <ul className="mt-6 flex flex-wrap gap-2">
                {p.points.map((pt) => (
                  <li key={pt} className="rounded-full bg-navy-50 px-3 py-1 text-sm font-medium text-navy-700">
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
