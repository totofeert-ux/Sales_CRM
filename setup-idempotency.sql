-- Add idempotency column to deals table
alter table public.deals
add column if not exists request_id uuid;

-- Create unique index for idempotency
create unique index if not exists deals_request_id_key
  on public.deals (request_id)
  where request_id is not null;

-- Verify the column exists
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'deals'
  and column_name = 'request_id';

-- Clean up any existing duplicates (keep the oldest record)
delete from deals d
using (
  select id,
         row_number() over (partition by title, client_id, status, expected_close_date order by created_at) as rn
  from deals
) t
where d.id = t.id
  and t.rn > 1;

-- Check for remaining duplicates
select title, client_id, status, expected_close_date, count(*) c
from deals
group by 1,2,3,4
having count(*) > 1
order by c desc;
