-- ═══════════════════════════════════════════════════════════
--  جَازن اسبريسو بار، إعداد قاعدة البيانات (يُنفذ مرة واحدة)
--  الصق هذا الملف كاملاً في: Supabase → SQL Editor → Run
--
--  المشروع مشترك مع سونق، لذلك كل شيء هنا داخل مخطط مستقل
--  اسمه jazn: لا يلمس مخطط public إطلاقاً ولا جداول سونق.
--
--  «مهم» بعد التنفيذ:
--  1. Settings → API → Exposed schemas: أضف jazn إلى القائمة
--  2. Authentication → Users → Add user:
--     الإيميل jazn@jazn.local وكلمة مرور قوية
--     (الدخول في admin.html يكون باسم المستخدم Jazn فقط)
-- ═══════════════════════════════════════════════════════════

create schema if not exists jazn;
grant usage on schema jazn to anon, authenticated;

-- ─── أصناف المنيو ───
create table if not exists jazn.menu_items (
  id           uuid primary key default gen_random_uuid(),
  category     text not null check (category in ('espresso', 'freddo', 'v60', 'milk', 'sweets', 'store')),
  name         text not null,
  note         text,                            -- المعالجة والإيحاءات (اختياري)
  price        numeric(6,2) not null,
  is_available boolean not null default true,   -- إظهار/إخفاء الصنف
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);
grant select on jazn.menu_items to anon, authenticated;
grant insert, update, delete on jazn.menu_items to authenticated;

-- ─── الموظفون: المصرح لهم بتعديل المنيو ───
create table if not exists jazn.staff (
  email    text primary key,
  name     text,
  is_owner boolean not null default false,
  added_at timestamptz not null default now()
);
alter table jazn.staff enable row level security;
grant select, delete on jazn.staff to authenticated;
grant insert (email, name) on jazn.staff to authenticated;
grant update (name) on jazn.staff to authenticated;

create or replace function jazn.is_staff()
returns boolean language sql stable security definer set search_path = jazn
as $$ select exists (select 1 from jazn.staff where lower(email) = lower(coalesce(auth.jwt()->>'email',''))) $$;

create or replace function jazn.is_owner()
returns boolean language sql stable security definer set search_path = jazn
as $$ select exists (select 1 from jazn.staff where lower(email) = lower(coalesce(auth.jwt()->>'email','')) and is_owner) $$;

grant execute on function jazn.is_staff(), jazn.is_owner() to authenticated;

drop policy if exists staff_select on jazn.staff;
drop policy if exists staff_insert on jazn.staff;
drop policy if exists staff_update on jazn.staff;
drop policy if exists staff_delete on jazn.staff;
create policy staff_select on jazn.staff for select to authenticated
  using (jazn.is_owner() or lower(email) = lower(coalesce(auth.jwt()->>'email','')));
create policy staff_insert on jazn.staff for insert to authenticated with check (jazn.is_owner());
create policy staff_update on jazn.staff for update to authenticated using (jazn.is_owner()) with check (jazn.is_owner());
create policy staff_delete on jazn.staff for delete to authenticated using (jazn.is_owner() and is_owner = false);

-- تغيير كلمات المرور: المدير يغير للموظفين، وكل شخص يغير لنفسه فقط
create or replace function jazn.set_staff_password(target_email text, new_password text)
returns void language plpgsql security definer set search_path = jazn, extensions
as $$
declare caller_email text; caller_is_owner boolean; target_exists boolean; target_is_owner boolean;
begin
  caller_email := lower(coalesce(auth.jwt()->>'email',''));
  if not jazn.is_staff() then raise exception 'unauthorized'; end if;
  if length(new_password) < 8 then raise exception 'كلمة المرور 8 خانات على الأقل'; end if;
  if new_password !~ '[A-Z]' then raise exception 'كلمة المرور تحتاج حرفاً كبيراً واحداً على الأقل (A-Z)'; end if;
  if new_password !~ '[^a-zA-Z0-9]' then raise exception 'كلمة المرور تحتاج رمزاً مميزاً مثل @'; end if;
  -- حاجز صلب: هذي الدالة تكتب في auth.users المشتركة مع سونق،
  -- فتُمنع من لمس أي إيميل خارج نطاق jazn.local مهما كان محتوى jazn.staff
  if lower(target_email) not like '%@jazn.local' then raise exception 'out of scope'; end if;
  select true, is_owner into target_exists, target_is_owner from jazn.staff where lower(email) = lower(target_email);
  if target_exists is null then raise exception 'target not staff'; end if;
  caller_is_owner := jazn.is_owner();
  if lower(target_email) = caller_email then
    null; -- تغيير ذاتي مسموح
  elsif caller_is_owner and not target_is_owner then
    null; -- المدير يغير لموظف
  else
    raise exception 'not allowed';
  end if;
  update auth.users set encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf'))
   where lower(email) = lower(target_email);
end $$;
revoke all on function jazn.set_staff_password(text, text) from public;
revoke all on function jazn.set_staff_password(text, text) from anon;
grant execute on function jazn.set_staff_password(text, text) to authenticated;

-- المالك أول الموظفين (email = <username>@jazn.local)
insert into jazn.staff (email, name, is_owner) values ('jazn@jazn.local', 'المدير', true) on conflict do nothing;

-- ─── إعدادات الموقع (تقييم قوقل) ───
create table if not exists jazn.site_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
alter table jazn.site_settings enable row level security;
grant select on jazn.site_settings to anon, authenticated;
grant insert, update on jazn.site_settings to authenticated;

drop policy if exists settings_public_read on jazn.site_settings;
drop policy if exists settings_owner_insert on jazn.site_settings;
drop policy if exists settings_owner_update on jazn.site_settings;
create policy settings_public_read  on jazn.site_settings for select using (true);
create policy settings_owner_insert on jazn.site_settings for insert to authenticated with check (jazn.is_owner());
create policy settings_owner_update on jazn.site_settings for update to authenticated using (jazn.is_owner()) with check (jazn.is_owner());

insert into jazn.site_settings (key, value) values
  ('google_rating', '{"rating": 4.8, "count": 440, "url": "https://maps.app.goo.gl/vQsRaDumDRTAAFv6A"}'::jsonb)
on conflict (key) do nothing;

-- ─── تقييم قوقل ───
-- القيمة أعلاه ثابتة، والتحديث الآلي اليومي عبر SerpApi منفصل في
-- rating-cron.optional.sql ولا يُنفَّذ إلا بعد توفر مفتاح SerpApi.

-- ─── الحماية (RLS) على المنيو ───
alter table jazn.menu_items enable row level security;

drop policy if exists menu_public_read  on jazn.menu_items;
drop policy if exists menu_staff_insert on jazn.menu_items;
drop policy if exists menu_staff_update on jazn.menu_items;
drop policy if exists menu_staff_delete on jazn.menu_items;

create policy menu_public_read  on jazn.menu_items for select using (true);
create policy menu_staff_insert on jazn.menu_items for insert to authenticated with check (jazn.is_staff());
create policy menu_staff_update on jazn.menu_items for update to authenticated using (jazn.is_staff()) with check (jazn.is_staff());
create policy menu_staff_delete on jazn.menu_items for delete to authenticated using (jazn.is_staff());

-- ─── تعبئة المنيو الحالي (من منيوهم الرسمي على menus-sa، بإملائهم) ───
insert into jazn.menu_items (category, name, note, price, sort_order) values
  -- الاسبريسو
  ('espresso', 'اثيوبيا- يرغاتشيف', 'المعالجة: مجففة، الإيحاءات: ازهار - خوخ - حلاوة - توت ازرق', 12, 1),
  ('espresso', 'كولومبيا - كاتورا', 'المعالجة: تجفيف مطول، الإيحاءات: توفي - فواكة حمراء - عنب', 12, 2),
  ('espresso', 'اليمن - بلقيس', 'المعالجة: مجفف لاهوائي، الإيحاءات: توت - برتقال - حلاوه', 17, 3),
  ('espresso', 'عنب & شمام', 'المعالجة: تخمير لاهوائي، الإيحاءات: شمام - عنب - عسل', 16, 4),
  ('espresso', 'مانجو', 'المعالجة: تخمير لاهوائي، الإيحاءات: مانجو - توت ازرق - كراميل', 16, 5),
  ('espresso', 'كرز', 'المعالجة: تنقيع، الإيحاءات: كرز - عسل - مستكة', 16, 6),
  ('espresso', 'امريكانو', null, 13, 7),
  -- اسبريسو فريدو
  ('freddo', 'اثيوبيا- يرغاتشيف', 'المعالجة: مجففة، الإيحاءات: ازهار - خوخ - حلاوة - توت ازرق', 13, 1),
  ('freddo', 'كولومبيا- كاتورا', 'المعالجة: تجفيف مطول، الإيحاءات: توفي - فواكة حمراء - عنب', 13, 2),
  ('freddo', 'اليمن - بلقيس', 'المعالجة: مجفف لاهوائي، الإيحاءات: توت - برتقال - حلاوه', 18, 3),
  ('freddo', 'عنب & شمام', 'المعالجة: تخمير لاهوائي، الإيحاءات: شمام - عنب - عسل', 17, 4),
  ('freddo', 'مانجو', 'المعالجة: تخمير لاهوائي، الإيحاءات: مانجو - توت ازرق - كراميل', 17, 5),
  ('freddo', 'كرز', 'المعالجة: تنقيع، الإيحاءات: كرز - عسل - مستكة', 17, 6),
  -- القهوة المقطرة
  ('v60', 'V60 ICE - HOT', 'اثيوبيا- يرغاتشيف، المعالجة: مجففة، الإيحاءات: ازهار - خوخ - حلاوة - توت ازرق', 18, 1),
  ('v60', 'V60 ICE -HOT', 'كولومبيا - كاتورا، المعالجة: تجفيف مطول، الإيحاءات: توفي - فواكة حمراء - عنب', 19, 2),
  ('v60', 'V60 ICE -HOT', 'اليمن - بلقيس، المعالجة: مجفف لاهوائي، الإيحاءات: توت - برتقال - حلاوه', 25, 3),
  ('v60', 'V60 ICE -HOT', 'عنب & شمام، المعالجة: تخمير لاهوائي، الإيحاءات: شمام - عنب - عسل', 24, 4),
  ('v60', 'V60 ICE -HOT', 'مانجو، المعالجة: تخمير لاهوائي، الإيحاءات: مانجو - توت ازرق - كراميل', 24, 5),
  ('v60', 'V60 ICE -HOT', 'كولمبيا - كرز، المعالجة: تنقيع، الإيحاءات: كرز - عسل - مستكة', 24, 6),
  -- مشروبات الحليب
  ('milk', 'ماتشا', null, 21, 1),
  -- الحلويات
  ('sweets', 'تشيز مدريد', null, 23, 1),
  ('sweets', 'دولتشي بيكان', null, 22, 2),
  ('sweets', 'بودينق شوكليت', null, 22, 3),
  ('sweets', 'كوكيز', null, 9, 4),
  ('sweets', 'كرانشي', null, 9, 5),
  -- متجر جَازن
  ('store', 'كوب اسبريسو', null, 79, 1);
