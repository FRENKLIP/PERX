import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { QuestsPanel } from "@/components/employee/QuestsPanel";

export const Route = createFileRoute("/_authenticated/quests")({
  head: () => ({ meta: [{ title: "Quests — PERX" }] }),
  beforeLoad: async () => {
    const { requireRole } = await import("@/lib/roles");
    await requireRole("employee");
  },
  component: QuestsPage,
});

function QuestsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null)); }, []);
  return (
    <div className="max-w-7xl mx-auto px-6 pt-6 pb-16">
      {userId && <QuestsPanel userId={userId} />}
    </div>
  );
}