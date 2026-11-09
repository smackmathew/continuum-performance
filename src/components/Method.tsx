import { method } from '../content/site';

export default function Method() {
  return (
    <section id="method" className="section border-t border-ink-800 bg-ink-900">
      <div className="container-x">
        <div className="max-w-2xl">
          <p className="eyebrow">{method.eyebrow}</p>
          <h2 className="h2">{method.title}</h2>
          <p className="mt-5 text-lg text-zinc-400">{method.body}</p>
        </div>
        <ol className="relative mt-14 grid gap-px overflow-hidden rounded-xl border border-ink-700 bg-ink-700 sm:grid-cols-2 lg:grid-cols-4">
          {method.steps.map((step, i) => (
            <li key={step.name} className="group bg-ink-900 p-7 transition hover:bg-ink-800">
              <span className="font-display text-5xl font-extrabold text-ink-600 transition group-hover:text-volt-400">
                0{i + 1}
              </span>
              <h3 className="mt-4 font-display text-2xl font-bold uppercase text-white">{step.name}</h3>
              <p className="mt-2 text-zinc-400">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
