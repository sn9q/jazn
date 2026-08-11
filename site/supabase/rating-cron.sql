-- ═══════════════════════════════════════════════════════════
--  تحديث تقييم قوقل آلياً — جَازن
--
--  الفكرة: القاعدة تحدّث نفسها بنفسها. لا خادم وسيط ولا خدمة
--  خارجية ولا مفتاح في المتصفح — المنطق كله يسكن هنا:
--
--    pg_cron  منبّه داخل القاعدة يوقظ الدالة يومياً
--    http     يخلي القاعدة تسأل الإنترنت بنفسها
--    SerpApi  يقرأ بيانات قوقل ماب الرسمية
--
--  ┌───────────────────────────────────────────────────────┐
--  │  المطلوب منك: سطر واحد فقط — ضع مفتاح جَازن في        │
--  │  السطر المعلَّم بـ«ضع المفتاح هنا» أدناه.              │
--  │  ثم الصق الملف كاملاً في Supabase → SQL Editor → Run. │
--  └───────────────────────────────────────────────────────┘
--
--  المفتاح يُحفظ في خزنة Supabase باسم jazn_serpapi_key — خاصٌّ
--  بجَازن وحده، منفصل عن مفتاح سونق، فرصيد كلٍّ منهما مستقل.
--  ولا يظهر في نص الدالة ولا في سجلات القاعدة.
--
--  آمن للتكرار: تشغيله مرتين لا يضاعف شيئاً، وإعادة تشغيله
--  بمفتاح جديد تُحدّث القديم (وهكذا تُدوَّر المفاتيح).
--
--  للتراجع: select cron.unschedule('jazn-refresh-google-rating');
-- ═══════════════════════════════════════════════════════════

-- ─── ١) المفتاح إلى الخزنة ───
do $seed$
declare
  k text := 'ضع المفتاح هنا';   -- ←←← السطر الوحيد الذي تعدّله
  existing uuid;
begin
  if k is null or k = 'ضع المفتاح هنا' or length(k) < 20 then
    raise exception 'ضع مفتاح جَازن من serpapi.com في السطر المعلَّم أولاً، ثم أعد التشغيل';
  end if;

  select id into existing from vault.secrets where name = 'jazn_serpapi_key';

  if existing is null then
    perform vault.create_secret(k, 'jazn_serpapi_key', 'مفتاح SerpApi الخاص بجَازن وحده');
    raise notice 'حُفظ مفتاح جَازن في الخزنة';
  else
    perform vault.update_secret(existing, k);
    raise notice 'حُدّث مفتاح جَازن في الخزنة';
  end if;
end
$seed$;

-- ─── ٢) الدالة ───
-- security definer لأن الخزنة وjazn.site_settings محميتان بـRLS،
-- والدالة نفسها ممنوعة على الجميع (الخطوة ٣) فلا يستدعيها إلا المنبّه.
create or replace function jazn.refresh_google_rating()
returns void
language plpgsql
security definer
set search_path = jazn, extensions, vault, public
as $fn$
declare
  k text;
  j jsonb;
  r numeric;
  c int;
begin
  select decrypted_secret into k from vault.decrypted_secrets where name = 'jazn_serpapi_key';
  if k is null or k = '' then
    raise notice 'لا مفتاح جَازن في الخزنة';
    return;
  end if;

  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '25');

  select content::jsonb into j
    from extensions.http_get(
      'https://serpapi.com/search.json?engine=google_maps&type=place&hl=ar'
      || '&place_id=ChIJvSp0YmrjBxYR1_CFyBOXpoY&api_key=' || k);

  r := nullif(j->'place_results'->>'rating', '')::numeric;
  c := nullif(j->'place_results'->>'reviews', '')::int;

  -- الصدق: قيمة غير معقولة تعني خللاً في المصدر لا تغيّراً حقيقياً،
  -- فنُبقي آخر قيمة صحيحة ولا نخترع رقماً أبداً
  if r is null or c is null or r <= 0 or r > 5 or c < 1 then
    raise notice 'رد غير معقول، أُبقيت القيمة السابقة';
    return;
  end if;

  update jazn.site_settings
     set value = value || jsonb_build_object('rating', r, 'count', c),
         updated_at = now()
   where key = 'google_rating';
exception
  when others then
    -- انقطاع شبكة أو رد مشوّه: نصمت ونُبقي المحفوظ
    raise notice 'تعذّر التحديث: %', sqlerrm;
end
$fn$;

-- ─── ٣) لا تُستدعى من الخارج إطلاقاً ───
-- حماية رصيد SerpApi: لولا هذا لاستطاع أي زائر استنزافه بنداءات RPC
revoke all on function jazn.refresh_google_rating() from public, anon, authenticated;

-- ─── ٤) الجدولة اليومية ───
-- 03:25 UTC = 06:25 صباحاً بالسعودية. اختير الربع تفادياً لازدحام
-- مهام سونق (10 و15 و40 من نفس الساعة).
select cron.unschedule('jazn-refresh-google-rating')
 where exists (select 1 from cron.job where jobname = 'jazn-refresh-google-rating');

select cron.schedule('jazn-refresh-google-rating', '25 3 * * *',
                     'select jazn.refresh_google_rating()');

-- ─── ٥) تشغيلة أولى فورية، ثم اعرض النتيجة ───
select jazn.refresh_google_rating();

select value->>'rating' as "التقييم",
       value->>'count'  as "عدد المراجعات",
       updated_at       as "آخر تحديث"
  from jazn.site_settings
 where key = 'google_rating';
