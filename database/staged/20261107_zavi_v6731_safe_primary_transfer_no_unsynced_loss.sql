-- ZAVI ONE 67.31
-- Do not revoke/replace a primary device unless the previous active device
-- has a fresh, explicit zero-pending sync report.
-- Applied to Supabase project wbbmwfnmurpphwxesssx on 2026-11-07.

create or replace function public.zavi_v6580_owner_one_tap_transfer(
 p_workspace_id uuid,
 p_new_device_id text,
 p_new_device_name text default null
) returns text
language plpgsql
security definer
set search_path=''
as $function$
declare
 v_id text;
 v_prev public.zavi_v26_devices%rowtype;
begin
 if auth.uid() is null or p_workspace_id is null then
   raise exception 'CLOUD_LOGIN_REQUIRED' using errcode='42501';
 end if;

 v_id:=btrim(coalesce(p_new_device_id,''));
 if length(v_id) not between 16 and 160
    or length(coalesce(p_new_device_name,''))>150 then
   raise exception 'INVALID_DEVICE' using errcode='22023';
 end if;

 perform 1
 from public.zavi_workspaces w
 where w.id=p_workspace_id and w.owner_uid=auth.uid()
 for update;
 if not found then
   raise exception 'OWNER_ACCOUNT_REQUIRED' using errcode='42501';
 end if;

 if not private.zavi_subscription_is_active(p_workspace_id) then
   raise exception 'ACTIVE_CLOUD_SUBSCRIPTION_REQUIRED' using errcode='42501';
 end if;

 select * into v_prev
 from public.zavi_v26_devices d
 where d.workspace_id=p_workspace_id
   and d.status='active'
   and d.device_id<>v_id
 order by d.registered_at desc
 limit 1
 for update;

 if found then
   if v_prev.reported_pending_count is null
      or v_prev.reported_pending_count>0 then
     raise exception 'PREVIOUS_DEVICE_HAS_UNSYNCED_DATA' using errcode='55000';
   end if;

   if v_prev.last_report_at is null
      or v_prev.last_sync_at is null
      or v_prev.last_report_at < now()-interval '15 minutes'
      or v_prev.last_sync_at < v_prev.last_report_at-interval '15 minutes'
      or v_prev.last_report_at > now()+interval '1 minute'
      or v_prev.last_sync_at > now()+interval '1 minute' then
     raise exception 'PREVIOUS_DEVICE_SYNC_UNVERIFIED' using errcode='55000';
   end if;
 end if;

 return public.zavi_v41_owner_replace_device(
   p_workspace_id,v_id,p_new_device_name
 );
end
$function$;

revoke all on function public.zavi_v6580_owner_one_tap_transfer(uuid,text,text)
from public,anon;
grant execute on function public.zavi_v6580_owner_one_tap_transfer(uuid,text,text)
to authenticated;
