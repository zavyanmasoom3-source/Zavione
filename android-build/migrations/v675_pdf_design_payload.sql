-- ZAVI ONE 66.75 PDF design contract
-- Idempotent backfill: preserves accounting keys and only writes the PDF contract.
update public.zavi_workspaces
set payload = payload || jsonb_build_object(
  'pdfDesign', jsonb_build_object(
    'version','66.75-pdf',
    'source','ZAVI ONE 1-5.pdf',
    'theme','pdf-clean',
    'routes',jsonb_build_array('dashboard','sales','purchases','products','contacts','debtors','creditors','money','hawala','expenses','reports','journal','repairs','waste','settings','subscription'),
    'features',jsonb_build_object(
      'dashboard',true,
      'purchaseManager',true,
      'multiCountryPurchase',true,
      'inTransitPartialReceipt',true,
      'installments',true,
      'invoiceHistory',true,
      'barcodeLabelStudio',true,
      'cashbox',true,
      'whatsappDirect',true,
      'customerMessages',true,
      'reports',true,
      'responsiveAllDevices',true,
      'lightDarkGlass',true
    ),
    'purchase',jsonb_build_object(
      'actions',jsonb_build_array('new','internal','external','returns'),
      'suggestedCount',10
    ),
    'barcode',jsonb_build_object(
      'enabled',true,
      'symbology','code128',
      'sizes',jsonb_build_array('40x25','50x30','58x30','80x40'),
      'defaultSize','50x30',
      'copies',1
    ),
    'cashbox',jsonb_build_object(
      'enabled',true,
      'independent',true,
      'openingBalance',true,
      'movements',true
    ),
    'messaging',jsonb_build_object(
      'whatsapp',true,
      'direct',true,
      'fileAndReceipt',true
    ),
    'admin',jsonb_build_object(
      'routeMapVersion','1465',
      'designVersion','1467'
    )
  ),
  'pdfDesignVersion','66.75'
),
revision=revision+1,
updated_at=now()
where coalesce(payload->>'pdfDesignVersion','') <> '66.75';

-- Verification query (read-only):
-- select count(*) as pdf_ready_workspaces,
--        min(jsonb_array_length(payload->'pdfDesign'->'routes')) as min_routes
-- from public.zavi_workspaces
-- where payload->>'pdfDesignVersion'='66.75';
