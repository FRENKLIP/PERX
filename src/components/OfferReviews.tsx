import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Star } from "lucide-react";
import { toast } from "sonner";

export function OfferReviews({ offerId }: { offerId: string }) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data } = useQuery({
    queryKey: ["reviews", offerId],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data: reviews } = await supabase
        .from("offer_reviews")
        .select("id, rating, body, created_at, user_id, profiles:user_id(full_name, avatar_url)")
        .eq("offer_id", offerId)
        .order("created_at", { ascending: false });
      const list = reviews ?? [];
      const mine = list.find((r: any) => r.user_id === u.user?.id);
      const avg = list.length ? list.reduce((s: number, r: any) => s + r.rating, 0) / list.length : 0;
      return { list, mine, avg, count: list.length, userId: u.user?.id };
    },
  });

  async function submit() {
    if (!rating || !data?.userId) return;
    setSubmitting(true);
    const { error } = await supabase
      .from("offer_reviews")
      .upsert(
        { offer_id: offerId, user_id: data.userId, rating, body: body || null, updated_at: new Date().toISOString() },
        { onConflict: "offer_id,user_id" },
      );
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Review posted");
    setRating(0); setBody("");
    qc.invalidateQueries({ queryKey: ["reviews", offerId] });
  }

  async function remove(id: string) {
    await supabase.from("offer_reviews").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["reviews", offerId] });
  }

  const avg = data?.avg ?? 0;
  const count = data?.count ?? 0;

  return (
    <section className="mt-16">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft mb-2">Reviews</div>
          <div className="flex items-baseline gap-3">
            <span className="font-serif text-4xl">{count ? avg.toFixed(1) : "—"}</span>
            <div className="flex">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className={`size-4 ${n <= Math.round(avg) ? "fill-accent-red text-accent-red" : "text-ink-soft/30"}`} />
              ))}
            </div>
            <span className="text-sm text-ink-soft">{count} review{count === 1 ? "" : "s"}</span>
          </div>
        </div>
      </div>

      {!data?.mine && (
        <div className="hairline rounded-3xl p-6 bg-white mb-8">
          <div className="text-sm font-semibold mb-3">Leave a review</div>
          <div className="flex gap-1 mb-4" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onMouseEnter={() => setHover(n)}
                onClick={() => setRating(n)}
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                className="p-1"
              >
                <Star className={`size-7 transition-colors ${n <= (hover || rating) ? "fill-accent-red text-accent-red" : "text-ink-soft/30"}`} />
              </button>
            ))}
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Tell other employees what to expect (optional)"
            rows={3}
            className="w-full bg-paper rounded-xl px-4 py-3 text-sm outline-none placeholder:text-ink-soft/60 resize-none"
          />
          <button
            onClick={submit}
            disabled={!rating || submitting}
            className="mt-3 bg-ink text-cream rounded-full px-6 py-2.5 text-sm font-semibold disabled:opacity-40 hover:bg-accent-red transition-colors"
          >
            {submitting ? "Posting…" : "Post review"}
          </button>
        </div>
      )}

      {count === 0 ? (
        <div className="hairline rounded-3xl p-10 text-center text-ink-soft text-sm">
          No reviews yet. Be the first.
        </div>
      ) : (
        <div className="space-y-4">
          {(data?.list ?? []).map((r: any) => (
            <div key={r.id} className="hairline rounded-2xl p-5 bg-white">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-full bg-ink text-cream grid place-items-center text-[11px] font-bold">
                    {(r.profiles?.full_name ?? "??").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{r.profiles?.full_name ?? "Anonymous"}</div>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={`size-3 ${n <= r.rating ? "fill-accent-red text-accent-red" : "text-ink-soft/30"}`} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-ink-soft">
                  {new Date(r.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </div>
              </div>
              {r.body && <p className="text-sm text-ink/90 leading-relaxed mt-2">{r.body}</p>}
              {r.user_id === data?.userId && (
                <button onClick={() => remove(r.id)} className="text-[11px] text-ink-soft hover:text-accent-red mt-3">
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}