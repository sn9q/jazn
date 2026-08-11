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
--  التنفيذ: الصقه كاملاً في Supabase → SQL Editor → Run.
--  آمن للتكرار: تشغيله مرتين لا يضاعف شيئاً.
--  للتراجع: select cron.unschedule('jazn-refresh-google-rating');
--
--  المفتاح لا تكتبه: الخطوة الأولى تنقله من دالة سونق القائمة في
--  نفس القاعدة إلى خزنة Supabase، فيصير للمشروعين مصدر واحد.
--  ولو رغبت يوماً بتغييره:
--    select vault.update_secret(id, 'المفتاح-الجديد')
--    from vault.secrets where name = 'serpapi_key';
-- ═══════════════════════════════════════════════════════════

-- ─── ١) المفتاح إلى الخزنة (مرة واحدة) ───
do $seed$
declare k text;
begin
  if exists (select 1 from vault.secrets where name = 'serpapi_key') then
    raise notice 'المفتاح موجود في الخزنة، تخطّي';
    return;
  end if;

  select (regexp_match(
            pg_get_functiondef('public.refresh_google_rating()'::regprocedure),
            'api_key=([A-Za-z0-9_-]+)'))[1]
    into k;

  if k is null or length(k) < 20 then
    raise exception 'ما لقيت مفتاح SerpApi في دالة سونق. ضعه يدوياً ثم أعد التشغيل: select vault.create_secret(''المفتاح'', ''serpapi_key'');';
  end if;

  perform vault.create_secret(k, 'serpapi_key', 'مفتاح SerpApi المشترك بين سونق وجَازن');
  raise notice 'نُقل المفتاح إلى الخزنة';
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
  select decrypted_secret into k from vault.decrypted_secrets where name = 'serpapi_key';
  if k is null or k = '' then
    raise notice 'لا مفتاح في الخزنة';
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
