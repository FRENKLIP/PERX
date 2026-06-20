import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const submitCartRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { note?: string; packageName?: string; pointsToUse?: number }) => ({
    note: input?.note ?? "",
    packageName: input?.packageName ?? "",
    pointsToUse: Math.max(0, Math.floor(input?.pointsToUse ?? 0)),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Load profile (for employer) + cart items + offers
    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("employer_company_id, discount_points")
      .eq("id", userId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    const employerId = profile?.employer_company_id;
    if (!employerId) throw new Error("No employer linked to your profile");

    const { data: cartItems, error: cErr } = await supabase
      .from("cart_items")
      .select("id, qty, chosen_provider_id, offers(id,title,price_all,category_slug,provider_company_id)")
      .eq("user_id", userId);
    if (cErr) throw new Error(cErr.message);
    if (!cartItems || cartItems.length === 0) throw new Error("Cart is empty");

    const items = cartItems.filter((it: any) => it.offers);
    const total = items.reduce(
      (s: number, it: any) => s + (it.offers.price_all ?? 0) * (it.qty ?? 1),
      0,
    );

    // Load employer policy through the SECURITY DEFINER helper. Direct column
    // reads on companies are intentionally restricted.
    const { data: policyRows, error: coErr } = await supabase.rpc("get_employee_company_policy" as any, {
      p_company_id: employerId,
    });
    const company = coErr ? null : Array.isArray(policyRows) ? (policyRows[0] ?? null) : policyRows;

    const maxAmt = company?.policy_max_request_all ?? null;
    const allowed = company?.policy_allowed_categories ?? null;
    const autoBelow = company?.policy_auto_approve_below_all ?? null;

    if (maxAmt && total > maxAmt) {
      throw new Error(`Request total exceeds employer cap of ${maxAmt} ALL`);
    }
    if (allowed && allowed.length > 0) {
      const bad = items.filter((it: any) => !allowed.includes(it.offers.category_slug));
      if (bad.length > 0) {
        const names = bad.map((it: any) => it.offers.title).slice(0, 3).join(", ");
        throw new Error(`Not allowed by employer policy: ${names}`);
      }
    }

    const autoApprove = !!(autoBelow && autoBelow > 0 && total <= autoBelow);
    const decidedAt = autoApprove ? new Date().toISOString() : null;

    // Points redemption (1 pt = 1 ALL, capped at 50% of total, capped at balance)
    const balance = profile?.discount_points ?? 0;
    const maxDiscount = Math.floor(total * 0.5);
    const pointsToUse = Math.min(data.pointsToUse, balance, maxDiscount);
    const discountAll = pointsToUse;

    // Create request
    const { data: req, error: rErr } = await supabase
      .from("requests")
      .insert({
        employee_id: userId,
        employer_company_id: employerId,
        total_all: total - discountAll,
        points_redeemed: pointsToUse,
        discount_all: discountAll,
        note: data.note || null,
        ai_package_name: data.packageName || null,
        ...(autoApprove
          ? { status: "approved" as const, decided_at: decidedAt, decided_by: userId }
          : {}),
      })
      .select("id")
      .single();
    if (rErr || !req) throw new Error(rErr?.message ?? "Failed to create request");

    // Resolve provider shares
    const offerIds = items.map((it: any) => it.offers.id);
    const { data: opRows } = offerIds.length
      ? await supabase
          .from("offer_providers")
          .select("offer_id, provider_company_id, share_pct")
          .in("offer_id", offerIds)
      : { data: [] as any[] };

    const rows = items.map((it: any) => {
      const all = (opRows ?? []).filter((r: any) => r.offer_id === it.offers.id);
      const fulfillingId = it.chosen_provider_id ?? it.offers.provider_company_id;
      const row = all.find((r: any) => r.provider_company_id === fulfillingId);
      const share = row?.share_pct ?? 100;
      return {
        request_id: req.id,
        offer_id: it.offers.id,
        provider_company_id: fulfillingId,
        offer_title: it.offers.title,
        price_all: it.offers.price_all,
        qty: it.qty,
        share_pct_snapshot: share,
        ...(autoApprove
          ? {
              payment_status: "simulated_paid" as const,
              redemption_code: `PRK-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
            }
          : {}),
      };
    });

    const { error: iErr } = await supabase.from("request_items").insert(rows);
    if (iErr) throw new Error(iErr.message);

    await supabase.from("cart_items").delete().eq("user_id", userId);

    if (pointsToUse > 0) {
      await supabase
        .from("profiles")
        .update({ discount_points: balance - pointsToUse })
        .eq("id", userId);
      await supabase.from("points_ledger").insert({
        user_id: userId,
        delta: -pointsToUse,
        reason: "cart_redeem",
        ref_id: req.id,
      });
    }

    return { requestId: req.id as string, autoApproved: autoApprove, total };
  });
