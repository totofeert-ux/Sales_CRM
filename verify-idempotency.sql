-- Check if request_id column exists
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema='public' 
  and table_name='deals' 
  and column_name='request_id';

-- If missing, add it:
-- alter table public.deals add column if not exists request_id uuid;
-- create unique index if not exists deals_request_id_key
--   on public.deals(request_id) where request_id is not null;

-- Check for any triggers that might cause duplicates
select t.tgname, pg_get_triggerdef(t.oid)
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname='public' and c.relname='deals' and not t.tgisinternal;
