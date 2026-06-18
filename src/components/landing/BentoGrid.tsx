import { useReveal } from "./useReveal";
import { SectionLabel } from "./HowItWorks";

export default function BentoGrid() {
  const { ref, shown } = useReveal<HTMLDivElement>();
  return (
    <section ref={ref} className="max-w-7xl mx-auto px-6 py-32">
      <SectionLabel index="03" label="What you get" />
      <h2 className="font-serif text-5xl md:text-7xl tracking-tight max-w-3xl mt-6 leading-[1]">
        Built for how teams <em className="text-gold">actually</em> live.
      </h2>

      <div className={`mt-20 grid grid-cols-1 md:grid-cols-6 gap-5 transition-opacity duration-700 ${shown ? "opacity-100" : "opacity-0"}`}>
        <Tile className="md:col-span-4 md:row-span-2 bg-emerald-deep text-bone min-h-[360px]">
          <Eyebrow tone="cream">Tax-efficient</Eyebrow>
          <h3 className="font-serif text-4xl md:text-5xl leading-tight mt-3 max-w-md">
            Every lek spent stays out of payroll tax — by design.
          </h3>
          <p className="text-bone/60 text-sm mt-6 max-w-sm">Categorised, audited, ready for your accountant.</p>
        </Tile>
        <Tile className="md:col-span-2 bg-gold text-bone">
          <Eyebrow tone="cream">AI concierge</Eyebrow>
          <p className="font-serif text-2xl leading-snug mt-3">"Plan me a 200-EUR wellness week."</p>
        </Tile>
        <Tile className="md:col-span-2 bg-emerald-glow text-bone">
          <Eyebrow tone="cream">Local first</Eyebrow>
          <p className="font-serif text-2xl leading-snug mt-3">120+ Tirana providers, hand-curated.</p>
        </Tile>
        <Tile className="md:col-span-3 bg-obsidian">
          <Eyebrow>Live dashboard</Eyebrow>
          <p className="font-serif text-2xl leading-snug mt-3">Spend trend, approval rate, category mix — in real time.</p>
        </Tile>
        <Tile className="md:col-span-3 bg-gold-soft text-bone">
          <Eyebrow tone="cream">Instant codes</Eyebrow>
          <p className="font-serif text-2xl leading-snug mt-3">Redemption codes the moment an approval lands.</p>
        </Tile>
        <Tile className="md:col-span-6 bg-forest hairline">
          <Eyebrow>Bilingual</Eyebrow>
          <p className="font-serif text-3xl leading-snug mt-3">Shqip · English — the whole product.</p>
        </Tile>
      </div>
    </section>
  );
}

function Tile({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-3xl p-8 md:p-10 flex flex-col justify-between ${className}`}>{children}</div>;
}
function Eyebrow({ children, tone = "ink" }: { children: React.ReactNode; tone?: "ink" | "cream" }) {
  return (
    <div className={`text-[10px] font-bold uppercase tracking-[0.22em] ${tone === "cream" ? "text-bone/70" : "text-bone-soft"}`}>
      {children}
    </div>
  );
}