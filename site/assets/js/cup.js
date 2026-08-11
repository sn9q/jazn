/* ============================================================
   جَازن: «الفنجان يهبط» — بين الهيرو وقسم المحصول.

   رسمة مسطّحة بأسلوب إيلستريشن، مرجعها صورهم لا كوب عام:
   ديمي-تاس أبيض بجسم مدوّر ويد صغيرة وعليه وردماركهم، على صحن
   بخصرة أمبر (تحية لصحونهم الفنية)، والكريما ذهبية مثل شوتهم.

   الحكاية بالتمرير، بإيقاع فلم: الكوب وصحنه ينزلان معاً كطقم
   واحد انزلاقاً متباطئاً، يستقران بتموّجة صغيرة ويتصاعد البخار،
   ثم مع مواصلة النزول يغوص الطقم في بحر كريمي يطلع من الأسفل،
   تتسع حوله دوائر على السطح ويذوب فيه ذوباناً — فيصير البحر هو
   كريم قسم «القائمة تبدأ من المحصول» والزائر يهبط وراءه.

   النعومة من التمهيد المخمَّد: الرسم لا يقفز مع نطّات السكرول بل
   يلحقها انسياباً (progress مخمَّد كل إطار)، فتطلع الحركة سينمائية
   مهما كان جهاز الزائر. canvas 2D وحده، بلا مكتبات، والرسم يشتغل
   فقط والشريط على الشاشة.
   ============================================================ */

(function () {
  "use strict";

  var band = document.getElementById("cupBand");
  var cv = document.getElementById("cupCanvas");
  if (!band || !cv) return;

  var ctx;
  try {
    ctx = cv.getContext("2d");
  } catch (e) {
    return;
  }
  if (!ctx) return; // زخرفة بحتة: بلا canvas يبقى الشريط مخفياً

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
  var AMBER = tok("--amber", "#F3C44A");
  var AMBER_DEEP = tok("--amber-deep", "#D98E2B");
  var SAND = tok("--sand", "#C9B8A4");

  var clamp01 = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
  var smooth = function (x) { x = clamp01(x); return x * x * (3 - 2 * x); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  function hex(c) {
    c = c.replace("#", "");
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
  }
  function mix(c1, c2, t, a) {
    var x = hex(c1), y = hex(c2);
    var r = Math.round(lerp(x[0], y[0], t)),
        g = Math.round(lerp(x[1], y[1], t)),
        b = Math.round(lerp(x[2], y[2], t));
    return a == null ? "rgb(" + r + "," + g + "," + b + ")"
                     : "rgba(" + r + "," + g + "," + b + "," + a + ")";
  }

  /* ─── المشهد بإحداثيات ثابتة ثم يُقاس على الشريط ─── */
  var VW = 440, VH = 470;
  var CX = VW / 2;
  var SY = 350;                 // مركز الصحن
  var FOOT_Y = SY - 9;          // نقطة جلوس الكوب على الصحن

  /* لوقو جَازن على جسم الكوب، مثل أكوابهم الحقيقية */
  var wm = new Image();
  var wmReady = false;
  wm.onload = function () { wmReady = true; renderOnce(); };
  wm.src = "/assets/img/wordmark.webp";

  /* حبيبات الكريما تُحسب مرة واحدة، وإلا ارتجفت كل إطار */
  var SPECKS = [];
  (function () {
    var seed = 20260811;
    var rnd = function () { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    for (var i = 0; i < 70; i++) {
      var a = rnd() * Math.PI * 2, rr = 0.55 + Math.sqrt(rnd()) * 0.45;
      SPECKS.push({ a: a, r: rr, s: 0.5 + rnd() * 1.1, o: 0.10 + rnd() * 0.22 });
    }
  })();

  var ell = function (cx, cy, rx, ry) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  };

  /* ─── القياس وخامة الطباعة ─── */
  var W = 0, H = 0, S = 1, OX = 0, OY = 0;
  var grain = null;

  function layout() {
    var r = band.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    S = Math.min(W / VW, H / VH) * 0.98;
    OX = (W - VW * S) / 2;
    OY = (H - VH * S) / 2;

    /* حبيبات ورق فوق المشهد كله، تكسر نظافة الفيكتور وتعطي ملمس مطبوعة */
    grain = document.createElement("canvas");
    grain.width = W; grain.height = H;
    var g = grain.getContext("2d");
    var n = Math.round((W * H) / 1100);
    for (var i = 0; i < n; i++) {
      var light = Math.random() < 0.6;
      g.fillStyle = light
        ? "rgba(255,240,220," + (0.02 + Math.random() * 0.04) + ")"
        : "rgba(0,0,0," + (0.03 + Math.random() * 0.05) + ")";
      g.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random(), 1 + Math.random());
    }
  }

  /* ─── قطع الرسمة (إحداثيات محلية، الصفر عند نقطة جلوس الكوب) ─── */

  function cupBodyPath() {
    /* قدح مدوّر مثل ديمي-تاسهم: يتّسع عند الفم ويستدير لقاعدة صغيرة */
    ctx.beginPath();
    ctx.moveTo(-60, -84);
    ctx.bezierCurveTo(-64, -50, -52, -16, -24, -6);
    ctx.quadraticCurveTo(0, 2, 24, -6);
    ctx.bezierCurveTo(52, -16, 64, -50, 60, -84);
    ctx.ellipse(0, -84, 60, 16, 0, 0, Math.PI); // إغلاق عبر قاع فوهة الكوب
    ctx.closePath();
  }

  function drawCup(squashX, squashY, cremaWobble) {
    /* اليد أولاً فتغطي الوصلةَ جسمُ الكوب */
    ctx.lineCap = "round";
    ctx.strokeStyle = CREAM;
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(54, -62);
    ctx.quadraticCurveTo(88, -46, 42, -22);
    ctx.stroke();
    ctx.strokeStyle = NIGHT;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(56, -58);
    ctx.quadraticCurveTo(80, -46, 46, -28);
    ctx.stroke();

    ctx.save();
    ctx.scale(squashX, squashY);

    /* الجسم بملء مسطّح، وظل جانبي بحدّ صريح (بوسترايز، لا تدرج ناعم) */
    cupBodyPath();
    ctx.fillStyle = CREAM;
    ctx.fill();
    ctx.save();
    cupBodyPath();
    ctx.clip();
    ctx.fillStyle = CREAM_2;
    ctx.fillRect(16, -100, 60, 110);
    ctx.fillStyle = mix(CREAM_2, "#C9AE93", 0.5);
    ctx.fillRect(40, -100, 36, 110);
    /* ظل ارتكاز خفيف قرب القاعدة */
    ctx.fillStyle = mix(CREAM_2, "#B39A80", 0.55);
    ell(0, 0, 30, 7);
    ctx.fill();
    ctx.restore();

    /* اللوقو على الجسم، مثل أكوابهم */
    if (wmReady) {
      var w = 40, h = (w * wm.height) / wm.width;
      ctx.globalAlpha = 0.92;
      ctx.drawImage(wm, -w / 2, -66, w, h);
      ctx.globalAlpha = 1;
    }

    /* جوف الفوهة ثم الكريما الذهبية، مثل شوتهم في الصورة */
    ctx.fillStyle = mix(NIGHT, "#000", 0.35);
    ell(0, -84, 56, 14.6);
    ctx.fill();

    var cw = 1 + cremaWobble;
    ctx.fillStyle = mix(AMBER_DEEP, "#B4691E", 0.35);
    ell(0, -83, 51 * cw, 12.6 / cw);
    ctx.fill();
    ctx.fillStyle = mix(AMBER_DEEP, AMBER, 0.32);
    ell(-4, -84, 40 * cw, 9.4 / cw);
    ctx.fill();
    /* هلال أفتح، لمسة الملعقة في الكريما */
    ctx.fillStyle = mix(AMBER, "#F7DE9B", 0.45);
    ctx.beginPath();
    ctx.ellipse(-10, -85.5, 20, 4.6, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = mix(AMBER_DEEP, AMBER, 0.32);
    ctx.beginPath();
    ctx.ellipse(-7, -84.6, 16, 3.4, -0.35, 0, Math.PI * 2);
    ctx.fill();
    /* حبيبات عند الحافة */
    for (var i = 0; i < SPECKS.length; i++) {
      var sp = SPECKS[i];
      ctx.globalAlpha = sp.o;
      ctx.fillStyle = "#F2D8A0";
      ell(Math.cos(sp.a) * sp.r * 48 * cw, -83 + Math.sin(sp.a) * sp.r * 11.6, sp.s, sp.s * 0.7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  function drawSaucer() {
    /* صحن بخصرة أمبر، تحية لصحونهم المرسومة */
    ctx.fillStyle = CREAM;
    ell(0, 0, 116, 27);
    ctx.fill();
    ctx.save();
    ell(0, 0, 116, 27);
    ctx.clip();
    ctx.fillStyle = CREAM_2;
    ell(34, 3, 116, 27);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = mix(AMBER_DEEP, AMBER, 0.35, 0.8);
    ctx.lineWidth = 2.6;
    ell(0, -1, 96, 21.5);
    ctx.stroke();
    ctx.fillStyle = CREAM_2;
    ell(0, -2, 58, 13.5);
    ctx.fill();
    ctx.fillStyle = mix(CREAM_2, "#C9AE93", 0.4);
    ell(2, -1, 44, 10);
    ctx.fill();
  }

  /* ─── الرسم الكامل عند نسبة p ─── */
  var lastP = 0;

  function draw(p, tms) {
    lastP = p;
    var t = (tms || 0) / 1000;

    /* فصول الحكاية، كلها بمنحنيات ناعمة الطرفين */
    /* الفصول مؤخَّرة عمداً: موضع الهبوط أسفل الشريط، وما يدخل الشاشة
       إلا عند p≈0.33 — لو نزل الطقم قبلها ما شاف الزائر السقوط أصلاً،
       يلقاه جالساً جاهزاً. فالنزول يصير والمسرح قدام العين. */
    var entryRaw = clamp01((p - 0.26) / 0.30);
    var entry = 1 - Math.pow(1 - entryRaw, 3);          // انزلاق يتباطأ قبل الاستقرار
    var wob = Math.sin(clamp01((p - 0.54) / 0.14) * Math.PI); // تموّجة الاستقرار
    var steamA = smooth((p - 0.56) / 0.08) * (1 - smooth((p - 0.74) / 0.12));
    var sinkRaw = clamp01((p - 0.70) / 0.26);
    var sink = smooth(sinkRaw);                          // غوص يبدأ وينتهي بهدوء
    var flood = smooth(clamp01((p - 0.66) / 0.30));      // البحر الكريمي
    var groupA = 1 - smooth((sinkRaw - 0.45) / 0.5);     // الذوبان في الصفحة اللي تحت

    var dpr = cv.width / W;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    /* ليل بنفس تدرّج الهيرو */
    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, NIGHT);
    bg.addColorStop(1, NIGHT_2);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(OX, OY);
    ctx.scale(S, S);

    /* حركة الطقم: نزول معاً، تنفّس خفيف وهو مستقر، ثم غوص بذوبان */
    var yEnter = -(VH + 260) * (1 - entry);
    var bob = Math.sin(t * 0.8) * 2.4 * entry * (1 - sink);
    var gy = yEnter + bob + wob * 4 + sink * VH * 0.92;
    var tilt = -0.07 * (1 - entry) - 0.025 * sink;
    var gscale = 1 - 0.05 * sink;                        // يبتعد وهو يغوص

    /* بركة ضوء أمبر عند موضع الهبوط، تنبض نبضة عند الاستقرار */
    var poolA = (0.13 * entry + 0.05 * wob) * (1 - sink);
    if (poolA > 0.004) {
      var pool = ctx.createRadialGradient(CX, SY + 14, 8, CX, SY + 14, 170);
      pool.addColorStop(0, mix(AMBER, NIGHT, 0.25, poolA));
      pool.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = pool;
      ell(CX, SY + 14, 170, 44);
      ctx.fill();
      ctx.fillStyle = "rgba(12,7,3," + 0.35 * entry * (1 - sink) + ")";
      ell(CX, SY + 12, 104, 20);
      ctx.fill();
    }

    /* الطقم كله كتلة واحدة: الصحن والكوب فوقه */
    ctx.save();
    ctx.globalAlpha = Math.max(0, groupA);
    ctx.translate(CX, SY + gy);
    ctx.rotate(tilt);
    ctx.scale(gscale, gscale);
    drawSaucer();
    ctx.save();
    ctx.translate(0, FOOT_Y - SY);
    drawCup(1 + 0.018 * wob, 1 - 0.02 * wob, 0.04 * wob);
    ctx.restore();
    ctx.restore();
    ctx.globalAlpha = 1;

    /* خيطا بخار يتنفسان فوق الكوب المستقر */
    if (steamA > 0.01) {
      ctx.strokeStyle = mix(SAND, CREAM, 0.5);
      ctx.lineCap = "round";
      [{ x: CX - 12, ph: 0 }, { x: CX + 14, ph: 2.1 }].forEach(function (sm) {
        var baseY = SY - 118 + bob;
        var sway = function (k) { return Math.sin(t * 0.9 + sm.ph + k * 2.2) * (5 + k * 7); };
        [[5, 0.10], [2.4, 0.22]].forEach(function (pass) {
          ctx.globalAlpha = steamA * pass[1];
          ctx.lineWidth = pass[0];
          ctx.beginPath();
          ctx.moveTo(sm.x, baseY);
          ctx.bezierCurveTo(sm.x + sway(0.3), baseY - 26, sm.x + sway(0.7), baseY - 48, sm.x + sway(1) * 0.7, baseY - 74);
          ctx.stroke();
        });
      });
      ctx.globalAlpha = 1;
    }

    ctx.restore(); // تحجيم المشهد

    /* خامة الطباعة فوق المشهد الليلي، وتحت البحر الكريمي */
    if (grain) ctx.drawImage(grain, 0, 0);

    /* البحر الكريمي: يطلع من تحت بموجة تهدأ. قاعه كريم من أول لحظة
       لأنه يلامس حد قسم المحصول طول الوقت، وقمته وحدها عسلية تصفى. */
    var topY = 0;
    if (flood > 0.001) {
      topY = H * (1 - flood) - 60 * flood + 40 * (1 - flood);
      var amp = 15 * (1 - smooth(flood * 1.15));
      var toCream = smooth((flood - 0.3) / 0.55);
      var fillCol = ctx.createLinearGradient(0, topY, 0, H);
      fillCol.addColorStop(0, mix("#EAC98F", CREAM, toCream));
      fillCol.addColorStop(0.45, mix("#F2DCB2", CREAM, clamp01(0.4 + toCream)));
      fillCol.addColorStop(1, CREAM);

      ctx.beginPath();
      ctx.moveTo(-4, H + 4);
      ctx.lineTo(-4, topY);
      for (var x = 0; x <= W + 20; x += W / 22) {
        ctx.lineTo(x, topY + Math.sin(x / (W / 6.5) + t * 0.7) * amp);
      }
      ctx.lineTo(W + 4, H + 4);
      ctx.closePath();
      ctx.fillStyle = fillCol;
      ctx.fill();
      ctx.strokeStyle = mix(AMBER_DEEP, CREAM, toCream, 0.5 * (1 - smooth(flood * 1.2)));
      ctx.lineWidth = 3;
      ctx.stroke();

      /* دوائر تتسع على السطح وين غاص الطقم: أثر الاندماج بالصفحة */
      if (sinkRaw > 0.06 && groupA > 0.01) {
        var rcx = OX + CX * S;
        var surfY = topY + Math.sin(rcx / (W / 6.5) + t * 0.7) * amp;
        ctx.strokeStyle = mix(AMBER_DEEP, CREAM, 0.45);
        for (var i = 0; i < 3; i++) {
          var rp = clamp01(sinkRaw * 1.5 - i * 0.22);
          if (rp <= 0.01 || rp >= 1) continue;
          ctx.globalAlpha = 0.32 * (1 - rp) * flood;
          ctx.lineWidth = 2.4 - i * 0.5;
          ell(rcx, surfY, (36 + rp * 150) * S, (9 + rp * 36) * S);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    }
  }

  /* ─── التشغيل ─── */
  function progress() {
    var r = band.getBoundingClientRect();
    var vh = window.innerHeight || 1;
    return clamp01((vh - r.top) / (vh + r.height));
  }

  /* مع prefers-reduced-motion نثبت على الطقم مستقراً وبخاره طالع */
  var STILL = 0.62;

  /* التمهيد المخمَّد: سر النعومة. التمرير يجي نطّات، والرسم يلحقه
     انسياباً كل إطار بدل ما يقفز معه، فتطلع الحركة سينمائية */
  var pd = null;
  var running = false;
  function frame(ms) {
    if (!running) return;
    var target = progress();
    if (pd === null) pd = target;
    pd += (target - pd) * 0.085;
    draw(pd, ms);
    window.requestAnimationFrame(frame);
  }
  function renderOnce() {
    if (!running) draw(reduced ? STILL : lastP, 0);
  }
  function onResize() { layout(); draw(reduced ? STILL : progress(), 0); }

  band.classList.add("on");
  layout();
  draw(reduced ? STILL : progress(), 0);
  window.addEventListener("resize", onResize);

  if (!reduced && "IntersectionObserver" in window) {
    new IntersectionObserver(
      function (entries) {
        if (entries[0].isIntersecting) {
          if (!running) {
            pd = progress(); // لقطة مباشرة، لا انزلاقة من موضع قديم
            running = true;
            window.requestAnimationFrame(frame);
          }
        } else {
          running = false;
        }
      },
      { rootMargin: "150px" }
    ).observe(band);
  }
})();
