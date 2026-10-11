-- Fix stages constraints and defaults to match canonical values
-- This migration ensures database constraints match the frontend constants

-- DEALS: status constraint + default
ALTER TABLE public.deals
  DROP CONSTRAINT IF EXISTS deals_status_check;

ALTER TABLE public.deals
  ADD CONSTRAINT deals_status_check
  CHECK (status IN ('lead','prospecting','qualified','negotiation','won','lost'));

ALTER TABLE public.deals
  ALTER COLUMN status SET DEFAULT 'lead';

-- CONTACTS/CLIENTS: lifecycle constraint + default
-- Update 'former' to 'churned' to match canonical values
UPDATE public.clients 
SET lifecycle_stage = 'churned' 
WHERE lifecycle_stage = 'former';

ALTER TABLE public.clients
  DROP CONSTRAINT IF EXISTS clients_lifecycle_stage_check;

ALTER TABLE public.clients
  ADD CONSTRAINT clients_lifecycle_stage_check
  CHECK (lifecycle_stage IN ('lead','prospect','qualified','customer','churned'));

ALTER TABLE public.clients
  ALTER COLUMN lifecycle_stage SET DEFAULT 'lead';

-- Update the lifecycle mapping function to use 'churned' instead of 'former'
CREATE OR REPLACE FUNCTION map_deal_status_to_lifecycle(d_status TEXT)
RETURNS TEXT AS $$
SELECT CASE d_status
  WHEN 'lead'         THEN 'lead'
  WHEN 'prospecting'  THEN 'prospect'
  WHEN 'qualified'    THEN 'qualified'
  WHEN 'negotiation'  THEN 'qualified'
  WHEN 'won'          THEN 'customer'
  WHEN 'lost'         THEN 'lead'     -- lost does NOT cause downgrade
  ELSE 'lead'
END;
$$ LANGUAGE sql IMMUTABLE;

-- Update the rank mapping in the lifecycle update function
CREATE OR REPLACE FUNCTION update_contact_lifecycle(p_contact_id UUID)
RETURNS VOID AS $$
DECLARE
  suggested TEXT;
  current   TEXT;
  locked    BOOLEAN;
  -- rank helper: lead=1, prospect=2, qualified=3, customer=4, churned=0 (churned is manual only)
  rank_current INT;
  rank_suggested INT;
  rank_map CONSTANT JSONB := '{
    "churned": 0, "lead": 1, "prospect": 2, "qualified": 3, "customer": 4
  }'::jsonb;
BEGIN
  SELECT lifecycle_stage, lifecycle_locked
  INTO current, locked
  FROM clients WHERE id = p_contact_id;

  IF locked THEN
    RETURN;
  END IF;

  SELECT compute_contact_lifecycle(p_contact_id) INTO suggested;

  IF suggested IS NULL THEN
    RETURN;
  END IF;

  SELECT (rank_map ->> current)::INT, (rank_map ->> suggested)::INT
  INTO rank_current, rank_suggested;

  IF rank_suggested > rank_current THEN
    UPDATE clients SET lifecycle_stage = suggested WHERE id = p_contact_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

