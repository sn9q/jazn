/* إعدادات الربط مع Supabase
   ─────────────────────────────
   المشروع مشترك مع سونق (نفس مشروع Supabase)، وجداول جَازن معزولة
   في مخطط مستقل اسمه jazn — التفاصيل في site/supabase/schema.sql

   ملاحظة أمنية: مفتاح anon عام بطبيعته ومصمم ليعيش في المتصفح،
   ولذلك يُنشر مع الموقع بلا مشكلة. الحماية الفعلية من سياسات RLS
   في القاعدة: الزائر يقرأ فقط، والكتابة للموظفين المسجلين دخولاً. */
window.JAZN_CONFIG = {
  SUPABASE_URL: "https://flukazqkadydaiuqnpsi.supabase.co",
  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsdWthenFrYWR5ZGFpdXFucHNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAyMTAsImV4cCI6MjA5OTcxNjIxMH0.d6QtChiob_-7RCRFQ-DYz2h9crGQPL9nNHeJuZTd_hY",
};
