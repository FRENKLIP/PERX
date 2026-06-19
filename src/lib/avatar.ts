/**
 * Deterministic fake avatar URL. Same seed always returns the same portrait,
 * so users get a stable "face" without uploading anything.
 *
 * Uses DiceBear's `notionists-neutral` style — flat, editorial, fits the
 * cream/ink palette better than cartoony defaults.
 */
const BG = "fef7ec,f3e9d2,e8e2d3,e3dfd4,d6e4d0,f3d6d6,e9d8ef,d9e3f0";

export function fakeAvatarUrl(seed: string | null | undefined, size = 96): string {
  const s = encodeURIComponent((seed ?? "anon").trim() || "anon");
  return `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${s}&radius=50&backgroundType=solid&backgroundColor=${BG}&size=${size}`;
}

/** Resolve an avatar: real avatar_url wins, otherwise a deterministic fake. */
export function avatarFor(
  opts: { avatar_url?: string | null; seed: string | null | undefined },
  size = 96,
): string {
  if (opts.avatar_url && opts.avatar_url.trim()) return opts.avatar_url;
  return fakeAvatarUrl(opts.seed, size);
}