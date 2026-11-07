-- ZAVI ONE 67.13
-- Source-of-truth reconciliation for invoice -> independent warehouse movements.
-- Already applied to project wbbmwfnmurpphwxesssx on 2026-11-07.
-- Idempotent where possible; keeps prior warehouse rows and invoice data intact.

alter table public.zavi_warehouse_movements
  add column if not exists allow_negative boolean not null default false;

create index if not exists zavi_warehouse_movements_from_fk_idx
  on public.zavi_warehouse_movements(from_warehouse_id, workspace_id);

create index if not exists zavi_warehouse_movements_to_fk_idx
  on public.zavi_warehouse_movements(to_warehouse_id, workspace_id);

drop policy if exists zavi_movements_owner_insert
  on public.zavi_warehouse_movements;

create policy zavi_movements_owner_insert
  on public.zavi_warehouse_movements
  for insert
  to authenticated
  with check (
    private.zavi_is_owner(workspace_id)
    and created_by = (select auth.uid())
  );

create or replace function public.zavi_warehouse_no_negative_guard()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
  v_source text;
  v_dest text;
  v_lock text;
  v_available numeric;
  v_owner_override boolean;
begin
  if TG_OP <> 'INSERT' then
    raise exception 'Warehouse movements must be append-only';
  end if;

  v_owner_override :=
    coalesce(NEW.allow_negative,false)
    and NEW.created_by = auth.uid()
    and private.zavi_is_owner(NEW.workspace_id);

  if NEW.from_warehouse_id is not null then
    v_source := NEW.workspace_id::text || ':' ||
                NEW.from_warehouse_id::text || ':' || NEW.product_ref;
  end if;
  if NEW.to_warehouse_id is not null then
    v_dest := NEW.workspace_id::text || ':' ||
              NEW.to_warehouse_id::text || ':' || NEW.product_ref;
  end if;

  for v_lock in
    select lock_key
    from (select unnest(array[v_source,v_dest]) as lock_key) as keys
    where lock_key is not null
    order by lock_key
  loop
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(v_lock,0)
    );
  end loop;

  if NEW.from_warehouse_id is not null then
    select coalesce(sum(
      case when m.to_warehouse_id = NEW.from_warehouse_id then m.quantity
           when m.from_warehouse_id = NEW.from_warehouse_id then -m.quantity
           else 0 end
    ),0)
    into v_available
    from public.zavi_warehouse_movements m
    where m.workspace_id = NEW.workspace_id
      and m.product_ref = NEW.product_ref
      and (m.from_warehouse_id = NEW.from_warehouse_id
           or m.to_warehouse_id = NEW.from_warehouse_id);

    if v_available < NEW.quantity and not v_owner_override then
      raise exception 'Insufficient warehouse stock: available %, requested %',
        v_available, NEW.quantity using errcode='23514';
    end if;
  end if;

  return NEW;
end
$function$;

create or replace function public.zavi_warehouse_post_document_movements(
  p_workspace_id uuid,
  p_warehouse_id uuid,
  p_document_ref text,
  p_direction text,
  p_lines jsonb,
  p_allow_negative boolean
)
returns jsonb
language plpgsql
set search_path = ''
as $function$
declare
  v_item jsonb;
  v_operation_id uuid;
  v_product_ref text;
  v_quantity numeric;
  v_from uuid;
  v_to uuid;
  v_existing public.zavi_warehouse_movements%rowtype;
  v_result_id uuid;
  v_results jsonb := '[]'::jsonb;
  v_count integer;
  v_override boolean := coalesce(p_allow_negative,false);
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_workspace_id is null or p_warehouse_id is null then
    raise exception 'Workspace and warehouse are required';
  end if;
  if p_direction not in ('in','out') then
    raise exception 'Direction must be in or out';
  end if;
  if p_document_ref is null
     or length(btrim(p_document_ref)) < 1
     or length(p_document_ref) > 150 then
    raise exception 'Invalid document reference';
  end if;
  if jsonb_typeof(p_lines) is distinct from 'array' then
    raise exception 'Lines must be an array';
  end if;

  v_count := jsonb_array_length(p_lines);
  if v_count < 1 or v_count > 200 then
    raise exception 'Document must contain 1 to 200 stock lines';
  end if;

  if not exists (
    select 1
    from public.zavi_workspaces w
    join public.zavi_warehouses wh
      on wh.workspace_id=w.id
     and wh.id=p_warehouse_id
     and wh.is_active=true
    where w.id=p_workspace_id
      and w.owner_uid=auth.uid()
  ) then
    raise exception 'Warehouse unavailable or unauthorized';
  end if;

  v_from := case when p_direction='out' then p_warehouse_id else null end;
  v_to := case when p_direction='in' then p_warehouse_id else null end;

  for v_item in
    select value from pg_catalog.jsonb_array_elements(p_lines)
  loop
    if pg_catalog.jsonb_typeof(v_item) is distinct from 'object' then
      raise exception 'Invalid stock line';
    end if;

    begin
      v_operation_id := (v_item->>'operation_id')::uuid;
      v_quantity := (v_item->>'quantity')::numeric;
    exception
      when invalid_text_representation or numeric_value_out_of_range then
        raise exception 'Invalid operation id or quantity';
    end;

    v_product_ref := btrim(coalesce(v_item->>'product_ref',''));
    if v_operation_id is null
       or length(v_product_ref)<1 or length(v_product_ref)>160
       or v_quantity is null or v_quantity<=0 or v_quantity>999999999999
       or v_quantity::text in ('NaN','Infinity','-Infinity')
       or scale(v_quantity)>4 then
      raise exception 'Invalid stock line values';
    end if;

    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        'zavi-warehouse-operation:'||v_operation_id::text,0
      )
    );

    select * into v_existing
    from public.zavi_warehouse_movements
    where id=v_operation_id;

    if found then
      if v_existing.workspace_id is distinct from p_workspace_id
         or v_existing.from_warehouse_id is distinct from v_from
         or v_existing.to_warehouse_id is distinct from v_to
         or v_existing.product_ref is distinct from v_product_ref
         or v_existing.quantity is distinct from v_quantity
         or v_existing.reference is distinct from btrim(p_document_ref)
         or v_existing.created_by is distinct from auth.uid()
         or v_existing.allow_negative is distinct from v_override then
        raise exception 'Operation ID already used with different data';
      end if;
      v_result_id := v_existing.id;
    else
      insert into public.zavi_warehouse_movements
        (id,workspace_id,from_warehouse_id,to_warehouse_id,
         product_ref,quantity,reference,created_by,allow_negative)
      values
        (v_operation_id,p_workspace_id,v_from,v_to,
         v_product_ref,v_quantity,btrim(p_document_ref),auth.uid(),v_override)
      returning id into v_result_id;
    end if;

    v_results := v_results || pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'operation_id',v_result_id,
        'product_ref',v_product_ref,
        'quantity',v_quantity,
        'direction',p_direction,
        'allow_negative',v_override
      )
    );
  end loop;

  return v_results;
end
$function$;

revoke all on function public.zavi_warehouse_post_document_movements(
  uuid,uuid,text,text,jsonb,boolean
) from public, anon;

grant execute on function public.zavi_warehouse_post_document_movements(
  uuid,uuid,text,text,jsonb,boolean
) to authenticated;

revoke execute on function public.zavi_warehouse_no_negative_guard()
  from anon;

revoke all on public.zavi_warehouse_stock from anon;
revoke all on public.zavi_warehouse_stock_summary from anon;
revoke insert,update,delete,truncate,references,trigger
  on public.zavi_warehouse_stock from authenticated;
revoke insert,update,delete,truncate,references,trigger
  on public.zavi_warehouse_stock_summary from authenticated;
grant select on public.zavi_warehouse_stock to authenticated;
grant select on public.zavi_warehouse_stock_summary to authenticated;
