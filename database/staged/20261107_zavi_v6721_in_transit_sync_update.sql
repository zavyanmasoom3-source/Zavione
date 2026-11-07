-- ZAVI ONE 67.21
-- Final source for server-synced, offline-first in-transit order updates.
-- Applied to Supabase project wbbmwfnmurpphwxesssx on 2026-11-07.

create or replace function public.zavi_v6721_update_in_transit(
 p_order_id uuid,
 p_workspace_id uuid,
 p_destination_warehouse_id uuid,
 p_supplier_name text,
 p_country_name text,
 p_currency_code text,
 p_exchange_rate numeric,
 p_freight_original numeric,
 p_customs_original numeric,
 p_other_costs_original numeric,
 p_tracking_number text,
 p_carrier text,
 p_expected_date date,
 p_requested_status text,
 p_notes text,
 p_lines jsonb
) returns jsonb
language plpgsql
security invoker
set search_path=''
as $function$
declare
 actor uuid=(select auth.uid());
 o public.zavi_in_transit_orders%rowtype;
 line jsonb;
 line_id uuid;
 line_product_ref text;
 line_name text;
 line_sku text;
 line_qty numeric;
 line_price numeric;
 v_total numeric:=0;
 v_count integer:=0;
 v_status text;
begin
 if actor is null then raise exception 'Login required' using errcode='42501'; end if;
 if p_order_id is null or p_workspace_id is null or p_destination_warehouse_id is null then
   raise exception 'Order identity is required' using errcode='22023';
 end if;
 if p_supplier_name is null or length(btrim(p_supplier_name)) not between 1 and 120 then
   raise exception 'Supplier name is required' using errcode='22023';
 end if;
 if p_country_name is null or length(btrim(p_country_name)) not between 1 and 80 then
   raise exception 'Country name is required' using errcode='22023';
 end if;
 if p_currency_code is null or upper(p_currency_code) !~ '^[A-Z]{3}$' then
   raise exception 'Invalid currency code' using errcode='22023';
 end if;
 if p_exchange_rate is null or p_exchange_rate<=0 or scale(p_exchange_rate)>8 then
   raise exception 'Invalid exchange rate' using errcode='22023';
 end if;
 if coalesce(p_freight_original,0)<0 or coalesce(p_customs_original,0)<0 or coalesce(p_other_costs_original,0)<0 then
   raise exception 'Costs cannot be negative' using errcode='22023';
 end if;
 if p_requested_status not in ('draft','ordered','shipped','cancelled') then
   raise exception 'Invalid requested status' using errcode='22023';
 end if;
 if p_tracking_number is not null and length(p_tracking_number)>120 then raise exception 'Tracking number too long' using errcode='22023'; end if;
 if p_carrier is not null and length(p_carrier)>120 then raise exception 'Carrier too long' using errcode='22023'; end if;
 if p_notes is not null and length(p_notes)>1200 then raise exception 'Notes too long' using errcode='22023'; end if;
 if p_lines is null or jsonb_typeof(p_lines)<>'array'
    or jsonb_array_length(p_lines)=0 or jsonb_array_length(p_lines)>200 then
   raise exception 'At least one order line is required' using errcode='22023';
 end if;

 select * into o
 from public.zavi_in_transit_orders
 where id=p_order_id and workspace_id=p_workspace_id
 for update;

 if not found or not exists(
   select 1 from public.zavi_workspaces w
   where w.id=p_workspace_id and w.owner_uid=actor
 ) then raise exception 'Owner access required' using errcode='42501'; end if;

 if not exists(
   select 1 from public.zavi_warehouses w
   where w.id=p_destination_warehouse_id
     and w.workspace_id=p_workspace_id
     and w.is_active=true
 ) then raise exception 'Destination warehouse unavailable' using errcode='22023'; end if;

 for line in select value from pg_catalog.jsonb_array_elements(p_lines)
 loop
   begin
     line_id=(line->>'id')::uuid;
     line_qty=(line->>'ordered_qty')::numeric;
     line_price=coalesce((line->>'unit_price_original')::numeric,0);
   exception when invalid_text_representation or numeric_value_out_of_range then
     raise exception 'Invalid order line' using errcode='22023';
   end;

   line_product_ref=nullif(btrim(line->>'product_ref'),'');
   line_name=btrim(coalesce(line->>'product_name',''));
   line_sku=nullif(btrim(line->>'sku'),'');

   if line_id is null or length(line_name) not between 1 and 160
      or line_qty<=0 or scale(line_qty)>4
      or line_price<0 or scale(line_price)>4 then
     raise exception 'Invalid order line' using errcode='22023';
   end if;
   if line_sku is not null and length(line_sku)>100 then
     raise exception 'SKU too long' using errcode='22023';
   end if;

   if exists(
     select 1 from public.zavi_in_transit_lines l
     where l.id=line_id and l.order_id=o.id and l.workspace_id=o.workspace_id
   ) then
     if exists(
       select 1 from public.zavi_in_transit_lines l
       where l.id=line_id and l.received_qty>line_qty
     ) then raise exception 'Ordered quantity cannot be below received quantity' using errcode='22023'; end if;

     update public.zavi_in_transit_lines
     set product_ref=case
           when product_ref is null then line_product_ref
           when line_product_ref is null or product_ref=line_product_ref then product_ref
           else product_ref end,
         product_name=line_name,
         sku=line_sku,
         ordered_qty=line_qty,
         unit_price_original=line_price,
         updated_at=now()
     where id=line_id;
   else
     insert into public.zavi_in_transit_lines(
       id,order_id,workspace_id,product_ref,product_name,sku,ordered_qty,unit_price_original
     ) values(
       line_id,o.id,o.workspace_id,line_product_ref,line_name,line_sku,line_qty,line_price
     );
   end if;

   v_total:=v_total+(line_qty*line_price);
   v_count:=v_count+1;
 end loop;

 if exists(
   select 1 from public.zavi_in_transit_lines l
   where l.order_id=o.id and l.workspace_id=o.workspace_id
     and not exists(
       select 1
       from pg_catalog.jsonb_array_elements(p_lines) j(value)
       where (j.value->>'id')::uuid=l.id
     )
     and l.received_qty>0
 ) then
   raise exception 'Received order line cannot be removed' using errcode='22023';
 end if;

 delete from public.zavi_in_transit_lines l
 where l.order_id=o.id and l.workspace_id=o.workspace_id
   and l.received_qty=0
   and not exists(
     select 1
     from pg_catalog.jsonb_array_elements(p_lines) j(value)
     where (j.value->>'id')::uuid=l.id
   );

 if o.status in ('partially_received','received') then
   if p_requested_status='cancelled' then
     raise exception 'Received order cannot be cancelled' using errcode='22023';
   end if;
   v_status:=o.status;
 else
   v_status:=p_requested_status;
 end if;

 update public.zavi_in_transit_orders
 set destination_warehouse_id=p_destination_warehouse_id,
     supplier_name=btrim(p_supplier_name),
     country_name=btrim(p_country_name),
     currency_code=upper(p_currency_code),
     exchange_rate=p_exchange_rate,
     purchase_total_original=v_total,
     freight_original=coalesce(p_freight_original,0),
     customs_original=coalesce(p_customs_original,0),
     other_costs_original=coalesce(p_other_costs_original,0),
     tracking_number=nullif(btrim(p_tracking_number),''),
     carrier=nullif(btrim(p_carrier),''),
     expected_date=p_expected_date,
     status=v_status,
     notes=nullif(btrim(p_notes),''),
     updated_at=now()
 where id=o.id;

 return jsonb_build_object(
   'success',true,'order_id',o.id,'line_count',v_count,
   'status',v_status,'purchase_total_original',v_total
 );
end
$function$;

revoke all on function public.zavi_v6721_update_in_transit(
 uuid,uuid,uuid,text,text,text,numeric,numeric,numeric,numeric,text,text,date,text,text,jsonb
) from public,anon;

grant execute on function public.zavi_v6721_update_in_transit(
 uuid,uuid,uuid,text,text,text,numeric,numeric,numeric,numeric,text,text,date,text,text,jsonb
) to authenticated;

create index if not exists zavi_transit_events_order_fk_idx
  on public.zavi_in_transit_events(order_id,workspace_id);
create index if not exists zavi_transit_lines_order_fk_idx
  on public.zavi_in_transit_lines(order_id,workspace_id);
create index if not exists zavi_transit_orders_destination_fk_idx
  on public.zavi_in_transit_orders(destination_warehouse_id,workspace_id);
create index if not exists zavi_transit_receipts_line_order_ws_fk_idx
  on public.zavi_in_transit_receipts(line_id,order_id,workspace_id);
create index if not exists zavi_transit_receipts_order_ws_fk_idx
  on public.zavi_in_transit_receipts(order_id,workspace_id);
create index if not exists zavi_transit_receipts_warehouse_ws_fk_idx
  on public.zavi_in_transit_receipts(warehouse_id,workspace_id);
create index if not exists zavi_warehouse_config_initialized_by_idx
  on public.zavi_warehouse_config(initialized_by);

drop policy if exists zavi_warehouse_config_owner_insert on public.zavi_warehouse_config;
create policy zavi_warehouse_config_owner_insert
 on public.zavi_warehouse_config
 for insert to authenticated
 with check (
   private.zavi_is_owner(workspace_id)
   and initialized_by=(select auth.uid())
 );

drop policy if exists zavi_warehouse_config_owner_update on public.zavi_warehouse_config;
create policy zavi_warehouse_config_owner_update
 on public.zavi_warehouse_config
 for update to authenticated
 using (private.zavi_is_owner(workspace_id))
 with check (
   private.zavi_is_owner(workspace_id)
   and initialized_by=(select auth.uid())
 );
