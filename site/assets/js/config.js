/* إعدادات الربط مع Supabase
   ─────────────────────────────
   المشروع مشترك مع سونق (نفس مشروع Supabase)، وجداول جَازن
   معزولة في مخطط مستقل اسمه jazn — التفاصيل في site/supabase/schema.sql

   1. من Project Settings → API انسخ القيمتين:
      - Project URL      → SUPABASE_URL
      - anon public key  → SUPABASE_ANON_KEY
   2. من Settings → API → Exposed schemas أضف: jazn
   3. الصق القيمتين هنا واحفظ الملف.

   ملاحظة: مفتاح anon عام بطبيعته ومصمم للمتصفح،
   الحماية الفعلية من سياسات RLS في القاعدة. */
window.JAZN_CONFIG = {
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",
};
