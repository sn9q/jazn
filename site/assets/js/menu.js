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

  /* صور الأصناف الحالية بأسمائها، الصنف الجديد من اللوحة يأخذ صورة الشارة */
  const IMG = {
    "اثيوبيا- يرغاتشيف|espresso": "p00", "كولومبيا - كاتورا|espresso": "p01",
    "اليمن - بلقيس|espresso": "p02", "عنب & شمام|espresso": "p03",
    "مانجو|espresso": "p04", "كرز|espresso": "p05", "امريكانو|espresso": "p06",
    "اثيوبيا- يرغاتشيف|freddo": "p07", "كولومبيا- كاتورا|freddo": "p08",
    "اليمن - بلقيس|freddo": "p09", "عنب & شمام|freddo": "p10",
    "مانجو|freddo": "p11", "كرز|freddo": "p12",
    "V60 ICE - HOT|v60": "p13",
    "ماتشا|milk": "p19",
    "كوكيز|sweets": "p20", "كرانشي|sweets": "p21", "تشيز مدريد|sweets": "p22",
    "دولتشي بيكان|sweets": "p23", "بودينق شوكليت|sweets": "p24",
    "كوب اسبريسو|store": "p25",
  };
  /* صور V60 حسب ترتيب الصف داخل قسمه (الاسم متكرر) */
  const V60_BY_ORDER = ["p13", "p14", "p15", "p16", "p17", "p18"];
  const imgFor = (it, cat, idx) => {
    if (cat === "v60") return V60_BY_ORDER[idx] || "p13";
    return IMG[it.name + "|" + cat] || null;
  };

  const renderRow = (it, cat, idx) => {
    const key = imgFor(it, cat, idx);
    const src = key ? `/assets/img/menu/${key}.webp` : "/assets/img/logo-badge.webp";
    return `<li class="mp-item">
      <img src="${src}" alt="" loading="lazy" decoding="async" width="58" height="58">
      <div class="mp-item__body">
        <div class="mp-item__name">${esc(it.name)}</div>
        ${it.note ? `<div class="mp-item__note">${esc(it.note)}</div>` : ""}
      </div>
      <div class="mp-item__price">${Number(it.price)} <small class="sar" role="img" aria-label="ريال سعودي"><svg aria-hidden="true"><use href="#sar"></use></svg></small></div>
    </li>`;
  };

  const renderSweet = (it) => {
    const key = IMG[it.name + "|sweets"];
    const src = key ? `/assets/img/menu/${key}.webp` : "/assets/img/logo-badge.webp";
    return `<li class="sweet">
      <img src="${src}" alt="${esc(it.name)}" loading="lazy" decoding="async" width="400" height="400">
      <figcaption>${esc(it.name)} <span class="price">${Number(it.price)} <small class="sar" role="img" aria-label="ريال سعودي"><svg aria-hidden="true"><use href="#sar"></use></svg></small></span></figcaption>
    </li>`;
  };

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

      ["espresso", "freddo", "v60", "milk", "store"].forEach((cat) => {
        const list = document.querySelector(`#${cat} .mp-list`);
        const rows = data.filter((i) => i.category === cat);
        if (list && rows.length) list.innerHTML = rows.map((it, idx) => renderRow(it, cat, idx)).join("");
      });
      const sw = document.querySelector("#sweets .mp-sweets");
      const sweets = data.filter((i) => i.category === "sweets");
      if (sw && sweets.length) sw.innerHTML = sweets.map(renderSweet).join("");
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
