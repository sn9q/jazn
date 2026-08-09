/* صفحة المنيو: تحميل الأصناف من Supabase (مخطط jazn) + تمييز التصنيف النشط.
   لو القاعدة غير مربوطة أو تعذر الاتصال: المنيو الثابت المدمج يبقى كما هو،
   فباركود المنيو لا يتعطل أبداً. */

/* ─── تحميل المنيو من قاعدة البيانات ─── */
(function () {
  "use strict";
  const cfg = window.JAZN_CONFIG || {};
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return; // غير مربوط بعد، الثابت يكفي

  let clientPromise = null;
  const getClient = () => {
    if (!clientPromise) {
      clientPromise = import("https://esm.sh/@supabase/supabase-js@2")
        .then(({ createClient }) => createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
          db: { schema: "jazn" },
        }));
    }
    return clientPromise;
  };

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* الصورة تجي من القاعدة الآن (عمود image_url)، ويعدّلها المدير من اللوحة.
     لو الصنف بلا صورة تظهر شارة اللوقو بدل مربع فاضي. */
  const FALLBACK = "/assets/img/logo-badge.webp";

  const renderRow = (it) => `<li class="mp-item">
      <img src="${esc(it.image_url || FALLBACK)}" alt="" loading="lazy" decoding="async" width="58" height="58">
      <div class="mp-item__body">
        <div class="mp-item__name">${esc(it.name)}</div>
        ${it.note ? `<div class="mp-item__note">${esc(it.note)}</div>` : ""}
      </div>
      <div class="mp-item__price">${Number(it.price)} <small class="sar" role="img" aria-label="ريال سعودي"><svg aria-hidden="true"><use href="#sar"></use></svg></small></div>
    </li>`;

  let lastLoad = 0;
  async function loadMenu() {
    try {
      const supabase = await getClient();
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .eq("is_available", true)
        .order("sort_order");
      if (error || !data || !data.length) return; // نبقي النسخة الثابتة
      lastLoad = Date.now();

      /* الحلويات صارت صفوفاً مثل بقية الأقسام، فما عاد لها مسار خاص */
      ["espresso", "freddo", "v60", "milk", "sweets", "store"].forEach((cat) => {
        const list = document.querySelector(`#${cat} .mp-list`);
        const rows = data.filter((i) => i.category === cat);
        if (list && rows.length) list.innerHTML = rows.map(renderRow).join("");
      });
    } catch (e) {
      /* فشل الشبكة/CDN، المنيو الثابت يبقى ظاهراً */
    }
  }

  loadMenu();

  /* سفاري يعيد الصفحة من bfcache ببيانات قديمة عند الرجوع، نعيد الجلب */
  window.addEventListener("pageshow", (e) => { if (e.persisted) loadMenu(); });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && Date.now() - lastLoad > 60000) loadMenu();
  });
})();

/* ─── تمييز التصنيف النشط ─── */
(function () {
  "use strict";

  var tabs = document.querySelectorAll(".mp-tabs a");
  var sections = document.querySelectorAll(".mp-section");
  if (!tabs.length || !sections.length) return;

  var setActive = function (id) {
    tabs.forEach(function (t) {
      t.classList.toggle("is-active", t.getAttribute("href") === "#" + id);
    });
  };

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
    sections.forEach(function (s) { io.observe(s); });
  }

  tabs.forEach(function (t) {
    t.addEventListener("click", function () {
      setActive(t.getAttribute("href").slice(1));
    });
  });
})();
