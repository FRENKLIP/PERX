const ITEMS = [
  "Iron Gym", "Komiteti", "Mullixhiu", "Coolab", "Destil", "Kayo Yoga",
  "Padam", "Era Studio", "Hemingway", "Salt", "Tartine", "Radio Bar",
];

export default function Marquee() {
  const row = [...ITEMS, ...ITEMS];
  return (
    <div className="relative overflow-hidden border-y border-glass-line bg-forest py-6">
      <div className="flex gap-12 whitespace-nowrap animate-[marquee_38s_linear_infinite]">
        {row.map((x, i) => (
          <span key={i} className="font-serif text-3xl md:text-4xl text-bone-soft">
            {x} <span className="text-gold mx-2">·</span>
          </span>
        ))}
      </div>
      <style>{`@keyframes marquee { to { transform: translateX(-50%); } }`}</style>
    </div>
  );
}