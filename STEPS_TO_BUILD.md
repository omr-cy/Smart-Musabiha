## build apk

1. npm install
   - المشكلة الأولى: خطأ (Cannot find native binding) بسبب تبعيات Tailwind/optional dependencies.
   - الحل: حذف node_modules و package-lock.json وإعادة `npm install`.

2. npm run build (Vite)
   - نجح بناء ملفات الويب في dist.

3. npx capacitor add android
   - نجح إضافة منصة Android.

4. npx capacitor build android
   - فشل بسبب Gradle + Java 25: Unsupported class file major version 69.

5. محاولة إصلاح Gradle wrapper
   - تعديل ملف `android/gradle/wrapper/gradle-wrapper.properties` لإنهاء التحميل من gradle-8.17/8.16/8.15/8.14.

6. تحديث `android/build.gradle` إلى AGP 8.14.0 ثم العودة 8.13.0 بعد فشل العثور على artifact.

7. حل Java version
   - اكتشفنا أن Java 21 مثبت في `/usr/local/sdkman/candidates/java/21.0.9-ms`.
   - ضبطت JAVA_HOME و PATH لاستخدام Java 21.

8. مشكلة SDK location
   - خطأ: `SDK location not found` ولم يكن ANDROID_HOME معرّفًا.
   - تثبيت Android commandline tools و platform-tools و platforms; ضبط ANDROID_HOME.

9. تشغيل البناء عبر Gradle (assembleDebug)
   - نجح بنجاح بدون مشاكل توقيع.

10. نتائج ملف APK
   - الموقع: `android/app/build/outputs/apk/debug/app-debug.apk`
   - نسخ الملف إلى جذر المشروع: `app-debug.apk`.

11. ملاحظة نهائية
   - لبناء release signed APK، يجب توفير معلومات Keystore (المسار، كلمة السر،_ALIAS، كلمة سر المفتاح).