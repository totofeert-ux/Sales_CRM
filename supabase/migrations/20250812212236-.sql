-- Create clients and deals tables with RLS and lifecycle automation triggers
-- 1) Clients table
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_name text,
  contact_name text,
  email text,
  phone text,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  lifecycle_stage text NOT NULL DEFAULT 'qualifying' CHECK (lifecycle_stage IN ('qualifying','qualified','won','lost','unqualified')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Deals table
CREATE TABLE IF NOT EXISTS public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status IN ('lead','in-progress','proposal-sent','negotiation','closed-won','closed-lost')),
  expected_close_date date NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- RLS policies for clients
DO $$ BEGIN
  CREATE POLICY "Select own clients"
  ON public.clients
  FOR SELECT
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Insert own clients"
  ON public.clients
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Update own clients"
  ON public.clients
  FOR UPDATE
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Delete own clients"
  ON public.clients
  FOR DELETE
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- RLS policies for deals
DO $$ BEGIN
  CREATE POLICY "Select own deals"
  ON public.deals
  FOR SELECT
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Insert own deals and link to own client"
  ON public.deals
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_id AND c.user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Update own deals"
  ON public.deals
  FOR UPDATE
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Delete own deals"
  ON public.deals
  FOR DELETE
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- updated_at triggers
DO $$ BEGIN
  CREATE TRIGGER set_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER set_deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Lifecycle recompute function (security definer)
CREATE OR REPLACE FUNCTION public.recompute_contact_lifecycle(p_contact_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_has_won boolean := false;
  v_has_active boolean := false;
  v_has_lost boolean := false;
  v_new_stage text;
BEGIN
  SELECT
    COALESCE(bool_or(status = 'closed-won'), false),
    COALESCE(bool_or(status IN ('lead','in-progress','proposal-sent','negotiation')), false),
    COALESCE(bool_or(status = 'closed-lost'), false)
  INTO v_has_won, v_has_active, v_has_lost
  FROM public.deals
  WHERE client_id = p_contact_id
    AND user_id = p_user_id;

  IF v_has_won THEN
    v_new_stage := 'won';
  ELSIF v_has_active THEN
    v_new_stage := 'qualified';
  ELSIF v_has_lost THEN
    v_new_stage := 'lost';
  ELSE
    -- No deals: keep current stage (do nothing)
    RETURN;
  END IF;

  UPDATE public.clients
     SET lifecycle_stage = v_new_stage,
         updated_at = now()
   WHERE id = p_contact_id
     AND user_id = p_user_id;
END;
$$;

-- Trigger function to recompute lifecycle on deals changes
CREATE OR REPLACE FUNCTION public.trg_deals_recompute_contact_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    PERFORM public.recompute_contact_lifecycle(OLD.client_id, OLD.user_id);
  ELSE
    PERFORM public.recompute_contact_lifecycle(NEW.client_id, NEW.user_id);
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger on deals table
DROP TRIGGER IF EXISTS deals_recompute_contact_lifecycle_aiud ON public.deals;
CREATE TRIGGER deals_recompute_contact_lifecycle_aiud
AFTER INSERT OR UPDATE OR DELETE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.trg_deals_recompute_contact_lifecycle();