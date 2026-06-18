import { createFileRoute } from "@tanstack/react-router";

// One-shot demo seeder. Idempotent. Safe to call multiple times.
export const Route = createFileRoute("/api/public/seed-demo")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const employerCoId = "11111111-1111-1111-1111-111111111111";
        const ironGymId = "22222222-0000-0000-0000-000000000001";

        const accounts = [
          { email: "era@perx.demo", password: "PerxDemo!2026", full_name: "Era Bardha", role: "employee" as const, company_id: employerCoId },
          { email: "boss@perx.demo", password: "PerxDemo!2026", full_name: "Arta Hoxha", role: "employer_admin" as const, company_id: employerCoId },
          { email: "gym@perx.demo", password: "PerxDemo!2026", full_name: "Iron Gym Manager", role: "provider_admin" as const, company_id: ironGymId },
        ];

        const results: any[] = [];
        for (const a of accounts) {
          // Check if user exists by listing (admin API)
          const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
          let user = existing.users.find((u) => u.email === a.email);
          if (!user) {
            const { data, error } = await supabaseAdmin.auth.admin.createUser({
              email: a.email,
              password: a.password,
              email_confirm: true,
              user_metadata: { full_name: a.full_name },
            });
            if (error) { results.push({ email: a.email, error: error.message }); continue; }
            user = data.user!;
          }
          // Ensure profile
          await supabaseAdmin.from("profiles").upsert({
            id: user.id,
            full_name: a.full_name,
            employer_company_id: a.role === "employee" ? employerCoId : null,
            monthly_budget_all: 25000,
          });
          // Ensure role
          await supabaseAdmin.from("user_roles").upsert({
            user_id: user.id, role: a.role, company_id: a.company_id,
          }, { onConflict: "user_id,role,company_id" });
          results.push({ email: a.email, ok: true });
        }

        return Response.json({ seeded: results });
      },
    },
  },
});