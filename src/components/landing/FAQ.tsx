import { useState } from "react";
import { SectionLabel } from "./HowItWorks";

const ITEMS = [
  { q: "Is this actually tax-efficient in Albania?", a: "Yes. PERX categorises every spend under recognised welfare expense categories, with full audit trails for your accountant." },
  { q: "How fast can a team onboard?", a: "Most companies go live in under a week. Import your team, set budgets, done." },
  { q: "How do providers get paid?", a: "PERX pays providers directly when an employer approves a request — no employee out-of-pocket, no expense forms." },
  { q: "Available languages?", a: "Albanian and English, end-to-end. Provider listings can be bilingual." },
  { q: "Security & data?", a: "Encrypted at rest, row-level security on every record, GDPR-aligned. You own your data." },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="max-w-4xl mx-auto px-6 py-32">
      <SectionLabel index="05" label="Questions" />
      <h2 className="font-serif text-5xl md:text-7xl tracking-tight mt-6 leading-[1]">
        Things worth <em className="text-accent-red">asking.</em>
      </h2>
      <div className="mt-16 divide-y divide-border-soft border-y border-border-soft">
        {ITEMS.map((it, i) => {
          const isOpen = open === i;
          return (
            <div key={it.q}>
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full py-7 flex items-center justify-between gap-6 text-left group"
              >
                <span className="font-serif text-2xl md:text-3xl leading-tight">{it.q}</span>
                <span className={`text-accent-red text-2xl transition-transform ${isOpen ? "rotate-45" : ""}`}>+</span>
              </button>
              <div className={`grid transition-all duration-500 ${isOpen ? "grid-rows-[1fr] opacity-100 pb-7" : "grid-rows-[0fr] opacity-0"}`}>
                <div className="overflow-hidden">
                  <p className="text-ink-soft max-w-2xl leading-relaxed">{it.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}