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
