import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Upload, Trash2 } from "lucide-react";
import { z } from "zod";

export type EmployeeRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  locale: string | null;
  monthly_budget_all: number | null;
  employer_company_id: string | null;
};

const schema = z.object({
  full_name: z.string().trim().max(120).nullable(),
  locale: z.enum(["sq", "en"]),
  monthly_budget_all: z.number().int().min(0).max(10_000_000),
  avatar_url: z.string().trim().max(1000).nullable(),
});

export function EmployeeEditSheet({
  employee,
  open,
  onOpenChange,
  onSaved,
}: {
  employee: EmployeeRow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [locale, setLocale] = useState<"sq" | "en">("sq");
  const [budget, setBudget] = useState<string>("0");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!employee) return;
    setFullName(employee.full_name ?? "");
    setLocale((employee.locale as "sq" | "en") ?? "sq");
    setBudget(String(employee.monthly_budget_all ?? 0));
    setAvatarUrl(employee.avatar_url ?? "");
    setConfirmRemove(false);
  }, [employee]);

  if (!employee) return null;

  async function handleUpload(file: File) {
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Image must be under 4MB");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${employee!.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });
    if (error) {
      toast.error(error.message);
      setUploading(false);
      return;
    }
    const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    setAvatarUrl(url);
    setUploading(false);
  }

  async function save() {
    const parsed = schema.safeParse({
      full_name: fullName.trim() || null,
      locale,
      monthly_budget_all: Math.round(Number(budget.replace(/[^0-9]/g, "")) || 0),
      avatar_url: avatarUrl.trim() || null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("profiles").update(parsed.data).eq("id", employee!.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Employee updated");
    onSaved();
    onOpenChange(false);
  }

  async function removeFromCompany() {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ employer_company_id: null }).eq("id", employee!.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Removed from company");
    onSaved();
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit employee</SheetTitle>
          <SheetDescription>Update profile details and monthly wallet cap.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarImage src={avatarUrl || undefined} alt={fullName} />
              <AvatarFallback>{(fullName || "?").slice(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <><Loader2 className="size-3.5 mr-1.5 animate-spin" /> Uploading…</> : <><Upload className="size-3.5 mr-1.5" /> Upload</>}
              </Button>
              {avatarUrl && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setAvatarUrl("")}>
                  <Trash2 className="size-3.5 mr-1.5" /> Remove
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="emp-name">Full name</Label>
            <Input id="emp-name" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={120} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="emp-avatar">Avatar URL</Label>
            <Input id="emp-avatar" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://…" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="emp-locale">Language</Label>
              <select
                id="emp-locale"
                value={locale}
                onChange={(e) => setLocale(e.target.value as "sq" | "en")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="sq">Shqip</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-budget">Monthly budget (ALL)</Label>
              <Input
                id="emp-budget"
                inputMode="numeric"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={save} disabled={saving || uploading} className="flex-1">
              {saving ? <><Loader2 className="size-4 mr-2 animate-spin" /> Saving…</> : "Save changes"}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          </div>

          <div className="border-t pt-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft mb-2">Danger zone</div>
            {confirmRemove ? (
              <div className="space-y-2">
                <p className="text-sm text-ink-soft">This unlinks them from your company. They keep their account but stop receiving your perks.</p>
                <div className="flex gap-2">
                  <Button variant="destructive" size="sm" onClick={removeFromCompany} disabled={saving}>Yes, remove</Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmRemove(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setConfirmRemove(true)}>
                <Trash2 className="size-3.5 mr-1.5" /> Remove from company
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}