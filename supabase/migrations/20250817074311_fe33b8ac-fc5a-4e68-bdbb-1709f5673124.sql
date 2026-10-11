-- Add new columns to deals table for stage management
ALTER TABLE public.deals 
ADD COLUMN IF NOT EXISTS lost_reason text,
ADD COLUMN IF NOT EXISTS closed_at timestamptz;

-- Update existing status values to new standardized stages
UPDATE public.deals 
SET status = CASE 
  WHEN status = 'lead' THEN 'Prospecting'
  WHEN status = 'in-progress' THEN 'Qualification'
  WHEN status = 'proposal-sent' THEN 'Proposal Sent'
  WHEN status = 'negotiation' THEN 'Negotiation'
  WHEN status = 'closed-won' THEN 'Won'
  WHEN status = 'closed-lost' THEN 'Lost'
  ELSE 'Prospecting'
END;

-- Set closed_at for existing won/lost deals
UPDATE public.deals 
SET closed_at = updated_at 
WHERE status IN ('Won', 'Lost') AND closed_at IS NULL;

-- Update the lifecycle automation function to use new stage names
CREATE OR REPLACE FUNCTION public.recompute_contact_lifecycle(p_contact_id uuid, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_has_won boolean := false;
  v_has_active boolean := false;
  v_has_lost boolean := false;
  v_new_stage text;
BEGIN
  SELECT
    COALESCE(bool_or(status = 'Won'), false),
    COALESCE(bool_or(status IN ('Prospecting','Qualification','Proposal Sent','Negotiation','Verbal Commitment')), false),
    COALESCE(bool_or(status = 'Lost'), false)
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
$function$;