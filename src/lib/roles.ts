import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export type Role = "employee" | "employer_admin" | "provider_admin";

export async function getMyRoles(): Promise<Role[]> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
  return (data ?? []).map((r) => r.role as Role);
}

export function landingFor(roles: Role[]): "/app" | "/employer" | "/provider" {
  if (roles.includes("employer_admin")) return "/employer";
  if (roles.includes("provider_admin")) return "/provider";
  return "/app";
}

export function isEmployeeRoles(roles: Role[]) {
  return roles.length === 0 || roles.includes("employee");
}

export async function requireRole(allowed: Role[] | "employee") {
  const roles = await getMyRoles();
  const ok = allowed === "employee" ? isEmployeeRoles(roles) : roles.some((r) => (allowed as Role[]).includes(r));
  if (!ok) throw redirect({ to: landingFor(roles) });
}