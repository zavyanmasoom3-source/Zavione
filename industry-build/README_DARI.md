# ZAVI ONE – خانواده نسخه‌های اختصاصی برای ۲۰ نوع تجارت

این پروژه از **همان سیستم حسابداری ZAVI ONE V65.72** استفاده می‌کند؛ برنامه‌های جداگانه کپی ضعیف یا حسابداری مستقل نیستند.

## فهرست اصلی صنف‌ها

| شماره | کسب‌وکار | کلید رسمی انتخاب صنف | شناسه نصب آزمایشی اندروید | نسخۀ ویندوز |
|---|---|---|---|---|
| 01 | تجارت عمومی | `general` | `com.zavione.one.general.editionqa` | Windows General Business |
| 02 | دواخانه | `pharmacy` | `com.zavione.one.pharmacy.editionqa` | Windows Pharmacy |
| 03 | فروشگاه موبایل | `mobile` | `com.zavione.one.mobile.editionqa` | Windows Mobile Shop |
| 04 | سوپرمارکیت | `supermarket` | `com.zavione.one.supermarket.editionqa` | Windows Supermarket |
| 05 | عمده‌فروشی | `wholesale` | `com.zavione.one.wholesale.editionqa` | Windows Wholesale |
| 06 | فروشگاه لباس | `clothing` | `com.zavione.one.clothing.editionqa` | Windows Clothing |
| 07 | شرکت خدماتی | `services` | `com.zavione.one.services.editionqa` | Windows Services |
| 08 | مصالح ساختمانی | `construction` | `com.zavione.one.construction.editionqa` | Windows Building Materials |
| 09 | شرکت تجارتی | `company` | `com.zavione.one.company.editionqa` | Windows Trading Company |
| 10 | صرافی و تبدیل ارز | `exchange` | `com.zavione.one.exchange.editionqa` | Windows Exchange Office |
| 11 | شرکت ساختمانی و پیمانکاری | `contractor` | `com.zavione.one.contractor.editionqa` | Windows Construction Contractor |
| 12 | زرگری و طلافروشی | `gold` | `com.zavione.one.gold.editionqa` | Windows Jewelry & Gold |
| 13 | کتاب‌فروشی و لوازم‌التحریر | `bookstore` | `com.zavione.one.bookstore.editionqa` | Windows Bookstore & Stationery |
| 14 | کفش و لوازم ورزشی | `footwear` | `com.zavione.one.footwear.editionqa` | Windows Footwear & Sports |
| 15 | آرایشی و بهداشتی | `cosmetics` | `com.zavione.one.cosmetics.editionqa` | Windows Cosmetics |
| 16 | وسایل برقی و الکترونیکی | `electronics` | `com.zavione.one.electronics.editionqa` | Windows Electronics |
| 17 | مبلمان و لوازم خانه | `furniture` | `com.zavione.one.furniture.editionqa` | Windows Furniture & Home |
| 18 | ابزار و لوازم ساختمانی | `hardware` | `com.zavione.one.hardware.editionqa` | Windows Tools & Hardware |
| 19 | لابراتوار طبی | `laboratory` | `com.zavione.one.laboratory.editionqa` | Windows Medical Laboratory |
| 20 | شرکت توزیع | `distribution` | `com.zavione.one.distribution.editionqa` | Windows Distribution |

## امنیت داده‌ها و مدیریت

- همۀ این برنامه‌ها به بک‌اند مشترک ZAVI ONE وصل می‌شوند؛ لیست فروشگاه‌ها، ۷ روز آزمایش، مجوزهای ۱۸۰/۳۶۵ روزه و اشتراک از طرف مالک مرکزی در **ZAVI ONE ADMIN** مدیریت می‌شوند.
- شناسه نصب و محل ذخیرۀ اطلاعات محلی هر نسخه **مستقل** است. انتقال محلی از یک نسخۀ اندروید/ویندوز به دیگری خودکار انجام نمی‌شود؛ قبل از جابه‌جایی حتماً تراکنش‌های ارسال‌نشده را همگام و نسخه پشتیبان تأییدشده بگیرید.
- انتخاب نوع تجارت در نسخۀ اختصاصی پیشنهاد می‌شود؛ **فقط پس از تأیید مالک فروشگاه** در «مدیریت عمومی → ذخیره تنظیمات تجارت» در حساب ذخیره می‌شود. برنامه خودسرانه حساب مشتری را تغییر نمی‌دهد.
- امکانات تخصصی که در ZAVI ONE وجود دارند از طریق فرم‌ها، گزارش‌ها و موتور تخصصی قدیمی استفاده می‌شوند. برخی ویژگی‌های پیش‌نمایش، ثبت سند مالی خودکار نیستند و پیش از فروش عمومی به صنف‌های حساس مانند دواخانه، صرافی و لابراتوار نیازمند آزمون هستند.
- دستیار آفلاین V65.72 یک **موتور راهنمای محلی و محاسبۀ نمونه** است؛ مدل زبانی مولد مستقل ندارد و بدون اجازۀ کاربر به اطلاعات مشتری یا تراکنش‌ها دسترسی ندارد.
- نسخۀ ۷ روزه را مالک مرکزی صادر می‌کند. مجوز آفلاین دستگاه، امضای جداگانه و اعتبار اشتراک را رعایت می‌کند؛ صرف ثبت اشتراک آزمایشی به معنای فعال‌شدن خودکار مجوز آفلاین دستگاه نیست.
- APKهای این خط ساخت، امضای **QA** دارند. Windows Setupها هنوز با گواهی **Authenticode** رسمی امضا نشده‌اند. پیش از انتشار عمومی و Google Play به گواهی ثابت مالک، آزمون واقعی و حریم خصوصی نیاز است.
- لینک دانلود معتبر فقط وقتی ارائه می‌شود که شاخۀ فایل از GitHub Actions با موفقیت ایجاد و فایل واقعی در آن تأیید شده باشد.

## مسیرهای ساخت و آزمایش

- `.github/workflows/zavi-v6573-industry-apks.yml`: هر کدام از ۲۰ APK کامل با build-tools API36، هویت نصب مستقل و کنترل صحت sha256
- `.github/workflows/zavi-v6573-industry-windows.yml`: هر کدام از ۲۰ Windows Setup x64 با Electron/NSIS و پروفایل داده مستقل
- `.github/workflows/zavi-v6573-admin-central-editions.yml`: ADMIN اندروید و ویندوز برای مدیریت مجموع صنف‌ها
- `industry-build/prepare_edition.py`: آماده‌سازی frontend از APK پایۀ ثابت و معتبر، بدون دست‌کاری دیتابیس
- `industry-build/edition-onboarding.js`: انتخاب دستی نوع کسب‌وکار و تأیید ذخیرۀ تنظیمات
- `industry-build/industry-profiles.json`: شناسه‌ها و نام‌های صنف‌ها مطابق `v25-business.html`.

## آزمون و محدودیت

ساخت موفق یک APK یا Setup تضمین نمی‌کند که بارکد، دوربین، چاپ، آفلاین و انتقال دستگاه در همۀ گوشی‌ها یا ویندوزها بدون خطا باشد. برای نسخۀ تجاری لازم است آزمون عملی فروش، خرید، نسیه، همگام‌سازی، چاپ، دوربین و کنترل دسترسی مالک مرکزی، و همین‌طور آزمون امنیت و بازیابی انجام شود.
