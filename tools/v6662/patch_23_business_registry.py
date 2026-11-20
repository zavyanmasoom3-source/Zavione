#!/usr/bin/env python3
"""Strict, repeatable V66.62 20 -> 23 industry-source extension.

Works on historical extracted WebView files before packaging. Keeps original
finance, authentication, stock and Supabase functions unchanged; never issues
database writes. Fail closed when any upstream source anchor changes.
"""
import argparse
import json
import re
from pathlib import Path

ADDED = [
 dict(id="restaurant",number=21,name=dict(fa="رستورانت و کافه",en="Restaurant & Cafe",ps="رستورانت او کافې"),features=["menu","tables","orders","inventory","sales","purchases","expenses"],focus="منو، سفارش میز، آشپزخانه، رسید و صندوق"),
 dict(id="covers",number=22,name=dict(fa="کاور، پوش و پوزه موبایل",en="Phone Cases & Covers",ps="د موبایل کاور او پوښ"),features=["model","color","variants","barcode","inventory","sales","purchases"],focus="چند رنگ هر کاور، مدل سازگار، بارکد و موجودی مستقل"),
 dict(id="accessories",number=23,name=dict(fa="لوازم جانبی موبایل",en="Mobile Accessories",ps="د موبایل لوازم"),features=["model","color","barcode","inventory","sales","purchases","warranty"],focus="شارژر، هندزفری، کابل، گلس و پاوربانک با موجودی مستقل")
]
HTML_FILES = ("index.html","v25-business.html")
OTHER_FILES = ("zavi-industry-kit-v6525.js","zavi-industry-engine-v6526.js",
               "zavi-industry-forms-v6529.js","v47-business.js","zavi-unified20.js")
ALL_FILES = HTML_FILES + OTHER_FILES

def exactly(source, old, new, path):
    count=source.count(old)
    assert count==1, f"{path}: expected exactly one anchor, got {count}: {old[:90]}"
    return source.replace(old,new,1)

def profiles_in_html(s,path):
    m=re.search(r'window\.ZAVI_UNIFIED_PROFILES=(\[[^;]+\]);</script>',s)
    assert m, f"{path}: missing profile registry"
    current=json.loads(m.group(1))
    assert len(current)==20 and len({p["id"] for p in current})==20, f"{path}: expected exact 20 registry"
    extras=[]
    for p in ADDED:
        extras.append({**p,"androidPackage":"com.zavione.one."+p["id"]+".editionqa",
                       "windowsAppId":"com.zavione."+p["id"]+".desktopqa","port":48400+p["number"]-1})
    fresh=json.dumps(current+extras,ensure_ascii=False,separators=(",",":"))
    return s[:m.start(1)]+fresh+s[m.end(1):]

def modify(name,old):
    s=old
    if name in HTML_FILES:
        s=profiles_in_html(s,name)
    if name=="index.html":
        anchor="company:['شرکت تجارتی','🏢','حساب‌ها و گزارش‌ها']\n};"
        changed="""company:['شرکت تجارتی','🏢','حساب‌ها و گزارش‌ها'],
 restaurant:['رستورانت و کافه','🍽️','منو، فروش، خرید و گدام'],
 covers:['کاور، پوش و پوزه موبایل','📱','مدل و رنگ‌های مستقل کاور و بارکد'],
 accessories:['لوازم جانبی موبایل','🎧','محصولات، بارکد و موجودی']
};"""
        s=exactly(s,anchor,changed,name)
    elif name=="v25-business.html":
        needle='<option value="distribution">شرکت توزیع</option>'
        # Adding only to original select; owner save flow remains original.
        s=exactly(s,needle,needle+''.join('<option value="'+p["id"]+'">'+p["name"]["fa"]+'</option>' for p in ADDED),name)
    elif name=="zavi-industry-kit-v6525.js":
        anchor="  company:{icon:'🏢'"
        entries="""  restaurant:{icon:'🍽️',label:'رستورانت و کافه',intro:'منوی غذا، سفارش میز، صندوق و کنترل مواد اولیه.',steps:['غذا یا نوشیدنی را به‌عنوان محصول ثبت کنید','موجودی مواد و قیمت هر پرس را مشخص کنید','رسید فروش و پرداخت را در سیستم اصلی ثبت کنید'],links:['products','sales','purchases','money'],fields:[f('menuItem','نام غذای منو',true),f('category','دسته غذا'),f('tableNo','شماره میز'),f('orderRef','شماره سفارش'),n('unitPrice','قیمت هر پرس')]},
  covers:{icon:'📱',label:'کاور، پوش و پوزه موبایل',intro:'هر رنگ و مدل کاور موجودی و بارکد مستقل دارد.',steps:['مدل موبایل سازگار را مشخص کنید','رنگ‌ها و بارکد جدا ثبت کنید','موجودی و فروش هر رنگ را مستقل بررسی کنید'],links:['products','sales','purchases','reports'],fields:[f('model','مدل سازگار موبایل',true),f('material','جنس کاور'),f('color','رنگ',true),f('barcode','بارکد مستقل رنگ'),n('stockQty','موجودی رنگ')]},
  accessories:{icon:'🎧',label:'لوازم جانبی موبایل',intro:'شارژر، کابل، گلس و هندزفری با مدل و رنگ جدا.',steps:['نوع لوازم و مدل سازگار را مشخص کنید','رنگ، سریال و بارکد را ثبت کنید','موجودی و ضمانت را بررسی کنید'],links:['products','sales','purchases','reports'],fields:[f('item','نام وسیله',true),f('model','مدل سازگار'),f('color','رنگ'),f('barcode','بارکد مستقل'),d('warranty','پایان ضمانت')]},
"""
        s=exactly(s,anchor,entries+anchor,name)
    elif name=="zavi-industry-engine-v6526.js":
        anchor=" company:{fields:[N('contractTotal'"
        entries=""" restaurant:{fields:[N('stockQty','مواد اولیه موجود'),N('unitPrice','قیمت غذا'),N('purchaseCost','هزینه مواد'),f('kitchenRef','کود سفارش آشپزخانه')],checks:['قیمت و رسید سفارش بررسی شود','مصرف مواد از موجودی واقعی جدا ثبت شود'],kind:'inventory'},
 covers:{fields:[N('stockQty','موجودی رنگ'),N('reorder','حداقل موجودی رنگ'),N('purchaseCost','قیمت خرید'),N('sellPrice','قیمت فروش'),f('variantBarcode','بارکد رنگ')],checks:['کود هر رنگ یکتا باشد','موجودی هر رنگ در یک محصول مستقل ثبت شود'],kind:'inventory'},
 accessories:{fields:[N('stockQty','موجودی وسیله'),N('reorder','حداقل موجودی'),N('purchaseCost','قیمت خرید'),N('sellPrice','قیمت فروش'),f('variantBarcode','بارکد وسیله')],checks:['کود محصول تکرار نشود','تعداد و ضمانت بررسی شود'],kind:'inventory'},
"""
        s=exactly(s,anchor,entries+anchor,name)
        s=exactly(s,"if(types.length!==20||types.some(t=>!work[t]))", "if(types.length!==23||types.some(t=>!work[t]))",name)
    elif name=="zavi-industry-forms-v6529.js":
        anchor=" company:[F('contract','شماره قرارداد')"
        entries=""" restaurant:[F('menuItem','نام غذا یا نوشیدنی'),F('menuCategory','دسته منو'),F('tableNo','شماره میز'),F('orderRef','شماره سفارش'),F('kitchenRef','کود آشپزخانه')],
 covers:[F('model','مدل سازگار موبایل'),F('material','جنس کاور'),F('color','رنگ'),F('variantGroup','شناسه مجموعه رنگ'),F('variantBarcode','بارکد مستقل رنگ')],
 accessories:[F('item','نوع لوازم'),F('model','مدل سازگار'),F('color','رنگ'),F('serial','سریال اختیاری'),D('warranty','پایان ضمانت'),F('variantBarcode','بارکد مستقل')],
"""
        s=exactly(s,anchor,entries+anchor,name)
        s=exactly(s,"company:'شرکت تجارتی'};", "company:'شرکت تجارتی',restaurant:'رستورانت و کافه',covers:'کاور موبایل',accessories:'لوازم جانبی موبایل'};",name)
    elif name=="v47-business.js":
        anchor="  company:['sales','purchases','products','banking','reports']\n};"
        replacement="""  company:['sales','purchases','products','banking','reports'],
  restaurant:['sales','purchases','products','orders','expenses'],
  covers:['sales','purchases','products','barcode','multi_warehouse'],
  accessories:['sales','purchases','products','barcode','multi_warehouse']
};"""
        s=exactly(s,anchor,replacement,name)
    elif name=="zavi-unified20.js":
        s=exactly(s,"types.length!==20||new Set(types.map(x=>x.id)).size!==20","types.length!==23||new Set(types.map(x=>x.id)).size!==23",name)
        s=exactly(s,"all:'انتخاب یکی از ۲۰ کسب‌وکار'","all:'انتخاب یکی از ۲۳ کسب‌وکار'",name)
        s=exactly(s,"all:'Choose from 20 businesses'","all:'Choose from 23 businesses'",name)
        s=exactly(s,"all:'له ۲۰ سوداګریو څخه یوه وټاکئ'","all:'له ۲۳ سوداګریو څخه یوه وټاکئ'",name)
        s=exactly(s," company:['money','reports','purchases','sales']\n };"," company:['money','reports','purchases','sales'],\n restaurant:['products','sales','purchases','money'],\n covers:['products','sales','purchases','reports'],\n accessories:['products','sales','purchases','reports']\n };",name)
        s=exactly(s,"company:'🏢'};","company:'🏢',restaurant:'🍽️',covers:'📱',accessories:'🎧'};",name)
    assert s!=old, f"{name}: no registry changes applied"
    return s

def run(directory):
    directory=Path(directory)
    report={}
    for name in ALL_FILES:
        f=directory/name
        old=f.read_text(encoding="utf-8")
        updated=modify(name,old)
        f.write_text(updated,encoding="utf-8")
        report[name]={"before":len(old),"after":len(updated)}
    return report

if __name__=="__main__":
    parser=argparse.ArgumentParser();parser.add_argument("--assets",required=True)
    args=parser.parse_args()
    print(json.dumps(run(args.assets),indent=2,ensure_ascii=False))
