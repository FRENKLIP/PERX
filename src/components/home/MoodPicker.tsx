import { Zap, Coffee, Users, BookOpen, Gift } from "lucide-react";

type Mood = { id: string; label: string; icon: typeof Gift; cats: string[] };
export const MOODS: Mood[] = [
  { id: "all", label: "All", icon: Gift, cats: [] },
  { id: "energized", label: "Energized", icon: Zap, cats: ["wellness", "fitness"] },
  { id: "cozy", label: "Cozy", icon: Coffee, cats: ["food", "wellness", "lifestyle"] },
  { id: "social", label: "Social", icon: Users, cats: ["food", "family"] },
  { id: "curious", label: "Curious", icon: BookOpen, cats: ["learning", "tech"] },
  { id: "treat", label: "Treat", icon: Gift, cats: ["travel", "lifestyle"] },
];

export type MoodId = string;

export function moodMatch(mood: MoodId, category?: string | null) {
  if (mood === "all" || !category) return true;
  const m = MOODS.find((x) => x.id === mood);
  if (!m || m.cats.length === 0) return true;
  return m.cats.includes(category);
}

export function MoodPicker({ value, onChange }: { value: MoodId; onChange: (v: MoodId) => void }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1">
      {MOODS.map((m) => {
        const Icon = m.icon;
        const active = value === m.id;
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            className={`shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold border transition-all duration-300 ${
              active
                ? "bg-ink text-cream border-ink scale-[1.02] shadow-[0_8px_22px_-12px_rgba(0,0,0,0.4)]"
                : "bg-cream border-border-soft text-ink hover:border-sage hover:text-sage-deep hover:-translate-y-0.5"
            }`}
          >
            <Icon className="size-4" />
            {m.label}
          </button>
        );
      })}
    </div>
  );
}