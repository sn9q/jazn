/* جَازن: حركة «اللافتة تشتعل».
   IntersectionObserver فقط، بلا أي مستمع تمرير.
   وشبكة أمان: كل شيء يظهر بعد 2.5 ثانية مهما صار. */

(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* اللافتة تشتعل عند التحميل */
  var sign = document.getElementById("sign");
  if (sign && !reduced) {
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        sign.classList.add("is-on");
      });
    });
  }

  /* ظهور الأقسام */
  var targets = Array.prototype.slice.call(document.querySelectorAll(".reveal"));

  if (!("IntersectionObserver" in window) || reduced) {
    targets.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.1 }
    );
    targets.forEach(function (el) { io.observe(el); });

    /* شبكة الأمان */
    window.setTimeout(function () {
      targets.forEach(function (el) { el.classList.add("is-in"); });
    }, 2500);
  }

  /* زر التواصل العائم: يفتح وينغلق، ويقفل بالخارج وبالإسكيب */
  var fab = document.getElementById("socialFab");
  var fabBtn = document.getElementById("socialFabBtn");
  if (fab && fabBtn) {
    var setFab = function (open) {
      fab.classList.toggle("is-open", open);
      fabBtn.setAttribute("aria-expanded", open ? "true" : "false");
    };

    fabBtn.addEventListener("click", function () {
      setFab(fabBtn.getAttribute("aria-expanded") !== "true");
    });

    document.addEventListener("click", function (e) {
      if (!fab.contains(e.target)) setFab(false);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape" || fabBtn.getAttribute("aria-expanded") !== "true") return;
      setFab(false);
      fabBtn.focus();
    });
  }

  /* حد الهيدر عند مغادرة الهيرو، بمراقبة حارس لا بمستمع تمرير */
  var header = document.querySelector(".site-header");
  var sentinel = document.querySelector("[data-header-sentinel]");
  if (header && sentinel && "IntersectionObserver" in window) {
    new IntersectionObserver(
      function (entries) {
        header.classList.toggle("is-scrolled", !entries[0].isIntersecting);
      },
      { rootMargin: "-72px 0px 0px 0px" }
    ).observe(sentinel);
  }

  /* القسم النشط في التنقل: يضيء بلون اللافتة */
  if ("IntersectionObserver" in window) {
    var spied = [];
    Array.prototype.forEach.call(
      document.querySelectorAll(".site-nav a[href^='#']"),
      function (link) {
        var section = document.querySelector(link.getAttribute("href"));
        if (section) spied.push({ link: link, section: section });
      }
    );
    if (spied.length) {
      var spy = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            spied.forEach(function (pair) {
              pair.link.removeAttribute("aria-current");
              if (pair.section === entry.target) {
                pair.link.setAttribute("aria-current", "true");
              }
            });
          });
        },
        { rootMargin: "-50% 0px -45% 0px", threshold: 0 }
      );
      spied.forEach(function (pair) { spy.observe(pair.section); });
    }
  }
  var scfg = window.JAZN_CONFIG || {};

  /* الأسعار: مطبوعة في الصفحة، وهذه تنعشها من القاعدة نفسها التي
     تغذّي المنيو واللوحة. قبلها كان سعر الرئيسية نسخةً يدويةً من
     سعر المنيو — يعدّله المدير من اللوحة فيتغيّر في المنيو ويبقى
     القديم هنا، ولا شيء ينبّه أحداً.

     الربط بالترتيب (category + sort_order) لا بالاسم: أسماء
     القاعدة غير متسقة أصلاً — «كولومبيا - كاتورا» في الاسبريسو
     و«كولومبيا- كاتورا» في الفريدو، وستة صفوف اسمها V60 نفسه —
     والترتيب هو ما يضبطه المدير من اللوحة فهو المعنى المستقر.

     الرئيسية تعرض ستة محاصيل عمداً؛ من أراد الباقي فالمنيو. */
  var crops = document.querySelectorAll("[data-crop]");
  if (crops.length && window.fetch && scfg.SUPABASE_URL && scfg.SUPABASE_ANON_KEY) {
    fetch(scfg.SUPABASE_URL +
          "/rest/v1/menu_items?is_available=eq.true&select=category,sort_order,price", {
      headers: {
        apikey: scfg.SUPABASE_ANON_KEY,
        Authorization: "Bearer " + scfg.SUPABASE_ANON_KEY,
        "Accept-Profile": "jazn"
      }
    })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (rows) {
        if (!rows || !rows.length) return;
        var byKey = {};
        rows.forEach(function (r) { byKey[r.category + ":" + r.sort_order] = r.price; });
        Array.prototype.forEach.call(crops, function (card) {
          var i = card.getAttribute("data-crop");
          Array.prototype.forEach.call(card.querySelectorAll("[data-price]"), function (el) {
            var v = Number(byKey[el.getAttribute("data-price") + ":" + i]);
            /* سعر غير معقول يعني خللاً لا تغيّراً — يبقى المطبوع */
            if (!(v > 0 && v < 10000)) return;
            el.textContent = String(Math.round(v * 100) / 100);
          });
        });
      })
      .catch(function () {});
  }

  /* التقييم: الرقم مطبوع في الصفحة ليقرأه محرك البحث ومن عطّل
     الجافاسكربت، وهذه تنعشه من قاعدة البيانات. القاعدة نفسها هي
     التي تسأل قوقل يومياً (pg_cron + SerpApi، انظر
     site/supabase/rating-cron.optional.sql) — فلا مفتاح في المتصفح
     ولا خدمة وسيطة، والزائر يقرأ صفاً واحداً مخزّناً.

     نداء REST مباشر بلا مكتبة: السطر واحد وقراءةٌ عامة، فاستيراد
     SDK من CDN خارجي كلفةٌ وخطرُ عطلٍ بلا مقابل. */
  var rate = {
    r: document.querySelector('[data-gmaps="rating"]'),
    c: document.querySelector('[data-gmaps="reviews"]')
  };
  if (rate.r && rate.c && window.fetch && scfg.SUPABASE_URL && scfg.SUPABASE_ANON_KEY) {
    fetch(scfg.SUPABASE_URL + "/rest/v1/site_settings?key=eq.google_rating&select=value", {
      headers: {
        apikey: scfg.SUPABASE_ANON_KEY,
        Authorization: "Bearer " + scfg.SUPABASE_ANON_KEY,
        "Accept-Profile": "jazn"
      }
    })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (rows) {
        var v = rows && rows[0] && rows[0].value;
        if (!v) return;
        var n = Number(v.rating), c = Number(v.count);
        /* لا نعرض إلا رقماً معقولاً — وإلا يبقى المطبوع */
        if (!(n >= 1 && n <= 5) || !(c >= 1) || c % 1 !== 0) return;
        rate.r.textContent = String(Math.round(n * 10) / 10);
        rate.c.textContent = String(c);
      })
      .catch(function () {});
  }

  /* سنة الحقوق: مكتوبة في HTML فتظهر صحيحة بلا جافاسكربت، وتُحدَّث
     هنا للسنة الجارية فلا يشيخ الشريط بعد رأس السنة */
  Array.prototype.forEach.call(document.querySelectorAll("[data-year]"), function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
