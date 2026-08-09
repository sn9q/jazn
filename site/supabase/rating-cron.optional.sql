-- ═══════════════════════════════════════════════════════════
--  اختياري: تحديث تقييم قوقل آلياً عبر SerpApi
--  لا تنفّذه إلا بعد ما يتوفر مفتاح SerpApi، لأن الجدولة
--  بمفتاح فاضي تفشل يومياً على مشروع سونق المشترك بلا فائدة.
--  استبدل YOUR_SERPAPI_KEY أولاً، بعدين نفّذ هذا الملف وحده.
--  للتراجع: select cron.unschedule('jazn-refresh-google-rating');
-- ═══════════════════════════════════════════════════════════

-- ─── التحديث الآلي اليومي لتقييم قوقل (عبر SerpApi) ───
-- الامتدادات مفعلة مسبقاً في مشروع سونق، الأسطر التالية آمنة للتكرار
create extension if not exists http with schema extensions;
create extension if not exists pg_cron;

-- استبدل YOUR_SERPAPI_KEY بمفتاحك قبل التنفيذ (placeId جَازن مضبوط)
create or replace function jazn.refresh_google_rating()
returns void language plpgsql security definer set search_path = jazn, extensions
as $$
declare j jsonb; r numeric; c int;
begin
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '25');
  select content::jsonb into j from extensions.http_get(
    'https://serpapi.com/search.json?engine=google_maps&type=place&hl=ar&place_id=ChIJvSp0YmrjBxYR1_CFyBOXpoY&api_key=YOUR_SERPAPI_KEY');
  r := nullif(j->'place_results'->>'rating','')::numeric;
  c := nullif(j->'place_results'->>'reviews','')::int;
  if r is not null and c is not null and r between 0 and 5 then
    update jazn.site_settings
       set value = value || jsonb_build_object('rating', r, 'count', c),
           updated_at = now()
     where key = 'google_rating';
  end if;
end $$;

-- الدالة لا تستدعى من الخارج إطلاقاً (حماية رصيد SerpApi)
revoke all on function jazn.refresh_google_rating() from public;
revoke all on function jazn.refresh_google_rating() from anon;
revoke all on function jazn.refresh_google_rating() from authenticated;

-- جدولة يومية: 03:20 UTC = 06:20 صباحاً بتوقيت السعودية
select cron.schedule('jazn-refresh-google-rating', '20 3 * * *', 'select jazn.refresh_google_rating()');

-- ملاحظة: لا نحتاج جدولة keepalive جديدة،
-- جدولة supabase-keepalive حقت سونق تبقي المشروع كله نشطاً.
