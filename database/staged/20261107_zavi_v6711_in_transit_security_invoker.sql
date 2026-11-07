
grant insert on public.zavi_in_transit_receipts to authenticated;

drop policy if exists zavi_transit_receipts_owner_insert on public.zavi_in_transit_receipts;
create policy zavi_transit_receipts_owner_insert on public.zavi_in_transit_receipts
 for insert to authenticated with check (
   private.zavi_is_owner(workspace_id)
   and created_by=(select auth.uid())
 );

create or replace function private.zavi_v671_transit_receipt_guard()
returns trigger
language plpgsql
set search_path=''
as $$
begin
 if coalesce(current_setting('zavi.v671_receiving',true),'')<>'1' then
   raise exception 'Transit receipts must be created by the receive RPC' using errcode='42501';
 end if;
 if new.created_by is distinct from (select auth.uid()) then
   raise exception 'Receipt actor mismatch' using errcode='42501';
 end if;
 if new.id is distinct from new.warehouse_movement_id then
   raise exception 'Receipt and movement identity must match' using errcode='22023';
 end if;
 return new;
end $$;

drop trigger if exists zavi_v671_transit_receipt_guard on public.zavi_in_transit_receipts;
create trigger zavi_v671_transit_receipt_guard
 before insert on public.zavi_in_transit_receipts
 for each row execute function private.zavi_v671_transit_receipt_guard();

alter function public.zavi_v671_receive_in_transit(uuid,uuid,uuid,numeric,text,text) security invoker;
