import { Heart } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function FavoriteButton({ offerId, size = "md" }: { offerId: string; size?: "sm" | "md" | "lg" }) {
  const qc = useQueryClient();
  const { data: isFav } = useQuery({
    queryKey: ["favorite", offerId],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return false;
      const { data } = await supabase
        .from("favorites")
        .select("offer_id")
        .eq("user_id", u.user.id)
        .eq("offer_id", offerId)
        .maybeSingle();
      return !!data;
    },
  });

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    if (isFav) {
      const { error } = await supabase.from("favorites").delete().eq("user_id", u.user.id).eq("offer_id", offerId);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("favorites").insert({ user_id: u.user.id, offer_id: offerId });
      if (error) return toast.error(error.message);
      toast.success("Saved");
    }
    qc.invalidateQueries({ queryKey: ["favorite", offerId] });
    qc.invalidateQueries({ queryKey: ["saved-offers"] });
  }

  const dim = size === "lg" ? "size-11" : size === "sm" ? "size-8" : "size-9";
  const icon = size === "lg" ? "size-5" : "size-4";

  return (
    <button
      onClick={toggle}
      aria-label={isFav ? "Remove from saved" : "Save"}
      className={`${dim} rounded-full hairline grid place-items-center bg-forest/90 backdrop-blur hover:bg-forest transition-colors`}
    >
      <Heart className={`${icon} ${isFav ? "fill-accent-red text-gold" : "text-bone"}`} />
    </button>
  );
}