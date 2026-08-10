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

  /* انتقال حي بين واجهة جاز والـ «محصول» بدون مكتبة أو فيديو ثقيل. */
  var journey = document.getElementById("jaznJourney");
  if (journey && !reduced) {
    var journeyTicking = false;
    var clamp01 = function (value) { return Math.max(0, Math.min(1, value)); };
    var paintJourney = function () {
      var rect = journey.getBoundingClientRect();
      var range = Math.max(journey.offsetHeight - window.innerHeight, 1);
      var progress = clamp01(-rect.top / range);
      var entry = clamp01(progress / 0.28);
      var turn = clamp01((progress - 0.12) / 0.42);
      var land = clamp01((progress - 0.52) / 0.30);
      var storyA = 1 - clamp01((progress - 0.16) / 0.18);
      var storyB = clamp01((progress - 0.18) / 0.16) * (1 - clamp01((progress - 0.55) / 0.16));
      var storyC = clamp01((progress - 0.62) / 0.16);
      journey.style.setProperty("--entry", entry.toFixed(3));
      journey.style.setProperty("--turn", turn.toFixed(3));
      journey.style.setProperty("--land", land.toFixed(3));
      journey.style.setProperty("--story-a", storyA.toFixed(3));
      journey.style.setProperty("--story-b", storyB.toFixed(3));
      journey.style.setProperty("--story-c", storyC.toFixed(3));
      journeyTicking = false;
    };
    paintJourney();
    window.addEventListener("scroll", function () {
      if (journeyTicking) return;
      journeyTicking = true;
      window.requestAnimationFrame(paintJourney);
    }, { passive: true });
    window.addEventListener("resize", paintJourney, { passive: true });
  } else if (journey) {
    journey.style.setProperty("--entry", "1");
    journey.style.setProperty("--turn", "1");
    journey.style.setProperty("--land", "1");
    journey.style.setProperty("--story-a", "0");
    journey.style.setProperty("--story-b", "0");
    journey.style.setProperty("--story-c", "1");
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
})();
