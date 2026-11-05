\set ON_ERROR_STOP on
-- Isolated fixture for Postgres 17 CI. All IDs are fabricated. No production data.
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE anon NOLOGIN;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS private;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT nullif(pg_catalog.current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
GRANT USAGE ON SCHEMA auth,private TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
CREATE TABLE public.zavi_workspaces(
 id uuid PRIMARY KEY,
 owner_uid uuid NOT NULL,
 payload jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE FUNCTION private.zavi_is_owner(ws uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS (SELECT 1 FROM public.zavi_workspaces w WHERE w.id=ws AND w.owner_uid=auth.uid())
$$;
GRANT EXECUTE ON FUNCTION private.zavi_is_owner(uuid) TO authenticated;
CREATE POLICY owner_ws ON public.zavi_workspaces
 FOR SELECT TO authenticated USING (owner_uid=auth.uid());
ALTER TABLE public.zavi_workspaces ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.zavi_workspaces TO authenticated;
CREATE TABLE public.zavi_warehouses(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 workspace_id uuid NOT NULL REFERENCES public.zavi_workspaces(id),
 name text NOT NULL,
 code text NOT NULL,
 is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(id, workspace_id),
 UNIQUE(workspace_id,code),
 CHECK(length(btrim(name)) between 1 and 90),
 CHECK(length(btrim(code)) between 1 and 32)
);
ALTER TABLE public.zavi_warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY wh_select ON public.zavi_warehouses FOR SELECT TO authenticated
 USING (private.zavi_is_owner(workspace_id));
CREATE POLICY wh_insert ON public.zavi_warehouses FOR INSERT TO authenticated
 WITH CHECK (private.zavi_is_owner(workspace_id));
CREATE POLICY wh_update ON public.zavi_warehouses FOR UPDATE TO authenticated
 USING (private.zavi_is_owner(workspace_id)) WITH CHECK (private.zavi_is_owner(workspace_id));
GRANT ALL ON public.zavi_warehouses TO authenticated;
CREATE TABLE public.zavi_warehouse_movements(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 workspace_id uuid NOT NULL REFERENCES public.zavi_workspaces(id),
 from_warehouse_id uuid,
 to_warehouse_id uuid,
 product_ref text NOT NULL,
 quantity numeric NOT NULL CHECK(quantity>0),
 reference text,
 created_by uuid NOT NULL DEFAULT auth.uid(),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(from_warehouse_id IS DISTINCT FROM to_warehouse_id),
 CHECK(from_warehouse_id IS NOT NULL OR to_warehouse_id IS NOT NULL),
 FOREIGN KEY (from_warehouse_id,workspace_id) REFERENCES public.zavi_warehouses(id,workspace_id),
 FOREIGN KEY (to_warehouse_id,workspace_id) REFERENCES public.zavi_warehouses(id,workspace_id)
);
ALTER TABLE public.zavi_warehouse_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY movement_select ON public.zavi_warehouse_movements FOR SELECT TO authenticated
 USING (private.zavi_is_owner(workspace_id));
CREATE POLICY movement_insert ON public.zavi_warehouse_movements FOR INSERT TO authenticated
 WITH CHECK (private.zavi_is_owner(workspace_id) AND created_by=auth.uid());
GRANT SELECT,INSERT ON public.zavi_warehouse_movements TO authenticated;
-- 2 synthetic customers and 3 warehouses, no real customer records.
INSERT INTO public.zavi_workspaces(id,owner_uid,payload) VALUES
 ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','{"products":[{"id":"P1","name":"QA product"}]}'),
 ('22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','{"products":[{"id":"P2","name":"Other tenant item"}]}');
INSERT INTO public.zavi_warehouses(id,workspace_id,name,code,is_active) VALUES
 ('11111111-aaaa-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','Main','MAIN',true),
 ('11111111-bbbb-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','Second','SECOND',true),
 ('22222222-aaaa-4222-8222-222222222222','22222222-2222-4222-8222-222222222222','Other','OTHER',true);
