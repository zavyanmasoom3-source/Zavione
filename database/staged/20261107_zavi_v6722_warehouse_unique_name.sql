-- ZAVI ONE 67.22
-- Warehouse names and codes are both unique within one workspace.
-- Applied to Supabase project wbbmwfnmurpphwxesssx on 2026-11-07.

create unique index if not exists zavi_warehouses_workspace_name_uq
on public.zavi_warehouses(workspace_id, lower(btrim(name)));
