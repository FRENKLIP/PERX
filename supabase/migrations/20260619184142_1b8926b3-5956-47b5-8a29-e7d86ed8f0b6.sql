
CREATE TABLE public.wallet_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  amount_all integer NOT NULL CHECK (amount_all > 0),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.wallet_transfers TO authenticated;
GRANT ALL ON public.wallet_transfers TO service_role;

ALTER TABLE public.wallet_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sender or recipient can view transfers"
  ON public.wallet_transfers FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE INDEX idx_wallet_transfers_sender ON public.wallet_transfers(sender_id, created_at DESC);
CREATE INDEX idx_wallet_transfers_recipient ON public.wallet_transfers(recipient_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.transfer_funds(p_recipient uuid, p_amount integer, p_note text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender uuid := auth.uid();
  v_sender_company uuid;
  v_recipient_company uuid;
  v_sender_budget integer;
  v_transfer_id uuid;
BEGIN
  IF v_sender IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;
  IF p_recipient = v_sender THEN
    RAISE EXCEPTION 'Cannot transfer to yourself';
  END IF;

  SELECT employer_company_id, monthly_budget_all
    INTO v_sender_company, v_sender_budget
    FROM public.profiles WHERE id = v_sender FOR UPDATE;

  SELECT employer_company_id INTO v_recipient_company
    FROM public.profiles WHERE id = p_recipient FOR UPDATE;

  IF v_sender_company IS NULL OR v_recipient_company IS NULL OR v_sender_company <> v_recipient_company THEN
    RAISE EXCEPTION 'Recipient must be in the same company';
  END IF;

  IF COALESCE(v_sender_budget, 0) < p_amount THEN
    RAISE EXCEPTION 'Insufficient funds';
  END IF;

  UPDATE public.profiles SET monthly_budget_all = COALESCE(monthly_budget_all, 0) - p_amount WHERE id = v_sender;
  UPDATE public.profiles SET monthly_budget_all = COALESCE(monthly_budget_all, 0) + p_amount WHERE id = p_recipient;

  INSERT INTO public.wallet_transfers (sender_id, recipient_id, company_id, amount_all, note)
    VALUES (v_sender, p_recipient, v_sender_company, p_amount, NULLIF(trim(p_note), ''))
    RETURNING id INTO v_transfer_id;

  RETURN v_transfer_id;
END;
$$;

REVOKE ALL ON FUNCTION public.transfer_funds(uuid, integer, text) FROM public;
GRANT EXECUTE ON FUNCTION public.transfer_funds(uuid, integer, text) TO authenticated;
