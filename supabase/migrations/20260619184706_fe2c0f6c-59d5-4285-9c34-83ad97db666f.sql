DROP TABLE IF EXISTS public.pair_invitations CASCADE;
ALTER TABLE public.offers DROP COLUMN IF EXISTS pair_enabled, DROP COLUMN IF EXISTS pair_bonus_pct, DROP COLUMN IF EXISTS pair_bonus_note;