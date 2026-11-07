
create or replace function public.zavi_v671_create_in_transit(
 p_order_id uuid,
 p_workspace_id uuid,
 p_destination_warehouse_id uuid,
 p_supplier_name text,
 p_country_name text,
 p_currency_code text,
 p_exchange_rate numeric,
 p_purchase_total_original numeric,
 p_freight_original numeric,
 p_customs_original numeric,
 p_other_costs_original numeric,
 p_tracking_number text,
 p_carrier text,
 p_expected_date date,
 p_status text,
 p_notes text,
 p_lines jsonb
) returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
 actor uuid=(select auth.uid());
 existing public.zavi_in_transit_orders%rowtype;
 line jsonb;
 line_id uuid;
 product_ref text;
 product_name text;
 sku text;
 ordered_qty numeric;
 unit_price numeric;
 count_lines integer=0;
begin
 if actor is null then raise exception 'Login required' using errcode='42501'; end if;
 if p_order_id is null or p_workspace_id is null or p_destination_warehouse_id is null then
   raise exception 'Order identity is required' using errcode='22023';
 end if;
 if not exists(select 1 from public.zavi_workspaces w where w.id=p_workspace_id and w.owner_uid=actor) then
   raise exception 'Owner access required' using errcode='42501';
 end if;
 if not exists(select 1 from public.zavi_warehouses w where w.id=p_destination_warehouse_id and w.workspace_id=p_workspace_id and w.is_active=true) then
   raise exception 'Destination warehouse unavailable' using errcode='22023';
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
 if coalesce(p_purchase_total_original,0)<0 or coalesce(p_freight_original,0)<0 or coalesce(p_customs_original,0)<0 or coalesce(p_other_costs_original,0)<0 then
   raise exception 'Costs cannot be negative' using errcode='22023';
 end if;
 if p_status not in ('draft','ordered','shipped') then
   raise exception 'Invalid initial status' using errcode='22023';
 end if;
 if p_tracking_number is not null and length(p_tracking_number)>120 then raise exception 'Tracking number too long' using errcode='22023'; end if;
 if p_carrier is not null and length(p_carrier)>120 then raise exception 'Carrier too long' using errcode='22023'; end if;
 if p_notes is not null and length(p_notes)>1200 then raise exception 'Notes too long' using errcode='22023'; end if;
 if p_lines is null or jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines)=0 or jsonb_array_length(p_lines)>200 then
   raise exception 'At least one order line is required' using errcode='22023';
 end if;

 select * into existing from public.zavi_in_transit_orders where id=p_order_id;
 if found then
   if existing.workspace_id is distinct from p_workspace_id
      or existing.created_by is distinct from actor
      or existing.destination_warehouse_id is distinct from p_destination_warehouse_id
      or existing.supplier_name is distinct from btrim(p_supplier_name)
      or existing.country_name is distinct from btrim(p_country_name)
      or existing.currency_code is distinct from upper(p_currency_code)
      or existing.exchange_rate is distinct from p_exchange_rate then
     raise exception 'Order ID collision' using errcode='23505';
   end if;
   return jsonb_build_object('success',true,'order_id',existing.id,'idempotent',true);
 end if;

 insert into public.zavi_in_transit_orders(
   id,workspace_id,destination_warehouse_id,supplier_name,country_name,
   currency_code,exchange_rate,purchase_total_original,freight_original,
   customs_original,other_costs_original,tracking_number,carrier,expected_date,
   status,notes,created_by
 ) values(
   p_order_id,p_workspace_id,p_destination_warehouse_id,btrim(p_supplier_name),btrim(p_country_name),
   upper(p_currency_code),p_exchange_rate,coalesce(p_purchase_total_original,0),coalesce(p_freight_original,0),
   coalesce(p_customs_original,0),coalesce(p_other_costs_original,0),nullif(btrim(p_tracking_number),''),
   nullif(btrim(p_carrier),''),p_expected_date,p_status,nullif(btrim(p_notes),''),actor
 );

 for line in select value from jsonb_array_elements(p_lines)
 loop
   line_id=(line->>'id')::uuid;
   product_ref=nullif(btrim(line->>'product_ref'),'');
   product_name=btrim(coalesce(line->>'product_name',''));
   sku=nullif(btrim(line->>'sku'),'');
   ordered_qty=(line->>'ordered_qty')::numeric;
   unit_price=coalesce((line->>'unit_price_original')::numeric,0);
   if line_id is null or length(product_name) not between 1 and 160
      or ordered_qty<=0 or scale(ordered_qty)>4 or unit_price<0 or scale(unit_price)>4 then
      raise exception 'Invalid order line' using errcode='22023';
   end if;
   if sku is not null and length(sku)>100 then raise exception 'SKU too long' using errcode='22023'; end if;
   if product_ref is not null and not exists(
      select 1 from public.zavi_workspaces w,
      lateral jsonb_array_elements(case when jsonb_typeof(w.payload->'products')='array' then w.payload->'products' else '[]'::jsonb end) p(item)
      where w.id=p_workspace_id and p.item->>'id'=product_ref
   ) then
      raise exception 'Mapped product does not exist' using errcode='22023';
   end if;
   insert into public.zavi_in_transit_lines(
      id,order_id,workspace_id,product_ref,product_name,sku,ordered_qty,unit_price_original
   ) values(line_id,p_order_id,p_workspace_id,product_ref,product_name,sku,ordered_qty,unit_price);
   count_lines=count_lines+1;
 end loop;

 return jsonb_build_object('success',true,'order_id',p_order_id,'line_count',count_lines,'idempotent',false);
end $$;

revoke all on function public.zavi_v671_create_in_transit(
 uuid,uuid,uuid,text,text,text,numeric,numeric,numeric,numeric,numeric,text,text,date,text,text,jsonb
) from public,anon;
grant execute on function public.zavi_v671_create_in_transit(
 uuid,uuid,uuid,text,text,text,numeric,numeric,numeric,numeric,numeric,text,text,date,text,text,jsonb
) to authenticated;
