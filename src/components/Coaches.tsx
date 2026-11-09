import { coaches } from '../content/site';

export default function Coaches() {
  return (
    <section id="coaches" className="section border-y border-ink-800 bg-ink-900">
      <div className="container-x">
        <div className="max-w-2xl">
          <p className="eyebrow">Coaches</p>
          <h2 className="h2">Certified. Experienced. In your corner.</h2>
        </div>
        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {coaches.map((c, i) => (
            <li key={i} className="overflow-hidden rounded-xl border border-ink-700 bg-ink-950">
              {/* Replace with <img src="./coach-name.jpg" alt="..." className="aspect-[4/3] w-full object-cover" /> */}
              <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-ink-800 to-ink-950">
                <span className="font-display text-6xl font-extrabold text-ink-600">{c.initials}</span>
              </div>
              <div className="p-6">
                <h3 className="font-display text-2xl font-bold uppercase text-white">{c.name}</h3>
                <p className="text-sm text-volt-400">
                  {c.role} · {c.credentials}
                </p>
                <p className="mt-3 text-zinc-400">{c.bio}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
