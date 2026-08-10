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

  /* ليلة تمرّ بين الهيرو والمحصول.
     التمرير يحرّك الساعة من ٩:٥٠ م إلى ٦:٠٠ ص وينسحب الليل للفجر،
     وكلمة «مفتوح» ما تتغير. الرسم يشتغل فقط والشريط على الشاشة،
     ومع prefers-reduced-motion نخلي الشريط على حالة الفجر الثابتة
     المكتوبة أصلاً في HTML وCSS. */
  var pass = document.getElementById("nightPass");
  var clock = document.getElementById("nightClock");
  if (pass && clock && !reduced) {
    /* ساعات الليل الميتة، اللي ما يفتح فيها غيرهم: من ٢:٥٥ ص إلى ٧:٠٥ ص.
       المدى مضبوط عشان الضوء يطابق الساعة: أول خيط فجر يجي عند ٤:١٠
       والشروق يكتمل عند ٥:٥٥، وهي بالضبط حدود منحنى الفجر تحت. */
    var AR = "٠١٢٣٤٥٦٧٨٩";
    var START_MIN = 2 * 60 + 55;
    var SPAN_MIN = 250;

    var arabic = function (n, pad) {
      var s = String(n);
      while (pad && s.length < pad) s = "0" + s;
      return s.replace(/[0-9]/g, function (d) { return AR[+d]; });
    };

    var clockAt = function (p) {
      var total = (START_MIN + Math.round(p * SPAN_MIN)) % 1440;
      var h24 = Math.floor(total / 60);
      var h = h24 % 12 || 12;
      return arabic(h) + ":" + arabic(total % 60, 2) + (h24 < 12 ? " ص" : " م");
    };

    /* 0 = الشريط داخل من أسفل الشاشة، 1 = خرج من فوقها */
    var passProgress = function () {
      var r = pass.getBoundingClientRect();
      var vh = window.innerHeight || 1;
      return Math.max(0, Math.min(1, (vh - r.top) / (vh + r.height)));
    };

    /* الليل يطول والفجر يجي بسرعة في آخره، مثل الفجر الحقيقي.
       ينتهي عند 0.72 لا عند 1: الشريط لسه ظاهراً على الشاشة وقتها،
       فالزائر يشوف الليلة وهي تكتمل لا وهي تطلع من فوق */
    var dawnCurve = function (p) {
      var d = Math.max(0, Math.min(1, (p - 0.30) / 0.42));
      return d * d * (3 - 2 * d);
    };

    /* انقلابة لون الكلمة: نافذة ضيقة عند اللحظة اللي تصير فيها السماء
       خلفها فاتحة فعلاً، فالعبور بين الكريمي والحبر يمرّ في لمح */
    var wordFlip = function (d) {
      var w = Math.max(0, Math.min(1, (d - 0.62) / 0.16));
      return w * w * (3 - 2 * w);
    };

    var passRunning = false;
    var lastText = "";
    var paint = function () {
      if (!passRunning) return;
      var p = passProgress();
      var d = dawnCurve(p);
      pass.style.setProperty("--p", d.toFixed(3));
      /* الأفق يوصل الكريم قبل السماء بكثير، فالحد بين الشريط وقسم
         المحصول ما يبين كخط في منتصف الانتقال */
      pass.style.setProperty("--pb", Math.min(1, d * 1.7).toFixed(3));
      pass.style.setProperty("--pw", wordFlip(d).toFixed(3));
      var text = clockAt(p);
      if (text !== lastText) { clock.textContent = text; lastText = text; }
      window.requestAnimationFrame(paint);
    };

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(
        function (entries) {
          if (entries[0].isIntersecting) {
            if (!passRunning) { passRunning = true; window.requestAnimationFrame(paint); }
          } else {
            passRunning = false;
          }
        },
        { rootMargin: "120px" }
      ).observe(pass);
    }
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
