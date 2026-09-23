# Dreko Games Launcher

هذا المشروع هو لانشر سطح مكتب لنظام Windows خاص بـ Dreko Games، ومبني باستخدام Vite + React + TypeScript + Electron.

## طريقة رفع تحديث جديد

التطبيق يتحقق من وجود تحديثات عبر GitHub Releases باستخدام `electron-updater`.

مهم جدًا:
- تعديل الكود فقط لا يكفي
- التطبيق المثبت لا يكتشف تحديث جديد إلا إذا تم نشر release فعلي على GitHub
- الـ release يجب أن يحتوي على ملفات البناء الفعلية مثل ملف exe أو installer، بالإضافة إلى ملف تحديث مثل `latest.yml` إن وجد

## 1) التأكد أن المشروع نظيف

من مجلد المشروع، نفذ:

```bash
git status
```

إذا كانت هناك تغييرات غير مسجلة، لازم تعمل commit أولاً:

```bash
git add .
git commit -m "Prepare release vX.Y.Z"
```

## 2) رفع رقم الإصدار

تغيير رقم الإصدار في ملف `package.json`:

```json
"version": "1.0.6"
```

أو باستخدام الأمر التالي:

```bash
npm version patch
```

أمثلة:
- `npm version patch` => 1.0.6
- `npm version minor` => 1.1.0
- `npm version major` => 2.0.0

## 3) بناء المشروع محليًا

نفذ:

```bash
npm run build
```

ثم قم ببناء نسخة Windows للإصدار:

```bash
npx electron-builder --win --publish always
```

هذه الخطوة تولّد ملفات التحديث التي يحتاجها التطبيق لكي يكتشف نسخة جديدة.

## 4) رفع الـ tag إلى GitHub

بعد تحديث الإصدار والعمل على الـ commit:

```bash
git add .
git commit -m "Release v1.0.6"
git tag v1.0.6
git push origin main --follow-tags
```

هذا الأمر يرسل الإصدار إلى GitHub، وإذا كان الـ workflow موجود، سيتم بناء النشر تلقائيًا.

## 5) التحقق من صفحة GitHub Releases

افتح الرابط التالي:

https://github.com/mohammedalrajhey9/DrekoGames/releases

تأكد أن الـ release يظهر وأنه يحتوي على ملفات داخل قسم Assets.

يجب أن يحتوي release على ملف واحد على الأقل مثل:
- ملف exe
- installer
- نسخة portable
- أو ملف metadata الخاص بالتحديث

إذا كان الـ release لا يحتوي على ملفات، فالتطبيق المثبت لن يجد أي تحديث.

## 6) تثبيت النسخة الجديدة على الجهاز

بعد نشر الـ release، قم بتثبيت أو تحديث التطبيق باستخدام ملف installer الجديد.

ثم افتح التطبيق المثبت كما هو المعتاد.

بعدها التطبيق سيبدأ بفحص GitHub تلقائيًا ويكتشف النسخة الجديدة.

## 7) إذا لم يظهر أي تحديث

راجع هذه النقاط:

1. لا تستخدم `npm run electron:dev` عند اختبار التحديث
2. التطبيق المثبت يحتاج أن يكون نسخة أقدم من أحدث release
3. الـ GitHub release يجب أن يحتوي على ملفات فعليّة
4. يجب أن يوجد ملف `latest.yml` أو metadata خاص بالتحديث
5. workflow الخاص بالنشر يجب أن ينجح بالكامل

يمكنك التحقق من آخر release عبر API:

```bash
curl -L https://api.github.com/repos/mohammedalrajhey9/DrekoGames/releases/latest
```

يجب أن يظهر JSON وتكون قيمة `assets` ليست فارغة.

## 8) أوامر مفيدة

```bash
npm run build
npx electron-builder --win --publish never
npx electron-builder --win --publish always
npm version patch
git status
git add .
git commit -m "Release vX.Y.Z"
git tag vX.Y.Z
git push origin main --follow-tags
```

## 9) ملاحظات مهمة

- التحديث يعتمد على GitHub Releases
- لا تعتمد على وضع التطوير عند اختبار التحديث
- اختبر دائمًا على نسخة Windows packaged
- تأكد أن رقم الإصدار والـ tag متطابقان

## 10) أفضل طريقة لرفع تحديث

استخدم هذا التسلسل في كل مرة:

```bash
npm version patch
git add .
git commit -m "Release v1.0.6"
git tag v1.0.6
git push origin main --follow-tags
```

بعدها ادخل إلى صفحة GitHub Releases وتأكد أن الملفات موجودة قبل أن تنبه المستخدمين.

## 11) أهم ملاحظة عملية

إذا كان المستخدم عنده تطبيق مثبت قديم، فلا يكفي فقط تعديل الكود داخل المشروع.

يجب أن يتم:
- رفع إصدار جديد
- إنشاء release جديد على GitHub
- وجود ملفات فعليّة في الـ release
- ثم تثبيت الإصدار الجديد على الجهاز

فقط بعد ذلك يبدأ التطبيق في اكتشاف التحديث تلقائيًا.
