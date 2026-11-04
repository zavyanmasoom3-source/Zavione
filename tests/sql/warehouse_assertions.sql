\set ON_ERROR_STOP on
-- All data in this script is fabricated and isolated inside the GitHub Actions DB.
SELECT pg_catalog.set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
SET ROLE authenticated;
DO $tests$
DECLARE
 count_rows integer;
 from_balance numeric;
 to_balance numeric;
BEGIN
 IF has_table_privilege('authenticated','public.zavi_warehouses','TRUNCATE')
  OR has_table_privilege('authenticated','public.zavi_warehouse_movements','TRUNCATE') THEN
   RAISE EXCEPTION 'TRUNCATE must never be granted to a store user';
 END IF;
 IF NOT has_table_privilege('authenticated','public.zavi_warehouse_movements','INSERT') THEN
   RAISE EXCEPTION 'Owner needs authorized ledger posting';
 END IF;
 PERFORM public.zavi_warehouse_post_movement(
 'aaaaaaaa-0000-4000-8000-000000000001',
 '11111111-1111-4111-8111-111111111111',
 NULL,'11111111-aaaa-4111-8111-111111111111','P1',10.0000,'initial'
 );
 -- Idempotent offline retry must not increase stock twice.
 PERFORM public.zavi_warehouse_post_movement(
 'aaaaaaaa-0000-4000-8000-000000000001',
 '11111111-1111-4111-8111-111111111111',
 NULL,'11111111-aaaa-4111-8111-111111111111','P1',10.0000,'initial'
 );
 SELECT count(*) INTO count_rows FROM public.zavi_warehouse_movements;
 IF count_rows<>1 THEN RAISE EXCEPTION 'Duplicate movement was persisted'; END IF;
 PERFORM public.zavi_warehouse_post_movement(
 'aaaaaaaa-0000-4000-8000-000000000002',
 '11111111-1111-4111-8111-111111111111',
 '11111111-aaaa-4111-8111-111111111111',
 '11111111-bbbb-4111-8111-111111111111','P1',7.0000,'transfer'
 );
 SELECT
  coalesce(sum(CASE WHEN to_warehouse_id='11111111-aaaa-4111-8111-111111111111'
   THEN quantity WHEN from_warehouse_id='11111111-aaaa-4111-8111-111111111111'
   THEN -quantity ELSE 0 END),0)
 INTO from_balance
 FROM public.zavi_warehouse_movements WHERE product_ref='P1';
 SELECT
  coalesce(sum(CASE WHEN to_warehouse_id='11111111-bbbb-4111-8111-111111111111'
   THEN quantity WHEN from_warehouse_id='11111111-bbbb-4111-8111-111111111111'
   THEN -quantity ELSE 0 END),0)
 INTO to_balance
 FROM public.zavi_warehouse_movements WHERE product_ref='P1';
 IF from_balance<>3 OR to_balance<>7 THEN
   RAISE EXCEPTION 'Transfer did not preserve stock totals: % / %',from_balance,to_balance;
 END IF;
 -- Exhaust the source, then retry the identical outgoing movement:
 -- replay must succeed without running the BEFORE INSERT nonnegative guard a second time.
 PERFORM public.zavi_warehouse_post_movement(
 'aaaaaaaa-0000-4000-8000-000000000020',
 '11111111-1111-4111-8111-111111111111',
 '11111111-aaaa-4111-8111-111111111111',
 '11111111-bbbb-4111-8111-111111111111','P1',3.0000,'exhaust and retry'
 );
 PERFORM public.zavi_warehouse_post_movement(
 'aaaaaaaa-0000-4000-8000-000000000020',
 '11111111-1111-4111-8111-111111111111',
 '11111111-aaaa-4111-8111-111111111111',
 '11111111-bbbb-4111-8111-111111111111','P1',3.0000,'exhaust and retry'
 );
 SELECT count(*) INTO count_rows FROM public.zavi_warehouse_movements
 WHERE id='aaaaaaaa-0000-4000-8000-000000000020';
 IF count_rows <> 1 THEN RAISE EXCEPTION 'Retry after full stock withdrawal was duplicated'; END IF;
 SELECT coalesce(sum(CASE WHEN to_warehouse_id='11111111-aaaa-4111-8111-111111111111'
 THEN quantity WHEN from_warehouse_id='11111111-aaaa-4111-8111-111111111111'
 THEN -quantity ELSE 0 END),0) INTO from_balance
 FROM public.zavi_warehouse_movements WHERE product_ref='P1';
 IF from_balance <> 0 THEN RAISE EXCEPTION 'Retried transfer changed source stock unexpectedly: %',from_balance; END IF;
 BEGIN
  PERFORM public.zavi_warehouse_post_movement(
   'aaaaaaaa-0000-4000-8000-000000000003',
   '11111111-1111-4111-8111-111111111111',
   '11111111-aaaa-4111-8111-111111111111',NULL,'P1',9,'overspend'
  );
  RAISE EXCEPTION 'EXPECTED_ERROR_NOT_RAISED';
 EXCEPTION WHEN others THEN
  IF SQLERRM='EXPECTED_ERROR_NOT_RAISED' OR position('Insufficient warehouse stock' IN SQLERRM)=0 THEN RAISE; END IF;
 END;
 BEGIN
  PERFORM public.zavi_warehouse_post_movement(
   'aaaaaaaa-0000-4000-8000-000000000001',
   '11111111-1111-4111-8111-111111111111',
   NULL,'11111111-aaaa-4111-8111-111111111111','P1',11,'changed retry'
  );
  RAISE EXCEPTION 'EXPECTED_ERROR_NOT_RAISED';
 EXCEPTION WHEN others THEN
  IF SQLERRM='EXPECTED_ERROR_NOT_RAISED' OR position('Operation ID already used' IN SQLERRM)=0 THEN RAISE; END IF;
 END;
 BEGIN
  PERFORM public.zavi_warehouse_post_movement(
   'aaaaaaaa-0000-4000-8000-000000000004',
   '11111111-1111-4111-8111-111111111111',
   NULL,'11111111-aaaa-4111-8111-111111111111','PHANTOM',10,'invalid product'
  );
  RAISE EXCEPTION 'EXPECTED_ERROR_NOT_RAISED';
 EXCEPTION WHEN others THEN
  IF SQLERRM='EXPECTED_ERROR_NOT_RAISED' OR position('unauthorized' IN SQLERRM)=0 THEN RAISE; END IF;
 END;
 BEGIN
  PERFORM public.zavi_warehouse_post_movement(
   'aaaaaaaa-0000-4000-8000-000000000005',
   '22222222-2222-4222-8222-222222222222',
   NULL,'22222222-aaaa-4222-8222-222222222222','P2',10,'cross tenant'
  );
  RAISE EXCEPTION 'EXPECTED_ERROR_NOT_RAISED';
 EXCEPTION WHEN others THEN
  IF SQLERRM='EXPECTED_ERROR_NOT_RAISED' OR position('unauthorized' IN SQLERRM)=0 THEN RAISE; END IF;
 END;
 BEGIN
  PERFORM public.zavi_warehouse_post_movement(
   'aaaaaaaa-0000-4000-8000-000000000006',
   '11111111-1111-4111-8111-111111111111',
   NULL,'11111111-aaaa-4111-8111-111111111111','P1','NaN'::numeric,'invalid number'
  );
  RAISE EXCEPTION 'EXPECTED_ERROR_NOT_RAISED';
 EXCEPTION WHEN others THEN
  IF SQLERRM='EXPECTED_ERROR_NOT_RAISED' OR position('Invalid quantity' IN SQLERRM)=0 THEN RAISE; END IF;
 END;
 -- Direct table inserts cannot bypass negative stock guard.
 BEGIN
  INSERT INTO public.zavi_warehouse_movements
  (id,workspace_id,from_warehouse_id,product_ref,quantity,created_by)
  VALUES('aaaaaaaa-0000-4000-8000-000000000007',
   '11111111-1111-4111-8111-111111111111',
   '11111111-aaaa-4111-8111-111111111111','P1',8.0000,auth.uid());
  RAISE EXCEPTION 'EXPECTED_ERROR_NOT_RAISED';
 EXCEPTION WHEN others THEN
  IF SQLERRM='EXPECTED_ERROR_NOT_RAISED' OR position('Insufficient warehouse stock' IN SQLERRM)=0 THEN RAISE; END IF;
 END;
END;
$tests$;
RESET ROLE;
\echo 'PASS: owner role, product authority, strict positive stock, tenant isolation, idempotency, TRUNCATE removal'
