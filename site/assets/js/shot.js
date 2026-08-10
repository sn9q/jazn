/* ============================================================
   جَازن: «٢٥ ثانية» — سحب شوت اسبريسو بين الهيرو وقسم المحصول.

   المحل اسمه اسبريسو بار، والعملية اللي مسمّى عليها هي هذي:
   خيطان داكنان ينزلان من فوهة الفلتر، يلتفّان، يملآن الديمي-تاس،
   وتتفتّح الكريما فوقهما. آخر السحب يشحب الخيط (blonding) ويوقف.

   الفكرة اللي تربطها بالموقع: انتقال الصفحة من ليل الهيرو إلى كريم
   قسم المحصول هو حرفياً الاسبريسو ← الكريما. فالكريما تتمدد في آخر
   المشهد لين تبتلع الكادر وتصير هي كريم القسم اللي بعده.

   كل شيء دالة في نسبة تمرير الشريط، ما فيه حلقة تدور من نفسها.
   بلا أي مكتبة. الرسم يشتغل فقط والشريط على الشاشة.
   ============================================================ */

(function () {
  "use strict";

  var band = document.getElementById("shotBand");
  var cv = document.getElementById("shotCanvas");
  var timerEl = document.getElementById("shotTimer");
  if (!band || !cv || !timerEl) return;

  var ctx;
  try {
    ctx = cv.getContext("2d");
  } catch (e) {
    return;
  }
  if (!ctx) return; // بلا canvas ما فيه شريط أصلاً، الهيرو يوصل المحصول مباشرة

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* توكنات الهوية، مقروءة من CSS فلا تتكرر القيم في مكانين */
  var css = getComputedStyle(document.documentElement);
  var tok = function (name, fallback) {
    return (css.getPropertyValue(name) || "").trim() || fallback;
  };
  var NIGHT = tok("--night", "#241811");
  var NIGHT_2 = tok("--night-2", "#301E13");
  var CREAM = tok("--cream", "#FBF6F2");
  var CREAM_2 = tok("--cream-2", "#F1E7DD");
  var WOOD = tok("--wood", "#B8935E");

  /* ─── المشهد بإحداثيات ثابتة ثم يُقاس على الشريط ───
     الصندوق شبه مربع عمداً: الاسبريسو يسقط مسافة قصيرة من الفوهة
     للفنجان، فمدّ الخيط طولاً يحوّله من سائل إلى سلك معلّق. */
  var VW = 420, VH = 420;
  var CX = VW / 2;
  var SPOUT_TIP = 64;          // نهاية فوهتي الفلتر
  var MERGE_Y = 152;           // وين يلتقي الخيطان، «ذيل الفار»
  var RIM_Y = 214, BASE_Y = 304;
  var RIM_R = 86, BASE_R = 58;
  var SAUCER_Y = 318, SAUCER_R = 134;
  var FLAT = 0.3;              // نسبة تسطّح الإهليلج، زاوية النظر

  /* حبيبات الكريما تُحسب مرة واحدة، وإلا ارتجفت كل إطار */
  var SPECKS = [];
  (function () {
    var seed = 20250809;
    var rnd = function () { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    for (var i = 0; i < 130; i++) {
      var a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd());
      SPECKS.push({ a: a, r: rr, s: 0.5 + rnd() * 1.6, o: 0.06 + rnd() * 0.22 });
    }
  })();

  var clamp01 = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
  var smooth = function (x) { x = clamp01(x); return x * x * (3 - 2 * x); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  /* خلط لونين hex بنسبة t */
  function mix(c1, c2, t) {
    var p = function (c) {
      c = c.replace("#", "");
      if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
      return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
    };
    var a = p(c1), b = p(c2);
    return "rgb(" + Math.round(lerp(a[0], b[0], t)) + "," +
                    Math.round(lerp(a[1], b[1], t)) + "," +
                    Math.round(lerp(a[2], b[2], t)) + ")";
  }

  var ellipse = function (cx, cy, rx, ry) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  };

  /* ─── الرسم ─── */
  var W = 0, H = 0, S = 1, OX = 0, OY = 0;

  function layout() {
    var r = band.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    /* المشهد يُحتوى داخل الشريط مع هامش، ويُثبت أسفله عشان الفنجان
       يقعد قريباً من حد قسم المحصول مهما تغيّر الارتفاع */
    S = Math.min(W / VW, H / VH) * 0.96;
    OX = (W - VW * S) / 2;
    OY = (H - VH * S) / 2;
  }

  function draw(p) {
    /* مراحل السحب */
    /* التوقيت كله مضغوط في النصف الأول من نافذة التمرير عمداً:
       p=1 معناها الشريط خرج من فوق الشاشة تماماً، فلو مدّينا الغسل
       لآخرها ما شاف الزائر الكريم المستقر أبداً — يخرج الشريط وهو
       لسه بلون رملي فيبان درج واضح عند قسم المحصول. */
    var flow = smooth((p - 0.12) / 0.38);       // امتلاء الفنجان
    var blonde = clamp01((p - 0.38) / 0.12);    // شحوب الخيط في آخره
    var stop = clamp01((p - 0.50) / 0.05);      // الخيط ينقطع
    var wash = clamp01((p - 0.54) / 0.16);      // الكريما تبتلع الكادر

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    var dpr = cv.width / W;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    /* خلفية ليلية بنفس تدرّج الهيرو */
    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, NIGHT);
    bg.addColorStop(1, NIGHT_2);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(OX, OY);
    ctx.scale(S, S);

    /* ── الصحن ── */
    ctx.save();
    ctx.filter = "blur(6px)";
    ctx.fillStyle = "rgba(10,6,3,0.55)";
    ellipse(CX, SAUCER_Y + 8, SAUCER_R * 0.92, SAUCER_R * FLAT * 0.8);
    ctx.fill();
    ctx.restore();

    var sg = ctx.createLinearGradient(CX - SAUCER_R, 0, CX + SAUCER_R, 0);
    sg.addColorStop(0, mix(CREAM_2, "#8d7a6b", 0.35));
    sg.addColorStop(0.45, CREAM);
    sg.addColorStop(1, mix(CREAM_2, "#8d7a6b", 0.2));
    ctx.fillStyle = sg;
    ellipse(CX, SAUCER_Y, SAUCER_R, SAUCER_R * FLAT);
    ctx.fill();
    ctx.strokeStyle = "rgba(45,28,16,0.16)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    /* ── اليد: بدونها الشكل جردل لا ديمي-تاس ── */
    ctx.strokeStyle = mix(CREAM, "#8a7869", 0.18);
    ctx.lineWidth = 13;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(CX + RIM_R - 8, RIM_Y + 16);
    ctx.bezierCurveTo(CX + RIM_R + 46, RIM_Y + 18, CX + RIM_R + 44, BASE_Y - 6, CX + BASE_R + 4, BASE_Y - 16);
    ctx.stroke();
    ctx.strokeStyle = "rgba(45,28,16,0.14)";
    ctx.lineWidth = 14.6;
    ctx.stroke();
    ctx.strokeStyle = mix(CREAM, "#8a7869", 0.1);
    ctx.lineWidth = 11;
    ctx.stroke();

    /* ── جسم الفنجان: قاعدة + جوانب بانحناء خفيف ── */
    var bodyG = ctx.createLinearGradient(CX - RIM_R, 0, CX + RIM_R, 0);
    bodyG.addColorStop(0, mix(CREAM_2, "#7d6a5c", 0.42));
    bodyG.addColorStop(0.38, CREAM);
    bodyG.addColorStop(0.72, CREAM_2);
    bodyG.addColorStop(1, mix(CREAM_2, "#7d6a5c", 0.3));
    ctx.fillStyle = bodyG;

    ellipse(CX, BASE_Y, BASE_R, BASE_R * FLAT);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(CX - RIM_R, RIM_Y);
    ctx.quadraticCurveTo(CX - RIM_R + 4, BASE_Y - 26, CX - BASE_R, BASE_Y);
    ctx.lineTo(CX + BASE_R, BASE_Y);
    ctx.quadraticCurveTo(CX + RIM_R - 4, BASE_Y - 26, CX + RIM_R, RIM_Y);
    ctx.closePath();
    ctx.fill();

    /* ── جوف الفنجان ── */
    ctx.fillStyle = mix(NIGHT, "#000000", 0.45);
    ellipse(CX, RIM_Y, RIM_R - 4, (RIM_R - 4) * FLAT);
    ctx.fill();

    /* ── السائل والكريما، مقصوصان داخل الجوف ── */
    ctx.save();
    ellipse(CX, RIM_Y, RIM_R - 5, (RIM_R - 5) * FLAT);
    ctx.clip();

    if (flow > 0.004) {
      var surfY = lerp(RIM_Y + 16, RIM_Y - 1.5, flow);
      var surfR = (RIM_R - 5) * lerp(0.18, 1, flow);

      ctx.fillStyle = "#1b0f07";
      ctx.fillRect(CX - RIM_R, surfY, RIM_R * 2, 40);

      /* سطح الكريما: قلب فاتح، وحلقة أغمق عند الحافة مثل الكوب الحقيقي.
         المركز مزاح شوي ناحية موقع سقوط الخيط */
      var bloom = smooth(flow * 1.15);
      var crema = ctx.createRadialGradient(CX, surfY - surfR * 0.06, 2, CX, surfY, surfR * 1.04);
      crema.addColorStop(0, mix("#8A5C2B", "#CB9C5E", bloom));
      crema.addColorStop(0.45, mix("#6D451F", "#B0803F", bloom));
      crema.addColorStop(0.86, mix("#4A2A12", "#8C6230", bloom));
      crema.addColorStop(1, mix("#2C180A", "#5E3E1C", bloom));
      ctx.fillStyle = crema;
      ellipse(CX, surfY, surfR, surfR * FLAT);
      ctx.fill();

      /* حبيبات الكريما */
      for (var i = 0; i < SPECKS.length; i++) {
        var sp = SPECKS[i];
        var rr = sp.r * surfR;
        ctx.globalAlpha = sp.o * bloom;
        ctx.fillStyle = "#F0D6A8";
        ellipse(CX + Math.cos(sp.a) * rr, surfY + Math.sin(sp.a) * rr * FLAT, sp.s, sp.s * 0.75);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    /* ── حلقة الحافة ── */
    ctx.strokeStyle = "rgba(255,252,248,0.9)";
    ctx.lineWidth = 2.4;
    ellipse(CX, RIM_Y, RIM_R - 2, (RIM_R - 2) * FLAT);
    ctx.stroke();

    /* ── الخيطان ── */
    var alive = clamp01(smooth((p - 0.05) / 0.06)) * (1 - stop);
    if (alive > 0.01) {
      var surfaceY = lerp(RIM_Y + 16, RIM_Y - 1.5, flow);
      /* الاسبريسو شبه أسود فعلياً، لكن فوق ليل #241811 يختفي تماماً
         ويطلع كتلة داكنة. نرفعه لبنّي متوسط عشان يُقرأ كسائل. */
      var color = mix("#5C3A18", "#D6A96B", blonde);
      ctx.globalAlpha = alive;
      ctx.strokeStyle = color;
      ctx.lineCap = "round";

      [-1, 1].forEach(function (side) {
        ctx.beginPath();
        ctx.lineWidth = lerp(5, 3.2, blonde);
        ctx.moveTo(CX + side * 26, SPOUT_TIP);
        ctx.quadraticCurveTo(CX + side * 24, MERGE_Y - 54, CX + side * 3.2, MERGE_Y);
        ctx.stroke();
      });
      /* الخيط الموحّد، «ذيل الفار»: يرفع سُمكه ثم يرقّ في آخر السحب */
      ctx.beginPath();
      ctx.lineWidth = lerp(7.5, 4, blonde);
      ctx.moveTo(CX, MERGE_Y - 6);
      ctx.lineTo(CX, surfaceY - 1);
      ctx.stroke();

      /* لمعة على يسار الخيط، تعطيه حجماً بدل ما يطلع شريطاً مسطحاً */
      ctx.globalAlpha = alive * 0.42;
      ctx.strokeStyle = mix("#9A6C36", "#F4E0BC", blonde);
      ctx.lineWidth = lerp(2.4, 1.3, blonde);
      ctx.beginPath();
      ctx.moveTo(CX - 2, MERGE_Y - 2);
      ctx.lineTo(CX - 2, surfaceY - 4);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    /* ── فوهتا الفلتر ── */
    var pfG = ctx.createLinearGradient(CX - 86, 0, CX + 86, 0);
    pfG.addColorStop(0, "#15110E");
    pfG.addColorStop(0.42, "#332C25");
    pfG.addColorStop(1, "#1B1613");
    ctx.fillStyle = pfG;
    ctx.beginPath();
    ctx.moveTo(CX - 86, 0);
    ctx.lineTo(CX + 86, 0);
    ctx.lineTo(CX + 52, 32);
    ctx.lineTo(CX - 52, 32);
    ctx.closePath();
    ctx.fill();
    [-1, 1].forEach(function (side) {
      ctx.beginPath();
      ctx.moveTo(CX + side * 14, 32);
      ctx.lineTo(CX + side * 32, 32);
      ctx.lineTo(CX + side * 27, SPOUT_TIP);
      ctx.lineTo(CX + side * 18, SPOUT_TIP);
      ctx.closePath();
      ctx.fill();
    });

    ctx.restore();

    /* ── الكادر يمتلئ كريما ثم يستقر على كريم قسم المحصول ──
       جرّبت قرص كريما يكبر: يطلع حبة مسطّحة طايحة فوق الفنجان، وجرّبت
       هالة مركزية: تطلع بقعة ضوء. الأصدق حجاب كامل بلون الكريما يغرق
       المشهد ويهدأ على --cream، فيذوب الحد مع القسم اللي بعده. */
    if (wash > 0.001) {
      /* العتامة تكتمل أول، واللون يكمّل الباقي. لو مشى الاثنان مع بعض
         يطلع حجاب دافئ نصف شفاف فوق شبه أسود = رمادي طيني، نفس
         الفخ اللي وقعت فيه أول مرة. */
      var veil = smooth(clamp01(wash / 0.5));
      var toCream = smooth(clamp01((wash - 0.45) / 0.55));
      var vg = ctx.createLinearGradient(0, 0, 0, H);
      vg.addColorStop(0, mix("#8E6234", CREAM, toCream));
      vg.addColorStop(lerp(0.55, 0.2, veil), mix("#C08A46", CREAM, toCream));
      vg.addColorStop(1, mix("#DDBA84", CREAM, toCream));
      ctx.globalAlpha = veil;
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    /* ── العدّاد ── */
    var secs = Math.min(25, (p / 0.52) * 25);
    var txt = secs.toFixed(1);
    if (txt !== lastTxt) { timerEl.firstElementChild.textContent = txt; lastTxt = txt; }
    band.style.setProperty("--pw", smooth((wash - 0.3) / 0.3).toFixed(3));
  }

  var lastTxt = "";

  /* ─── التمرير ─── */
  function progress() {
    var r = band.getBoundingClientRect();
    var vh = window.innerHeight || 1;
    return clamp01((vh - r.top) / (vh + r.height));
  }

  var running = false;
  function frame() {
    if (!running) return;
    draw(progress());
    window.requestAnimationFrame(frame);
  }

  /* مع prefers-reduced-motion نثبّت على الشوت وهو مكتمل: الفنجان
     ممتلئ والكريما تفتّحت والخيط انقطع، وقبل ما يبدأ الغسل. لو ثبّتناه
     على 1 يطلع الشريط لوحة كريم فاضية ما فيها إلا العدّاد. */
  var STILL = 0.55;
  function onResize() { layout(); draw(reduced ? STILL : progress()); }

  band.classList.add("on");
  layout();
  draw(reduced ? STILL : progress());
  window.addEventListener("resize", onResize);

  if (!reduced && "IntersectionObserver" in window) {
    new IntersectionObserver(
      function (entries) {
        if (entries[0].isIntersecting) {
          if (!running) { running = true; window.requestAnimationFrame(frame); }
        } else {
          running = false;
        }
      },
      { rootMargin: "150px" }
    ).observe(band);
  }
})();
