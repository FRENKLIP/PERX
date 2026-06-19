import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

type Teammate = { id: string; full_name: string | null; avatar_url: string | null };

export function TransferFundsButton({ remaining }: { remaining: number }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Teammate | null>(null);
  const [amount, setAmount] = useState<string>("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: teammates, isLoading } = useQuery({
    queryKey: ["transfer-teammates"],
    enabled: open,
    queryFn: async (): Promise<Teammate[]> => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) return [];
      const { data: me } = await supabase
        .from("profiles")
        .select("employer_company_id")
        .eq("id", uid)
        .maybeSingle();
      const companyId = me?.employer_company_id;
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("employer_company_id", companyId)
        .neq("id", uid)
        .order("full_name", { ascending: true })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Teammate[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teammates ?? [];
    return (teammates ?? []).filter((t) =>
      (t.full_name ?? "").toLowerCase().includes(q),
    );
  }, [teammates, search]);

  function reset() {
    setSelected(null);
    setAmount("");
    setNote("");
    setSearch("");
  }

  async function onSubmit() {
    if (!selected) return toast.error("Pick a teammate");
    const amt = Math.floor(Number(amount));
    if (!amt || amt <= 0) return toast.error("Enter an amount");
    if (amt > remaining) return toast.error("Amount exceeds your remaining budget");
    setSubmitting(true);
    const { error } = await supabase.rpc("transfer_funds", {
      p_recipient: selected.id,
      p_amount: amt,
      p_note: note || undefined,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success(`Sent ${amt.toLocaleString()} ALL to ${selected.full_name ?? "teammate"}`);
    reset();
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["app-home"] });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-cream/70 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-ink hover:bg-sage hover:text-cream hover:border-sage transition-colors"
        >
          <ArrowRightLeft className="size-3" /> Transfer funds
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer funds</DialogTitle>
          <DialogDescription>
            Send ALL from your monthly budget to a teammate in your company.
          </DialogDescription>
        </DialogHeader>

        {!selected ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search teammates…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-64 overflow-y-auto divide-y rounded-md border">
              {isLoading ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin inline mr-2" /> Loading…
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No teammates found.
                </div>
              ) : (
                filtered.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelected(t)}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/60 transition-colors"
                  >
                    <Avatar className="size-8">
                      {t.avatar_url ? <AvatarImage src={t.avatar_url} /> : null}
                      <AvatarFallback>
                        {(t.full_name ?? "?").slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{t.full_name ?? "Unnamed"}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-md border p-3">
              <Avatar className="size-9">
                {selected.avatar_url ? <AvatarImage src={selected.avatar_url} /> : null}
                <AvatarFallback>
                  {(selected.full_name ?? "?").slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="text-sm font-medium">{selected.full_name ?? "Unnamed"}</div>
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline"
                  onClick={() => setSelected(null)}
                >
                  Change
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Amount (ALL)
              </label>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={remaining}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
              />
              <div className="text-xs text-muted-foreground">
                Available: {remaining.toLocaleString()} ALL
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Note (optional)
              </label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={120}
                placeholder="Lunch tomorrow…"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!selected || submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}