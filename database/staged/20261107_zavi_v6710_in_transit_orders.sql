-- ZAVI ONE V67.10 — in-transit purchase orders, partial receiving and landed cost.
-- Stock is posted ONLY by the authenticated owner through zavi_v671_receive_in_transit.
create table if not exists public.zavi_in_transit_orders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.zavi_workspaces(id) on delete cascade,
  destination_warehouse_id uuid not null,
  supplier_name text not null check (length(btrim(supplier_name)) between 1 and 120),
  country_name text not null check (length(btrim(country_name)) between 1 and 80),
  currency_code text not null default 'AFN' check (currency_code ~ '^[A-Z]{3}$'),
  exchange_rate numeric(24,8) not null default 1 check (exchange_rate > 0),
  purchase_total_original numeric(20,4) not null default 0 check (purchase_total_original >= 0),
  freight_original numeric(20,4) not null default 0 check (freight_original >= 0),
  customs_original numeric(20,4) not null default 0 check (customs_original >= 0),
  other_costs_original numeric(20,4) not null default 0 check (other_costs_original >= 0),
  tracking_number text check (tracking_number is null or length(tracking_number) <= 120),
  carrier text check (carrier is null or length(carrier) <= 120),
  expected_date date,
  status text not null default 'ordered' check (status in ('draft','ordered','shipped','partially_received','received','cancelled')),
  notes text check (notes is null or length(notes) <= 1200),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (destination_warehouse_id,workspace_id)
    references public.zavi_warehouses(id,workspace_id)
);

create table if not exists public.zavi_in_transit_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  workspace_id uuid not null,
  product_ref text,
  product_name text not null check (length(btrim(product_name)) between 1 and 160),
  sku text check (sku is null or length(sku) <= 100),
  ordered_qty numeric(20,4) not null check (ordered_qty > 0),
  received_qty numeric(20,4) not null default 0 check (received_qty >= 0),
  unit_price_original numeric(20,4) not null default 0 check (unit_price_original >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, order_id, workspace_id),
  foreign key (order_id,workspace_id)
    references public.zavi_in_transit_orders(id,workspace_id) on delete cascade
);

create table if not exists public.zavi_in_transit_receipts (
  id uuid primary key,
  order_id uuid not null,
  line_id uuid not null,
  workspace_id uuid not null,
  warehouse_id uuid not null,
  product_ref text not null,
  quantity numeric(20,4) not null check (quantity > 0),
  discrepancy_qty numeric(20,4) not null default 0,
  note text check (note is null or length(note) <= 500),
  warehouse_movement_id uuid not null unique,
  received_at timestamptz not null default now(),
  created_by uuid not null,
  foreign key (order_id,workspace_id)
    references public.zavi_in_transit_orders(id,workspace_id),
  foreign key (line_id,order_id,workspace_id)
    references public.zavi_in_transit_lines(id,order_id,workspace_id),
  foreign key (warehouse_id,workspace_id)
    references public.zavi_warehouses(id,workspace_id)
);

create table if not exists public.zavi_in_transit_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  workspace_id uuid not null,
  event_type text not null check (event_type in ('created','tracking_update','status_update','partial_received','received','discrepancy','note')),
  message text check (message is null or length(message) <= 500),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details)='object'),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  foreign key (order_id,workspace_id)
    references public.zavi_in_transit_orders(id,workspace_id) on delete cascade
);

create index if not exists zavi_transit_orders_workspace_status_idx
 on public.zavi_in_transit_orders(workspace_id,status,updated_at desc);
create index if not exists zavi_transit_orders_tracking_idx
 on public.zavi_in_transit_orders(workspace_id,tracking_number)
 where tracking_number is not null;
create index if not exists zavi_transit_lines_order_idx
 on public.zavi_in_transit_lines(workspace_id,order_id);
create index if not exists zavi_transit_receipts_order_idx
 on public.zavi_in_transit_receipts(workspace_id,order_id,received_at);
create index if not exists zavi_transit_events_order_idx
 on public.zavi_in_transit_events(workspace_id,order_id,created_at desc);

alter table public.zavi_in_transit_orders enable row level security;
alter table public.zavi_in_transit_lines enable row level security;
alter table public.zavi_in_transit_receipts enable row level security;
alter table public.zavi_in_transit_events enable row level security;

revoke all on public.zavi_in_transit_orders, public.zavi_in_transit_lines,
 public.zavi_in_transit_receipts, public.zavi_in_transit_events from anon;
revoke all on public.zavi_in_transit_orders, public.zavi_in_transit_lines,
 public.zavi_in_transit_receipts, public.zavi_in_transit_events from authenticated;

grant select,insert,update on public.zavi_in_transit_orders to authenticated;
grant select,insert,update on public.zavi_in_transit_lines to authenticated;
grant select on public.zavi_in_transit_receipts to authenticated;
grant select,insert on public.zavi_in_transit_events to authenticated;

drop policy if exists zavi_transit_orders_owner_select on public.zavi_in_transit_orders;
create policy zavi_transit_orders_owner_select on public.zavi_in_transit_orders
 for select to authenticated using (private.zavi_is_owner(workspace_id));
drop policy if exists zavi_transit_orders_owner_insert on public.zavi_in_transit_orders;
create policy zavi_transit_orders_owner_insert on public.zavi_in_transit_orders
 for insert to authenticated with check (
   private.zavi_is_owner(workspace_id)
   and created_by=(select auth.uid())
   and status in ('draft','ordered','shipped')
 );
drop policy if exists zavi_transit_orders_owner_update on public.zavi_in_transit_orders;
create policy zavi_transit_orders_owner_update on public.zavi_in_transit_orders
 for update to authenticated
 using (private.zavi_is_owner(workspace_id))
 with check (private.zavi_is_owner(workspace_id));

drop policy if exists zavi_transit_lines_owner_select on public.zavi_in_transit_lines;
create policy zavi_transit_lines_owner_select on public.zavi_in_transit_lines
 for select to authenticated using (private.zavi_is_owner(workspace_id));
drop policy if exists zavi_transit_lines_owner_insert on public.zavi_in_transit_lines;
create policy zavi_transit_lines_owner_insert on public.zavi_in_transit_lines
 for insert to authenticated with check (private.zavi_is_owner(workspace_id));
drop policy if exists zavi_transit_lines_owner_update on public.zavi_in_transit_lines;
create policy zavi_transit_lines_owner_update on public.zavi_in_transit_lines
 for update to authenticated
 using (private.zavi_is_owner(workspace_id))
 with check (private.zavi_is_owner(workspace_id));

drop policy if exists zavi_transit_receipts_owner_select on public.zavi_in_transit_receipts;
create policy zavi_transit_receipts_owner_select on public.zavi_in_transit_receipts
 for select to authenticated using (private.zavi_is_owner(workspace_id));

drop policy if exists zavi_transit_events_owner_select on public.zavi_in_transit_events;
create policy zavi_transit_events_owner_select on public.zavi_in_transit_events
 for select to authenticated using (private.zavi_is_owner(workspace_id));
drop policy if exists zavi_transit_events_owner_insert on public.zavi_in_transit_events;
create policy zavi_transit_events_owner_insert on public.zavi_in_transit_events
 for insert to authenticated with check (
   private.zavi_is_owner(workspace_id) and created_by=(select auth.uid())
 );

create or replace function private.zavi_v671_transit_order_guard()
returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='UPDATE' then
  if new.id is distinct from old.id
     or new.workspace_id is distinct from old.workspace_id
     or new.created_by is distinct from old.created_by then
    raise exception 'Transit order identity is immutable' using errcode='22023';
  end if;
  if new.status is distinct from old.status
     and new.status in ('partially_received','received')
     and coalesce(current_setting('zavi.v671_receiving',true),'')<>'1' then
    raise exception 'Receipt status is controlled by the receive RPC' using errcode='42501';
  end if;
  new.updated_at=now();
 end if;
 return new;
end $$;

create or replace function private.zavi_v671_transit_line_guard()
returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='UPDATE' then
  if new.id is distinct from old.id
     or new.order_id is distinct from old.order_id
     or new.workspace_id is distinct from old.workspace_id then
    raise exception 'Transit line identity is immutable' using errcode='22023';
  end if;
  if new.received_qty is distinct from old.received_qty
     and coalesce(current_setting('zavi.v671_receiving',true),'')<>'1' then
    raise exception 'Received quantity is controlled by the receive RPC' using errcode='42501';
  end if;
  new.updated_at=now();
 end if;
 return new;
end $$;

drop trigger if exists zavi_v671_transit_order_guard on public.zavi_in_transit_orders;
create trigger zavi_v671_transit_order_guard
 before update on public.zavi_in_transit_orders
 for each row execute function private.zavi_v671_transit_order_guard();

drop trigger if exists zavi_v671_transit_line_guard on public.zavi_in_transit_lines;
create trigger zavi_v671_transit_line_guard
 before update on public.zavi_in_transit_lines
 for each row execute function private.zavi_v671_transit_line_guard();

create or replace function private.zavi_v671_transit_event_log()
returns trigger language plpgsql set search_path='' as $$
declare v_type text; v_details jsonb;
begin
 if tg_op='INSERT' then
  insert into public.zavi_in_transit_events(order_id,workspace_id,event_type,message,details,created_by)
  values(new.id,new.workspace_id,'created','In-transit order created',
    jsonb_build_object('status',new.status,'tracking_number',new.tracking_number),
    coalesce(auth.uid(),new.created_by));
  return new;
 end if;
 if new.tracking_number is distinct from old.tracking_number
    or new.carrier is distinct from old.carrier
    or new.expected_date is distinct from old.expected_date then
   v_type='tracking_update';
   v_details=jsonb_build_object('tracking_number',new.tracking_number,'carrier',new.carrier,'expected_date',new.expected_date);
 elsif new.status is distinct from old.status
    and new.status not in ('partially_received','received') then
   v_type='status_update';
   v_details=jsonb_build_object('from',old.status,'to',new.status);
 else
   return new;
 end if;
 insert into public.zavi_in_transit_events(order_id,workspace_id,event_type,message,details,created_by)
 values(new.id,new.workspace_id,v_type,null,v_details,coalesce(auth.uid(),new.created_by));
 return new;
end $$;

drop trigger if exists zavi_v671_transit_event_insert on public.zavi_in_transit_orders;
create trigger zavi_v671_transit_event_insert
 after insert on public.zavi_in_transit_orders
 for each row execute function private.zavi_v671_transit_event_log();
drop trigger if exists zavi_v671_transit_event_update on public.zavi_in_transit_orders;
create trigger zavi_v671_transit_event_update
 after update on public.zavi_in_transit_orders
 for each row execute function private.zavi_v671_transit_event_log();

create or replace function public.zavi_v671_receive_in_transit(
 p_receipt_id uuid,
 p_order_id uuid,
 p_line_id uuid,
 p_quantity numeric,
 p_product_ref text,
 p_note text default null
) returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
 actor uuid=(select auth.uid());
 o public.zavi_in_transit_orders%rowtype;
 l public.zavi_in_transit_lines%rowtype;
 old_receipt public.zavi_in_transit_receipts%rowtype;
 product_id text;
 remaining numeric;
 discrepancy numeric;
 movement uuid;
 new_status text;
 result jsonb;
begin
 if actor is null then raise exception 'Login required' using errcode='42501'; end if;
 if p_receipt_id is null or p_order_id is null or p_line_id is null
    or p_quantity is null or p_quantity<=0 or scale(p_quantity)>4 then
   raise exception 'Invalid receipt' using errcode='22023';
 end if;
 if p_note is not null and length(p_note)>500 then
   raise exception 'Receipt note too long' using errcode='22023';
 end if;

 select * into old_receipt from public.zavi_in_transit_receipts where id=p_receipt_id;
 if found then
   if old_receipt.order_id is distinct from p_order_id
      or old_receipt.line_id is distinct from p_line_id
      or old_receipt.quantity is distinct from p_quantity
      or old_receipt.product_ref is distinct from p_product_ref
      or old_receipt.note is distinct from p_note
      or old_receipt.created_by is distinct from actor then
     raise exception 'Receipt ID collision' using errcode='23505';
   end if;
   return jsonb_build_object('success',true,'receipt_id',old_receipt.id,
     'warehouse_movement_id',old_receipt.warehouse_movement_id,'idempotent',true);
 end if;

 select * into o from public.zavi_in_transit_orders where id=p_order_id for update;
 if not found or not exists(
   select 1 from public.zavi_workspaces w where w.id=o.workspace_id and w.owner_uid=actor
 ) then raise exception 'Owner access required' using errcode='42501'; end if;
 if o.status in ('cancelled','received') then
   raise exception 'Order cannot receive more goods' using errcode='22023';
 end if;

 select * into l from public.zavi_in_transit_lines
 where id=p_line_id and order_id=o.id and workspace_id=o.workspace_id for update;
 if not found then raise exception 'Order line not found' using errcode='22023'; end if;

 product_id=coalesce(nullif(btrim(p_product_ref),''),nullif(btrim(l.product_ref),''));
 if product_id is null then raise exception 'Product mapping required before receipt' using errcode='22023'; end if;
 if l.product_ref is not null and l.product_ref<>product_id then
   raise exception 'Product mapping mismatch' using errcode='22023';
 end if;
 if length(product_id)>160 then raise exception 'Product reference too long' using errcode='22023'; end if;
 if not exists(
   select 1 from public.zavi_warehouses w
   where w.id=o.destination_warehouse_id and w.workspace_id=o.workspace_id and w.is_active=true
 ) then raise exception 'Destination warehouse unavailable' using errcode='22023'; end if;

 remaining=greatest(l.ordered_qty-l.received_qty,0);
 discrepancy=greatest(p_quantity-remaining,0);
 perform set_config('zavi.v671_receiving','1',true);

 movement=public.zavi_warehouse_post_movement(
   p_receipt_id,o.workspace_id,null,o.destination_warehouse_id,
   product_id,p_quantity,('in-transit:'||o.id::text||':'||l.id::text)::text
 );

 insert into public.zavi_in_transit_receipts(
   id,order_id,line_id,workspace_id,warehouse_id,product_ref,quantity,
   discrepancy_qty,note,warehouse_movement_id,created_by
 ) values(
   p_receipt_id,o.id,l.id,o.workspace_id,o.destination_warehouse_id,product_id,p_quantity,
   discrepancy,p_note,movement,actor
 );

 update public.zavi_in_transit_lines
 set received_qty=received_qty+p_quantity,product_ref=coalesce(product_ref,product_id),updated_at=now()
 where id=l.id;

 select case when not exists(
   select 1 from public.zavi_in_transit_lines x
   where x.order_id=o.id and x.received_qty<x.ordered_qty
 ) then 'received' else 'partially_received' end into new_status;

 update public.zavi_in_transit_orders set status=new_status,updated_at=now() where id=o.id;

 insert into public.zavi_in_transit_events(order_id,workspace_id,event_type,message,details,created_by)
 values(o.id,o.workspace_id,
   case when new_status='received' then 'received' else 'partial_received' end,
   p_note,
   jsonb_build_object('line_id',l.id,'product_ref',product_id,'quantity',p_quantity,
     'remaining_before',remaining,'discrepancy_qty',discrepancy,'warehouse_movement_id',movement),
   actor);
 if discrepancy<>0 then
   insert into public.zavi_in_transit_events(order_id,workspace_id,event_type,message,details,created_by)
   values(o.id,o.workspace_id,'discrepancy',coalesce(p_note,'Quantity differs from remaining order quantity'),
     jsonb_build_object('line_id',l.id,'discrepancy_qty',discrepancy),actor);
 end if;

 result=jsonb_build_object('success',true,'receipt_id',p_receipt_id,
  'warehouse_movement_id',movement,'status',new_status,
  'received_qty',l.received_qty+p_quantity,'discrepancy_qty',discrepancy,'idempotent',false);
 return result;
end $$;

revoke all on function public.zavi_v671_receive_in_transit(uuid,uuid,uuid,numeric,text,text) from public,anon;
grant execute on function public.zavi_v671_receive_in_transit(uuid,uuid,uuid,numeric,text,text) to authenticated;

create or replace view public.zavi_in_transit_order_summary
with (security_invoker=true) as
select o.*,
 coalesce(sum(l.ordered_qty),0)::numeric(20,4) as ordered_qty,
 coalesce(sum(l.received_qty),0)::numeric(20,4) as received_qty,
 (o.purchase_total_original+o.freight_original+o.customs_original+o.other_costs_original)::numeric(20,4) as landed_total_original,
 ((o.purchase_total_original+o.freight_original+o.customs_original+o.other_costs_original)*o.exchange_rate)::numeric(20,4) as landed_total_base
from public.zavi_in_transit_orders o
left join public.zavi_in_transit_lines l on l.order_id=o.id and l.workspace_id=o.workspace_id
group by o.id;

create or replace view public.zavi_in_transit_line_costs
with (security_invoker=true) as
with priced as (
 select l.*,o.exchange_rate,o.freight_original,o.customs_original,o.other_costs_original,
        (l.ordered_qty*l.unit_price_original)::numeric(20,4) line_original,
        sum(l.ordered_qty*l.unit_price_original) over(partition by l.order_id)::numeric(20,4) merchandise_original
 from public.zavi_in_transit_lines l
 join public.zavi_in_transit_orders o on o.id=l.order_id and o.workspace_id=l.workspace_id
)
select p.*,
 case when p.merchandise_original>0
  then ((p.line_original+(p.freight_original+p.customs_original+p.other_costs_original)*(p.line_original/p.merchandise_original))*p.exchange_rate)::numeric(20,4)
  else (p.line_original*p.exchange_rate)::numeric(20,4) end as landed_line_base,
 case when p.ordered_qty>0 then
  (case when p.merchandise_original>0
   then ((p.line_original+(p.freight_original+p.customs_original+p.other_costs_original)*(p.line_original/p.merchandise_original))*p.exchange_rate)/p.ordered_qty
   else (p.line_original*p.exchange_rate)/p.ordered_qty end)::numeric(20,4)
  else 0::numeric end as landed_unit_base
from priced p;

revoke all on public.zavi_in_transit_order_summary,public.zavi_in_transit_line_costs from anon;
grant select on public.zavi_in_transit_order_summary,public.zavi_in_transit_line_costs to authenticated;
