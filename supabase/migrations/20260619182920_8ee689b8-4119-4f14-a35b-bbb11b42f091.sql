
-- Pair Perks schema

ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS pair_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pair_bonus_pct integer NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS pair_bonus_note text;

CREATE TYPE public.pair_invitation_status AS ENUM ('pending','accepted','declined','expired');

CREATE TABLE public.pair_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employer_company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider_company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  status public.pair_invitation_status NOT NULL DEFAULT 'pending',
  bonus_pct integer NOT NULL DEFAULT 15,
  bonus_note text,
  scheduled_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '48 hours'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (inviter_id <> invitee_id)
);

CREATE INDEX pair_invitations_invitee_idx ON public.pair_invitations(invitee_id, status);
CREATE INDEX pair_invitations_inviter_idx ON public.pair_invitations(inviter_id, status);

GRANT SELECT, INSERT, UPDATE ON public.pair_invitations TO authenticated;
GRANT ALL ON public.pair_invitations TO service_role;

ALTER TABLE public.pair_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read their invitations"
  ON public.pair_invitations FOR SELECT TO authenticated
  USING (inviter_id = auth.uid() OR invitee_id = auth.uid());

CREATE POLICY "Inviter can create invitations"
  ON public.pair_invitations FOR INSERT TO authenticated
  WITH CHECK (
    inviter_id = auth.uid()
    AND inviter_id <> invitee_id
    AND employer_company_id = (SELECT employer_company_id FROM public.profiles WHERE id = auth.uid())
    AND employer_company_id = (SELECT employer_company_id FROM public.profiles WHERE id = invitee_id)
  );

CREATE POLICY "Invitee can respond"
  ON public.pair_invitations FOR UPDATE TO authenticated
  USING (invitee_id = auth.uid() AND status = 'pending')
  WITH CHECK (invitee_id = auth.uid() AND status IN ('accepted','declined'));

ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS pair_invitation_id uuid REFERENCES public.pair_invitations(id) ON DELETE SET NULL;

-- profiles: allow teammates in same employer to read each other's basic info for the picker
CREATE POLICY "Teammates can read directory"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    employer_company_id IS NOT NULL
    AND employer_company_id = (SELECT employer_company_id FROM public.profiles p2 WHERE p2.id = auth.uid())
  );
