import { method } from '../content/site';

export default function Method() {
  return (
    <section id="method" className="on-dark section bg-navy-900 text-navy-200">
      <div className="container-x">
        <div className="max-w-2xl">
          <p className="eyebrow">{method.eyebrow}</p>
          <h2 className="h2">{method.title}</h2>
          <p className="mt-5 text-lg">{method.body}</p>
        </div>
        <ol className="mt-14 grid gap-px overflow-hidden rounded-xl border border-navy-700 bg-navy-700 sm:grid-cols-2 lg:grid-cols-4">
          {method.steps.map((step, i) => (
            <li key={step.name} className="group bg-navy-900 p-7 transition hover:bg-navy-800">
              <span className="font-display text-5xl font-extrabold text-navy-600 transition group-hover:text-flame-400">
                0{i + 1}
              </span>
              <h3 className="mt-4 font-display text-2xl font-bold uppercase text-white">{step.name}</h3>
              <p className="mt-2">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
