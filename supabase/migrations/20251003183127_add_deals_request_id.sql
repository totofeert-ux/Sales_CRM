-- Add idempotency key to deals
alter table public.deals
add column if not exists request_id uuid;

-- make it unique, but nullable so existing rows are fine
create unique index if not exists deals_request_id_key
  on public.deals (request_id)
  where request_id is not null;
