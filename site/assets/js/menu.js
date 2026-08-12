/* صفحة المنيو: تحميل الأصناف من Supabase (مخطط jazn) + تمييز التصنيف النشط.
   لو القاعدة غير مربوطة أو تعذر الاتصال: المنيو الثابت المدمج يبقى كما هو،
   فباركود المنيو لا يتعطل أبداً. */

/* ─── تحميل المنيو من قاعدة البيانات ─── */
(function () {
  "use strict";
  const cfg = window.JAZN_CONFIG || {};
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return; // غير مربوط بعد، الثابت يكفي

  /* قراءة REST مباشرة بلا SDK: الصفحة تحتاج نداءً واحداً (اقرأ
     الأصناف المتاحة مرتبةً)، فاستيراد مكتبة 212KB من CDN خارجي
     كلفةٌ وخطرُ عطلٍ بلا مقابل — وهذه صفحة باركود تُقرأ على
     الطاولة بشبكة الجوال. */
  const fetchItems = () =>
    fetch(cfg.SUPABASE_URL +
          "/rest/v1/menu_items?is_available=eq.true&order=sort_order&select=*", {
      headers: {
        apikey: cfg.SUPABASE_ANON_KEY,
        Authorization: "Bearer " + cfg.SUPABASE_ANON_KEY,
        "Accept-Profile": "jazn",
      },
    }).then((r) => (r.ok ? r.json() : null));

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* الصورة تجي من القاعدة (عمود image_url)، ويعدّلها المدير من اللوحة.
     ولو حذفها المدير تُحذف خانتها كلها — لا شارةَ لوقو بديلة: البديل
     يقول «هنا صورة ناقصة»، والحذف يقول «هذا الصنف بلا صورة»، والثاني
     هو المقصود. والصف يلتئم وحده لأنه flex فيتمدّد النص مكانها. */
  const renderRow = (it) => `<li class="mp-item">
      ${it.image_url ? `<img src="${esc(it.image_url)}" alt="" loading="lazy" decoding="async" width="58" height="58">` : ""}
      <div class="mp-item__body">
        <div class="mp-item__name">${esc(it.name)}</div>
        ${it.note ? `<div class="mp-item__note">${esc(it.note)}</div>` : ""}
      </div>
      <div class="mp-item__price">${Number(it.price)} <small class="sar" role="img" aria-label="ريال سعودي"><svg aria-hidden="true"><use href="#sar"></use></svg></small></div>
    </li>`;

  let lastLoad = 0;
  async function loadMenu() {
    try {
      const data = await fetchItems();
      if (!data || !data.length) return; // نبقي النسخة الثابتة
      lastLoad = Date.now();

      /* الحلويات صارت صفوفاً مثل بقية الأقسام، فما عاد لها مسار خاص */
      /* التصنيف الذي فرغ من القاعدة يُفرَّغ في الصفحة كذلك. كان
         الشرط rows.length يترك النسخة الثابتة القديمة ظاهرة، فلو
         ألغى المدير كل أصناف تصنيف بقيت معروضةً للزائر. */
      ["espresso", "freddo", "v60", "milk", "sweets", "store"].forEach((cat) => {
        const section = document.querySelector(`#${cat}`);
        const list = section && section.querySelector(".mp-list");
        if (!list) return;
        const rows = data.filter((i) => i.category === cat);
        list.innerHTML = rows.map(renderRow).join("");
        section.hidden = rows.length === 0;
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
