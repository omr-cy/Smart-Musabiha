# 📄 دليل بناء تطبيق الأندرويد باستخدام GitHub Actions (وحلول المشاكل)

هذا الملف يوثق الخطوات النهائية والصحيحة لبناء تطبيق الأندرويد (APK) الخاص بمشروع Capacitor باستخدام GitHub Actions. تم كتابة هذا التوثيق بناءً على سلسلة من التحديات التقنية التي تم حلها لضمان استقرار عملية البناء في المستقبل.

---

## 🚀 الكود النهائي لملف الـ Workflow (`android-build.yml`)

هذا هو الكود النهائي والمستقر الذي يجب أن يكون موجوداً في مسار `.github/workflows/android-build.yml`:

```yaml
name: Build Android APK

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          
      - name: Install dependencies
        run: npm install
        
      - name: Build web app
        run: npm run build
        
      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '21'
          
      - name: Install Android Platform
        run: |
          if [ ! -d "android" ]; then
            npx cap add android
          fi
          npx cap sync android
        
      - name: Regenerate Gradle Wrapper
        run: |
          cd android
          rm -f gradle/wrapper/gradle-wrapper.jar
          gradle wrapper --gradle-version 8.13
          chmod +x gradlew
        
      - name: Setup Gradle
        uses: gradle/actions/setup-gradle@v4
        with:
          gradle-version: wrapper
          build-root-directory: android

      - name: Build with Gradle
        run: |
          cd android
          ./gradlew assembleDebug --stacktrace --info
        
      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: app-debug
          path: android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 🛠️ المشاكل التي واجهناها وكيف تم حلها (التفاصيل التقنية)

لكي لا نعود لنقطة الصفر، هذه هي قائمة بالأخطاء التي ظهرت والحلول الجذرية التي تم تطبيقها:

### 1. مشكلة ملف الـ Gradle Wrapper التالف (Corrupt Jarfile)
* **الخطأ:** `Error: Invalid or corrupt jarfile /.../gradle-wrapper.jar` وأيضاً فشل في خطوة `Setup Gradle` بسبب `Validation Failed`.
* **السبب:** ملف الـ `gradle-wrapper.jar` المرفوع على المستودع كان تالفاً، مما جعل نظام الحماية في GitHub Actions يرفض تشغيله، وعند إجبار النظام على تشغيله كان يفشل (Crash).
* **الحل:** قمنا بإضافة خطوة **Regenerate Gradle Wrapper** التي تقوم بـ:
  1. حذف الملف التالف تماماً: `rm -f gradle/wrapper/gradle-wrapper.jar`
  2. توليد ملف جديد وسليم 100% باستخدام أداة Gradle المدمجة في سيرفر Ubuntu.

### 2. مشكلة إصدار Gradle غير المتوافق
* **الخطأ:** `Minimum supported Gradle version is 8.13. Current version is 8.5.`
* **السبب:** إضافة الأندرويد (Android Gradle Plugin - AGP) المستخدمة في المشروع حديثة جداً وتشترط وجود Gradle بإصدار 8.13 على الأقل.
* **الحل:** في خطوة توليد الـ Wrapper، قمنا بتحديد الإصدار المطلوب بدقة: `gradle wrapper --gradle-version 8.13`.

### 3. مشكلة إصدار Java (JDK)
* **الخطأ:** `error: invalid source release: 21`
* **السبب:** الكود المصدري للمشروع أو إحدى مكتباته تمت برمجتها لتتطلب **Java 21**، بينما كان الـ Action يستخدم Java 17.
* **الحل:** تم تعديل خطوة `Setup Java` لتستخدم `java-version: '21'`.

### 4. مشكلة عدم وجود ملفات الأندرويد (Capacitor Sync)
* **السبب:** في بيئة الـ CI/CD، مجلد `android` قد لا يحتوي على الكود المحدث للويب (assets) أو الإضافات (plugins) إذا لم يتم عمل مزامنة.
* **الحل:** إضافة الأمر السحري `npx cap sync android` بعد بناء الويب. هذا الأمر يضمن أن كود الـ React/Vite تم نقله بنجاح إلى مجلد الأندرويد وأن جميع الـ Native Plugins جاهزة للبناء.

### 5. مشكلة صلاحيات التشغيل (Permission Denied)
* **السبب:** سيرفرات Linux (التي يعمل عليها GitHub Actions) تتطلب إعطاء صلاحية تنفيذ صريحة للملفات النصية.
* **الحل:** إضافة `chmod +x gradlew` قبل محاولة تشغيل أمر البناء.

---

## 💡 نصائح للمستقبل

1. **لا تقم برفع مجلد `android/build` أو `android/app/build` إلى GitHub:** تأكد دائماً أن ملف `.gitignore` يحتوي على هذه المجلدات لتجنب رفع ملفات ضخمة وغير ضرورية.
2. **تتبع الأخطاء (Debugging):** إذا فشل البناء في المستقبل، لا تنظر إلى أسفل الـ Log (عند `... 199 more`). دائماً اصعد للأعلى وابحث عن أول جملة تبدأ بـ `Caused by:` أو `* What went wrong:`.
3. **التحديثات:** إذا قمت بتحديث Capacitor أو React Native في المستقبل، قد تحتاج إلى تحديث إصدارات `Java` أو `Gradle` في هذا الملف لتتوافق مع المتطلبات الجديدة.
