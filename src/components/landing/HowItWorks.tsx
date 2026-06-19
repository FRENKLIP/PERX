import { useReveal } from "./useReveal";

const STEPS = [
  { n: "01", title: "Browse Tirana", body: "Employees pick gyms, meals, weekends, and courses from real providers, in Albanian or English." },
  { n: "02", title: "One-click approve", body: "HR sees every request in a clean queue. Approve, decline, or set rules — done in seconds." },
  { n: "03", title: "Paid straight out", body: "PERX pays the provider directly. Tax-efficient, fully traceable, zero paperwork." },
];

export default function HowItWorks() {
  const { ref, shown } = useReveal<HTMLDivElement>();
  return (
    <section ref={ref} className="max-w-7xl mx-auto px-6 py-32">
      <SectionLabel index="02" label="How it works" />
      <h2 className="font-serif text-5xl md:text-7xl tracking-tight max-w-3xl mt-6 leading-[1]">
        Three moves. <em className="text-accent-red">No paperwork.</em>
      </h2>
      <div className="mt-20 grid md:grid-cols-3 gap-px bg-border-soft hairline rounded-[2rem] overflow-hidden">
        {STEPS.map((s, i) => (
          <div
            key={s.n}
            className={`bg-cream p-10 md:p-12 transition-all duration-700 ${shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
            style={{ transitionDelay: `${i * 140}ms` }}
          >
            <div className="inline-grid place-items-center size-16 rounded-2xl bg-sage-soft text-sage-deep font-serif text-3xl mb-8 tabular-nums">{s.n}</div>
            <h3 className="font-serif text-2xl mb-3 leading-tight">{s.title}</h3>
            <p className="text-ink-soft text-sm leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function SectionLabel({ index, label }: { index: string; label: string }) {
  return (
    <div className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-[0.24em] text-ink-soft">
      <span className="text-sage-deep tabular-nums flex items-center gap-2"><span className="inline-block size-1.5 rounded-full bg-sage" />Issue {index}</span>
      <span className="h-px flex-1 max-w-32 bg-border-soft" />
      <span>{label}</span>
    </div>
  );
}