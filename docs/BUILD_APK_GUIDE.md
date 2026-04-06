# دليل بناء ملف APK (Build APK Guide)

## الخطوات المتبعة لبناء التطبيق بنجاح:

1. **تثبيت التبعيات (npm install)**
   - في حال حدوث أخطاء تتعلق بـ (native binding) أو تعارضات Tailwind، يفضل حذف `node_modules` و `package-lock.json` ثم إعادة التشغيل.

2. **بناء ملفات الويب (npm run build)**
   - يتم استخدام Vite لإنشاء ملفات الإنتاج في مجلد `dist`.

3. **إضافة منصة أندرويد (npx capacitor add android)**
   - يتم إنشاء مجلد `android` وربطه بالمشروع.

4. **إعداد بيئة Java و Gradle**
   - تم استخدام **Java 21** (المسار: `/usr/local/sdkman/candidates/java/21.0.9-ms`).
   - تم ضبط `JAVA_HOME` و `PATH` لضمان التوافق مع إصدارات Gradle الحديثة.
   - إصدار Gradle المستخدم: **8.x**.

5. **إعداد Android SDK**
   - تم التأكد من تعريف `ANDROID_HOME` وتثبيت الأدوات اللازمة (commandline tools, platform-tools, platforms).

6. **تشغيل عملية البناء (Gradle assembleDebug)**
   - تم تشغيل الأمر لبناء ملف APK تجريبي (Debug).

7. **موقع ملف APK النهائي**
   - المسار: `android/app/build/outputs/apk/debug/app-debug.apk`
   - تم نسخ نسخة إلى جذر المشروع باسم: `app-debug.apk`.

## ملاحظات هامة للإنتاج (Release):
- لبناء نسخة `Release` موقعة، يجب توفير معلومات **Keystore**:
  - مسار ملف Keystore.
  - كلمة سر الـ Keystore.
  - الـ Alias الخاص بالمفتاح.
  - كلمة سر المفتاح.
