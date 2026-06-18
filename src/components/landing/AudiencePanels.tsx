import { useRef } from "react";
import { useReveal } from "./useReveal";
import { SectionLabel } from "./HowItWorks";

const PANELS = [
  {
    tag: "For employees",
    title: "Spend like it's your own card.",
    bullets: ["Browse 120+ providers", "AI builds packages for you", "Redeem in seconds"],
    tone: "cream" as const,
    image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1000",
  },
  {
    tag: "For employers",
    title: "Welfare that pays itself back.",
    bullets: ["Set budgets per team", "Approve in one click", "Live dashboards & exports"],
    tone: "ink" as const,
    image: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1000",
  },
  {
    tag: "For providers",
    title: "Get discovered, get paid.",
    bullets: ["List your space free", "Reach 100s of teams", "Paid on approval, no chasing"],
    tone: "cream" as const,
    image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1000",
  },
];

export default function AudiencePanels() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-32">
      <SectionLabel index="04" label="For everyone in the loop" />
      <h2 className="font-serif text-5xl md:text-7xl tracking-tight max-w-3xl mt-6 leading-[1]">
        One product. <em className="text-accent-red">Three jobs.</em>
      </h2>
      <div className="mt-20 space-y-6">
        {PANELS.map((p, i) => (
          <Panel key={p.tag} {...p} index={i} />
        ))}
      </div>
    </section>
  );
}

function Panel({
  tag, title, bullets, tone, image, index,
}: typeof PANELS[number] & { index: number }) {
  const { ref, shown } = useReveal<HTMLDivElement>(0.2);
  const cardRef = useRef<HTMLDivElement>(null);

  function onMove(e: React.MouseEvent) {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(1000px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
  }
  function onLeave() {
    if (cardRef.current) cardRef.current.style.transform = "perspective(1000px) rotateY(0) rotateX(0)";
  }

  const dark = tone === "ink";
  const reverse = index % 2 === 1;

  return (
    <div
      ref={ref}
      className={`rounded-[2rem] overflow-hidden p-10 md:p-16 grid md:grid-cols-2 gap-10 items-center transition-all duration-700 ${shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${dark ? "bg-ink text-cream" : "bg-paper text-ink"}`}
    >
      <div className={reverse ? "md:order-2" : ""}>
        <div className={`text-[10px] font-bold uppercase tracking-[0.24em] mb-6 ${dark ? "text-accent-orange" : "text-accent-red"}`}>{tag}</div>
        <h3 className="font-serif text-4xl md:text-6xl leading-[1.02] tracking-tight">{title}</h3>
        <ul className="mt-8 space-y-3">
          {bullets.map((b) => (
            <li key={b} className={`flex items-center gap-3 text-sm ${dark ? "text-cream/80" : "text-ink-soft"}`}>
              <span className={`h-px w-6 ${dark ? "bg-accent-orange" : "bg-accent-red"}`} />
              {b}
            </li>
          ))}
        </ul>
      </div>
      <div
        className={reverse ? "md:order-1" : ""}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{ perspective: 1000 }}
      >
        <div
          ref={cardRef}
          className="rounded-2xl overflow-hidden aspect-[5/4] shadow-[0_40px_80px_-30px_rgba(20,15,10,0.4)] transition-transform duration-300"
        >
          <img src={image} alt="" className="w-full h-full object-cover" />
        </div>
      </div>
    </div>
  );
}