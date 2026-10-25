# آماده‌سازی انتشار رسمی ZAVI ONE و ZAVI ONE ADMIN در Google Play

**وضعیت:** مسیر ساخت AAB آماده شده است؛ **هیچ برنامه‌ای هنوز در Google Play منتشر نشده**. اگر کلید امضای مالک در GitHub Secrets تنظیم نشده باشد، فایل AAB عمداً بدون امضا ساخته و با کلمه UNSIGNED نام‌گذاری می‌شود. چنین فایلی قابل ارسال به Google Play نیست.

## بسته‌ها و شناسه‌های دائمی

| برنامه | شناسه بسته رسمی | versionCode | versionName |
|---|---|---:|---|
| ZAVI ONE | `com.zavione.one` | 6569 | 65.69 |
| ZAVI ONE ADMIN | `com.zavione.one.admin` | 4156 | 1.4.16 |

- سطح هدف Android 16 / API 36؛ `minSdk 26`.
- فایل پیشنهادی فروشگاه Google Play فرمت `AAB` است. نسخه‌های QA جداگانه با شناسه `.browserqa` برای ثبت رسمی مناسب نیستند.
- برنامه ADMIN صرفاً برای مالک مرکزی سیستم است. منتشرشدن APK یا ظاهرشدن صفحه ورود، **مجوز دسترسی مدیر مرکزی نیست**. کنترل اصلی باید همیشه سمت سرور باقی بماند.
- آزمون مرورگری QA نمایشی است؛ تست واقعی سرور، دستگاه‌های اندروید، چاپگر، دوربین، و انتقال آفلاین لازم است.

## کلید اختصاصی مالک؛ آن را برای دیگران نفرستید

Google Play دو کلید جدا دارد: **app signing key** که گوگل می‌تواند مدیریت کند، و **upload key** که نزد توسعه‌دهنده می‌ماند. کلید آپلود را روی رایانۀ مالک و با ابزار `keytool` بسازید. برای هر برنامه کلید جداگانه پیشنهاد می‌شود.

برای فروشگاهی روی کامپیوتر خود:
```bash
keytool -genkeypair -v -keystore zavi-one-upload.jks -alias zavi_one_upload -keyalg RSA -keysize 3072 -validity 10000 -storetype JKS
```

برای مدیریت مرکزی:
```bash
keytool -genkeypair -v -keystore zavi-admin-upload.jks -alias zavi_admin_upload -keyalg RSA -keysize 3072 -validity 10000 -storetype JKS
```

از فایل‌های JKS و رمزها در جای امن و آفلاین **دو نسخۀ پشتیبان** نگه دارید. نه کلید و نه رمز را در GitHub commit، Release، issue، پیام ChatGPT یا عکس قرار ندهید.

محتوای base64 فایل JKS را فقط در حساب GitHub خود تحت **Settings → Secrets and variables → Actions** وارد کنید. در ویندوز PowerShell:
```powershell
[Convert]::ToBase64String([System.IO.File]::ReadAllBytes("zavi-one-upload.jks")) | Set-Clipboard
```

هشت Secret جداگانه لازم است:

| ZAVI ONE | ZAVI ONE ADMIN |
|---|---|
| ZAVI_ONE_UPLOAD_KEYSTORE_B64 | ZAVI_ADMIN_UPLOAD_KEYSTORE_B64 |
| ZAVI_ONE_UPLOAD_STORE_PASSWORD | ZAVI_ADMIN_UPLOAD_STORE_PASSWORD |
| ZAVI_ONE_UPLOAD_KEY_ALIAS | ZAVI_ADMIN_UPLOAD_KEY_ALIAS |
| ZAVI_ONE_UPLOAD_KEY_PASSWORD | ZAVI_ADMIN_UPLOAD_KEY_PASSWORD |

پیش از امضای اولین نسخه باید مطمئن شوید که همان شناسهٔ برنامه **در حساب Google Play شما آزاد و متعلق به شماست**. اگر برنامهٔ اصلی قبلاً منتشر شده باشد، تطابق package name، گواهی upload key، نسخه و روش انتقال کلید باید قبل از تعویض بررسی شود.

## ساخت مجدد پس از ذخیره Secrets

1. مخزن `zavyanmasoom6-glitch/Zavione` را باز کنید.
2. به بخش Actions بروید و workflow **ZAVI ONE 65.69 and ADMIN 1.4.16 Google Play AAB Candidates** را انتخاب کنید.
3. شاخه `zavi-google-play-aab-release-candidate-20261025` را انتخاب کرده و `Run workflow` را بزنید.
4. پس از موفقیت هر دو، در GitHub Releases تگ `zavi-google-play-aab-candidates-20261025`، فایل‌های دارای `SIGNED_UPLOAD_CANDIDATE` را دریافت کنید.
5. اگر پسوند فایل `UNSIGNED_REQUIRES_OWNER_KEY.aab` است **آن را به گوگل ارسال نکنید**؛ Secretها ناقص‌اند یا امضا هنوز انجام نشده.
6. وارد Play Console → برنامه مربوط → Testing → Internal testing یا Closed testing → Create new release شوید، AAB همان برنامه را بارگذاری کنید و قوانین و دسترسی‌های لازم را تکمیل کنید.
7. پس از آزمون عملی و تأیید گوگل، انتشار مرحله‌ای (staged rollout) و پایش خطاها را انجام دهید.

**نکته:** ساخت workflow به معنی ورود به Play Console، تأیید هویت توسعه‌دهنده یا انتشار عمومی نیست.

## موارد الزامی که هنوز باید مالک یا تیم پروژه انجام دهد

- [ ] ثبت/تأیید Google Play Console و نام بسته‌های هر دو اپلیکیشن
- [ ] کلید upload مالک و تنظیم هشت Secret محرمانه؛ تأیید SHA-256 گواهی در Play App Signing
- [ ] یک **Privacy Policy** عمومی و معتبر داخل هر برنامه و در Play Console با نام مالک و روش تماس؛ دقیقاً مطابق پردازش واقعی معلومات کاربران
- [ ] تکمیل **Data safety** شامل معلومات مشتری، حساب‌های مالی، اطلاعات دستگاه، ورود ابری، دوربین، همگام‌سازی و SDKهای مورد استفاده
- [ ] فرایند واقعی حذف حساب درون برنامه و URL حذف حساب (اگر برنامه امکان ایجاد حساب دارد)؛ **حذف خودکار دیتابیس را بدون طراحی و پشتیبان فعال نکنید**
- [ ] عکس‌ها و متن معرفی برنامه، رده‌بندی سنی، سیاست تبلیغات، ویژگی‌های مالی یا خریدهای درون‌برنامه در صورت شمول
- [ ] دسترسی محدود و آزمایشی برای بررسی‌کننده گوگل بدون افشای حساب اصلی ADMIN و اطلاعات مشتریان
- [ ] آزمون مالک واقعی و کاربر غیرمجاز: هیچ فروشنده‌ای نباید وارد پنل مرکزی ADMIN شود
- [ ] آزمایش انتقال دستگاه، معاملات آفلاین ارسال‌نشده، جلوگیری از خروج ناخواسته، همگام‌سازی، بارکد و چاپ فاکتور روی گوشی واقعی
- [ ] آزمایش آپدیت از نسخه نصب‌شده سابق و حفظ داده‌های مشتریان؛ **شناسه و گواهی ثابت برای آینده**
- [ ] بررسی هشدارهای امنیتی سرور، توابع حساس و تأیید مجوزهای اجرای سروری؛ هشدار به‌تنهایی اثبات حفره نیست
- [ ] بررسی سیاست‌های Google Play برای انتشار یک برنامۀ ADMIN مخصوص تنها یک مالک؛ ممکن است مسیر توزیع خصوصی مناسب‌تر باشد

## لینک منابع رسمی
- [Use Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756)
- [Google Play target API requirements](https://support.google.com/googleplay/android-developer/answer/11926878)
- [Data safety and privacy policy](https://support.google.com/googleplay/android-developer/answer/18258653)
- [App account deletion](https://support.google.com/googleplay/android-developer/answer/13327111)
- [Prepare for review and restricted sign-in](https://support.google.com/googleplay/android-developer/answer/9859455)

**حریم خصوصی و داده‌های مشتری:** متن سیاست حریم خصوصی نباید با حدس نوشته و منتشر شود. لازم است پردازش واقعی اطلاعات، روش حذف، زمان نگهداری و نام و آدرس تماس مالک تأیید گردد.
