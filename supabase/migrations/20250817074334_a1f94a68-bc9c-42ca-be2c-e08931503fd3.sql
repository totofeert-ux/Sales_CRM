-- First, drop the existing status check constraint if it exists
ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_status_check;

-- Add new columns to deals table for stage management
ALTER TABLE public.deals 
ADD COLUMN IF NOT EXISTS lost_reason text,
ADD COLUMN IF NOT EXISTS closed_at timestamptz;

-- Create new check constraint with updated stage values
ALTER TABLE public.deals 
ADD CONSTRAINT deals_status_check 
CHECK (status IN ('Prospecting', 'Qualification', 'Proposal Sent', 'Negotiation', 'Verbal Commitment', 'Won', 'Lost'));

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