/* ============================================================
   جَازن: «الفنجان يهبط» — بين الهيرو وقسم المحصول.

   رسمة مسطّحة بأسلوب إيلستريشن، مرجعها صورهم لا كوب عام:
   ديمي-تاس أبيض بجسم مدوّر ويد صغيرة وعليه وردماركهم، على صحن
   بخصرة أمبر (تحية لصحونهم الفنية)، والكريما ذهبية مثل شوتهم.

   الحكاية بالتمرير، بإيقاع فلم: الصحن والكوب مرميان من فوق معاً
   كقطعتين تسقطان بجاذبية — الصحن يلقف الطاولة أولاً، والكوب
   يلحقه ويستقر فوقه، ويتصاعد البخار. ثم مع مواصلة النزول تتحلل
   الرسمة، يميل الكوب وتنسكب منه القهوة الغامقة، ومن
   الصبّة يرتفع البحر الكريمي ويبتلع القطع — اللي يصير هو كريم قسم
   «القائمة تبدأ من المحصول». الوردمارك يبقى ثابتاً على الكوب
   ويختفي معه، واليد جزء من الكوب والخصرة جزء من الصحن — قطعتان
   فقط لا خمس، والقطع لا تذوب إلا في آخر لحظة قبل ما يبتلعها.

   النزول نفسه مشغول بأربعة تأثيرات مشتقة من فيزيائه لا مضافة
   زخرفةً: ظل ترقّب يضيق ويغمق كل ما قربت القطعة، أثر حركة تقوده
   السرعة اللحظية، مقياس منظور يكبر مع الاقتراب، ولمعة تكنس
   الخزف مرة وهو يعبر ضوء اللافتة — وومضة حلقية عند اللمس.

   والتوقيت مربوط بهندسة الصفحة لا بنسبة واحدة: السقوط والاستقرار
   موقّتان على ارتفاع الشريط فينتهيان قبل ظهور رأس قسم المحصول،
   والتفكك والبحر موقّتان على ارتفاع الشاشة فيبدآن من تلك اللحظة
   بالضبط — فالتحلل هو نفسه فعل تسليم الصفحة للصفحة اللي بعدها.

   النعومة من التمهيد المخمَّد: الرسم لا يقفز مع نطّات السكرول بل
   يلحقها انسياباً كل إطار. canvas 2D وحده، بلا مكتبات، والرسم
   يشتغل فقط والشريط على الشاشة.
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

  /* تقدم متدرج: كل قطعة لها نافذتها داخل التفكك، فيقرأ تحللاً
     متسلسلاً لا انزلاقة واحدة متزامنة */
  var stag = function (x, s, d) { return smooth(clamp01((x - s) / d)); };

  var ell = function (cx, cy, rx, ry) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  };

  /* ─── القياس وخامة الطباعة ─── */
  var W = 0, H = 0, S = 1, OX = 0, OY = 0, VP = 1;
  var grain = null;

  function layout() {
    var r = band.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    VP = Math.max(1, window.innerHeight || 1);
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

  /* اليد والجسم والكريما قطع مستقلة: ترسم معاً وهي طقم واحد،
     وكل وحدة بتحويلها الخاص وقت التفكك */

  function drawHandle() {
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
  }

  function drawCupBody() {
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
    ctx.fillStyle = mix(CREAM_2, "#B39A80", 0.55);
    ell(0, 0, 30, 7);
    ctx.fill();
    ctx.restore();

    /* اللوقو على الجسم، مثل أكوابهم — ثابت عليه ويختفي معه */
    if (wmReady) {
      var w = 40, h = (w * wm.height) / wm.width;
      ctx.globalAlpha *= 0.92;
      ctx.drawImage(wm, -w / 2, -66, w, h);
      ctx.globalAlpha /= 0.92;
    }

    /* جوف الفوهة: يبقى مع الجسم، فإذا انفصل قرص الكريما بان الكوب فاضياً */
    ctx.fillStyle = mix(NIGHT, "#000", 0.35);
    ell(0, -84, 56, 14.6);
    ctx.fill();
  }

  function drawCrema(cw) {
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
    var baseA = ctx.globalAlpha;
    for (var i = 0; i < SPECKS.length; i++) {
      var sp = SPECKS[i];
      ctx.globalAlpha = baseA * sp.o;
      ctx.fillStyle = "#F2D8A0";
      ell(Math.cos(sp.a) * sp.r * 48 * cw, -83 + Math.sin(sp.a) * sp.r * 11.6, sp.s, sp.s * 0.7);
      ctx.fill();
    }
    ctx.globalAlpha = baseA;
  }

  function drawSaucer() {
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
    ctx.fillStyle = CREAM_2;
    ell(0, -2, 58, 13.5);
    ctx.fill();
    ctx.fillStyle = mix(CREAM_2, "#C9AE93", 0.4);
    ell(2, -1, 44, 10);
    ctx.fill();
    /* خصرة الأمبر جزء من الصحن، ما تنفصل عنه */
    ctx.strokeStyle = mix(AMBER_DEEP, AMBER, 0.35, 0.8);
    ctx.lineWidth = 2.6;
    ell(0, -1, 96, 21.5);
    ctx.stroke();
  }

  /* ─── الرسم الكامل عند نسبة p ─── */
  var lastP = 0;

  function draw(p, tms) {
    lastP = p;
    var t = (tms || 0) / 1000;

    /* ── مرجعان هندسيان بدل نسبة واحدة ──
       نسبة واحدة تعني توقيتاً يزيح مع كل ارتفاع شاشة: على الجوال كان
       رأس قسم المحصول يطلع والطقم ما استقر، وعلى الديسكتوب يستقر
       ويقعد ينتظر. فنقيس بمرجعين مربوطين بهندسة الصفحة نفسها:

         apr = المسافة الممرورة ÷ ارتفاع الشريط
               → 1 بالضبط اللحظة اللي يظهر فيها رأس القسم التالي
                 عند أسفل الشاشة (أي r.bottom = ارتفاع الشاشة)
         hnd = المتبقّي ÷ ارتفاع الشاشة
               → 0 عند تلك اللحظة، و1 لما يغادر الشريط الشاشة

       فالسقوط والاستقرار والبخار كلها على apr وتنتهي قبل 1، والتفكك
       والصبّ والبحر كلها على hnd وتبدأ من صفره — فيصير التفكك حرفياً
       هو لحظة تسليم الصفحة للصفحة اللي بعدها، لا حدثاً يصادفها. */
    var run = p * (VP + H);
    var apr = clamp01(run / H);
    var hnd = clamp01((run - H) / VP);

    var sRaw = clamp01((apr - 0.06) / 0.46);
    var sFall = sRaw * sRaw;
    var sDip = Math.sin(clamp01((apr - 0.52) / 0.16) * Math.PI);
    var cRaw = clamp01((apr - 0.06) / 0.62);
    var cFall = cRaw * cRaw;
    var land = clamp01((apr - 0.68) / 0.14);
    var bounce = Math.sin(Math.min(1, land) * Math.PI);
    var steamA = smooth((apr - 0.76) / 0.11) * (1 - smooth((hnd - 0.02) / 0.10));
    var dis = smooth(clamp01(hnd / 0.46));
    var flood = smooth(clamp01((hnd - 0.225) / 0.26));
    var toCream = smooth((flood - 0.3) / 0.55);
    var settleF = smooth(flood * 1.15);
    var ampF = 15 * (1 - settleF);
    var pour = 0;
    var streamLandX = CX;

    var dpr = cv.width / W;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    /* ليل بنفس تدرّج الهيرو */
    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, NIGHT);
    bg.addColorStop(1, NIGHT_2);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    /* سطح البحر محسوب قبل المشهد: الجزيئات والقطع تهبط إليه */
    var seaTopW = H + 60;
    if (flood > 0.001) seaTopW = H * (1 - flood) - 60 * flood + 40 * (1 - flood);
    var seaTopS = (seaTopW - OY) / S; // بنفس إحداثيات المشهد

    ctx.save();
    ctx.translate(OX, OY);
    ctx.scale(S, S);

    var bob = Math.sin(t * 0.8) * 2.2 * land * (1 - dis);

    /* بركة ضوء أمبر تنتظر تحت موضع الهبوط، وتنطفي مع التفكك */
    /* بركة الضوء وظل الترقّب: الظل يبدأ واسعاً باهتاً والطقم بعيد،
       ويضيق ويغمق كل ما قرب — مبدأ الترقّب في الرسوم المتحركة،
       يخلي العين تعرف وين بينزل قبل ما ينزل. */
    var near = Math.max(smooth(sRaw), smooth(cRaw));
    var poolA = (0.09 + 0.10 * near + 0.10 * bounce) * (1 - dis);
    if (poolA > 0.004) {
      var pool = ctx.createRadialGradient(CX, SY + 14, 8, CX, SY + 14, 190 - 40 * near);
      pool.addColorStop(0, mix(AMBER, NIGHT, 0.25, poolA));
      pool.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = pool;
      ell(CX, SY + 14, 190 - 40 * near, 50 - 10 * near);
      ctx.fill();
      /* الظل نفسه: من 170×34 باهت إلى 100×19 غامق */
      ctx.fillStyle = "rgba(12,7,3," + (0.10 + 0.30 * near) * (1 - dis) + ")";
      ell(CX, SY + 12, lerp(170, 100, near), lerp(34, 19, near));
      ctx.fill();
    }

    /* ومضة اللمس: حلقة ضوء تتسع لحظة ملامسة الصحن الطاولة */
    if (bounce > 0.01 && dis < 0.1) {
      var ringP = clamp01(land * 1.6);
      ctx.globalAlpha = 0.32 * (1 - ringP) * (1 - dis);
      ctx.strokeStyle = mix(AMBER, CREAM, 0.35);
      ctx.lineWidth = 2.4;
      ell(CX, SY + 10, 90 + ringP * 120, 21 + ringP * 28);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    /* ── الصحن بخصرته: قطعة واحدة، يسقط لوحاله ووقت التفكك ينسحب ── */
    var sP = stag(dis, 0.05, 0.85);
    var sX = -16 * (1 - sRaw) - 88 * sP + Math.sin(t * 0.6) * 3 * sP;
    var sYv = -(VH * 0.72 + 80) * (1 - sFall) + sDip * 3 + 58 * sP;
    var sRot = -0.06 * (1 - sRaw) - 0.18 * sP;
    /* دورة حياة القطع موسَّعة لتتقاطع مع ارتفاع البحر: كانت تختفي
       والبحر لسه في ~13% من طريقه، فتبخّرت في الهوا. الحين تعيش
       لين يوصل 60–77% فتُبتلع فعلاً بدل ما تتلاشى قبله. */
    var sA = 1 - stag(sP, 0.86, 0.14);
    /* سرعة السقوط اللحظية (مشتقة التسارع التربيعي) تقود أثر الحركة:
       أشباح باهتة فوق القطعة على مسارها، تختفي لحظة الاستقرار.
       ومقياس المنظور: تبدأ أصغر وهي بعيدة وتكبر وهي قادمة. */
    var sVel = sRaw < 1 ? 2 * sRaw * (1 - sRaw * 0.15) : 0;
    var sScale = lerp(0.88, 1, smooth(sRaw));
    if (sA > 0.004) {
      if (sVel > 0.12 && sRaw < 0.99) {
        for (var gh = 3; gh >= 1; gh--) {
          var gq = Math.max(0, sRaw - gh * 0.022);
          var gy = -(VH * 0.72 + 80) * (1 - gq * gq);
          ctx.save();
          ctx.globalAlpha = sA * sVel * (0.09 / (gh * gh));
          ctx.translate(CX + sX, SY + gy);
          ctx.rotate(sRot);
          ctx.scale(lerp(0.88, 1, smooth(gq)), lerp(0.88, 1, smooth(gq)));
          drawSaucer();
          ctx.restore();
        }
      }
      ctx.save();
      ctx.globalAlpha = sA;
      ctx.translate(CX + sX, SY + sYv);
      ctx.rotate(sRot);
      ctx.scale(sScale, sScale);
      drawSaucer();
      ctx.restore();
    }

    /* ── الكوب: مرمي وراه، يستقر، ثم يميل ويصب ويتحلل ── */
    var bodyDx = 0, bodyDy = 0, bodyRot = 0, cX = 0, cY = 0, cTilt = 0;
    if (cRaw > 0.001) {
      cX = 26 * (1 - cRaw);
      cY = -(VH * 0.66 + 60) * (1 - cFall) - bounce * 6 + bob;
      cTilt = -0.14 * (1 - cRaw) + 0.04 * bounce;

      var bodyP = stag(dis, 0.08, 0.88);
      bodyDx = -52 * bodyP + Math.sin(t * 0.7) * 3 * bodyP;
      bodyDy = -46 * bodyP;
      bodyRot = -0.55 * bodyP;
      var bodyA = 1 - stag(bodyP, 0.88, 0.12);
      /* الصبّة تبدأ عند hnd≈0.17، قبل ارتفاع البحر (0.225) بجزء من
         الثانية عند تمرير عادي — البحر يطلع من الصبّة فلا يصح
         يسبقها، والفجوة ضيقة عمداً وإلا صبّت الخيوط في الفراغ. */
      pour = stag(bodyP, 0.16, 0.5);


      /* خيوط الصب: أعرض عند الشفة وأرفع وهي تتسارع (عيّنات متدرجة
         العرض على المسار)، وتنتهي عند سطح الموجة الفعلي لحظتها لا
         عند عمق ثابت — فالصبّة تلمس الموج فعلاً */
      if (pour > 0.01) {
        var br = cTilt + bodyRot;
        var ox = CX + cX + bodyDx, oy = FOOT_Y + cY + bodyDy;
        var pcx = ox + (-54) * Math.cos(br) - (-88) * Math.sin(br);
        var pcy = oy + (-54) * Math.sin(br) + (-88) * Math.cos(br);
        streamLandX = pcx + 4;
        var ixw = OX + streamLandX * S;
        var surfW = seaTopW + Math.sin(ixw / (W / 6.5) + t * 0.7) * ampF;
        var endY = Math.min((surfW - OY) / S + 4, VH + 80);
        var reachF = Math.min(1, pour * 1.3);
        var pourA = 0.92 * pour * Math.min(1, bodyA * 1.5);
        ctx.lineCap = "round";

        /* انتفاخة تعلّق السائل بالشفة */
        ctx.globalAlpha = pourA;
        ctx.fillStyle = "#3B2110";
        ell(pcx + 2, pcy + 3, 7, 4);
        ctx.fill();

        var stream = function (offX, w0, ph) {
          var x1 = pcx + offX, y1 = pcy + 4;
          var y2 = lerp(y1, endY, reachF);
          var sway = Math.sin(t * 0.8 + ph) * 5;
          var cxq = x1 + sway, cyq = lerp(y1, y2, 0.55);
          var x2 = x1 + sway * 0.4;
          var px0 = x1, py0 = y1;
          for (var si = 1; si <= 8; si++) {
            var tt = si / 8, it = 1 - tt;
            var qx = it * it * x1 + 2 * it * tt * cxq + tt * tt * x2;
            var qy = it * it * y1 + 2 * it * tt * cyq + tt * tt * y2;
            ctx.lineWidth = lerp(w0, w0 * 0.55, tt);
            ctx.beginPath();
            ctx.moveTo(px0, py0);
            ctx.lineTo(qx, qy);
            ctx.stroke();
            px0 = qx; py0 = qy;
          }
        };
        ctx.strokeStyle = "#3B2110";
        stream(-3, 9.5, 0);
        stream(7, 6.5, 2.2);
        stream(14, 4, 4.1);

        /* شرطات ضوء تنزل مع التيار، فتحس السائل يجري لا واقفاً */
        ctx.globalAlpha = pourA * 0.5;
        ctx.strokeStyle = mix(AMBER, "#F7DE9B", 0.3);
        ctx.lineWidth = 1.8;
        ctx.setLineDash([11, 24]);
        ctx.lineDashOffset = -((t * 170) % 35);
        var hsway = Math.sin(t * 0.8) * 5;
        ctx.beginPath();
        ctx.moveTo(pcx - 6, pcy + 6);
        ctx.quadraticCurveTo(pcx - 6 + hsway, lerp(pcy, endY, 0.55), pcx - 6 + hsway * 0.4, lerp(pcy + 4, endY, reachF));
        ctx.stroke();
        ctx.setLineDash([]);

        /* رذاذ الاصطدام، من سطح الموجة نفسه */
        if (flood > 0.02 && flood < 0.93 && reachF > 0.9) {
          ctx.fillStyle = "#3B2110";
          for (var dr = 0; dr < 3; dr++) {
            var dp = (t * 0.9 + dr * 0.33) % 1;
            ctx.globalAlpha = pourA * 0.7 * (1 - dp);
            var dxx = streamLandX + (dr - 1) * 15 * dp;
            var dyy = endY - 4 - Math.sin(dp * Math.PI) * (16 + dr * 5);
            ell(dxx, dyy, 2.4 - dr * 0.4, 2.8 - dr * 0.4);
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
      }

      /* الجسم والكريما داخله، ومعهما أثر الحركة ومقياس المنظور */
      var cVel = cRaw < 1 ? 2 * cRaw * (1 - cRaw * 0.15) : 0;
      var cScale = lerp(0.86, 1, smooth(cRaw));
      if (bodyA > 0.004) {
        if (cVel > 0.12 && cRaw < 0.99 && dis < 0.02) {
          for (var gc = 3; gc >= 1; gc--) {
            var cq = Math.max(0, cRaw - gc * 0.02);
            var cgy = -(VH * 0.66 + 60) * (1 - cq * cq);
            ctx.save();
            ctx.globalAlpha = cVel * (0.085 / (gc * gc));
            ctx.translate(CX + 26 * (1 - cq), FOOT_Y + cgy);
            ctx.rotate(-0.14 * (1 - cq));
            ctx.scale(lerp(0.86, 1, smooth(cq)), lerp(0.86, 1, smooth(cq)));
            /* بلا كريما في الأشباح: قرصها البرتقالي الفاتح كان يخلي
               كل شبح يُقرأ ككوب مستقل، فيطلع تكديس لا ضبابة حركة */
            drawCupBody();
            ctx.restore();
          }
        }
        ctx.save();
        ctx.globalAlpha = bodyA;
        ctx.translate(CX + cX + bodyDx, FOOT_Y + cY + bodyDy);
        ctx.rotate(cTilt + bodyRot);
        if (dis < 0.02) ctx.scale(cScale, cScale);
        /* اليد جزء من الكوب: تُرسم قبل جسمه فيغطي الجسمُ وصلتَها،
           وتتحرك معه بنفس التحويل فلا تنفصل وقت التفكك */
        drawHandle();
        drawCupBody();
        ctx.save();
        ctx.translate(-9 * bodyP, 2 * bodyP);
        drawCrema(1);
        ctx.restore();

        /* لمعة تكنس الخزف وهو يعبر ضوء اللافتة: شريط ضيق يمر على
           الجسم مرة واحدة أثناء النزول، مقصوص داخل حدود الكوب */
        var sweep = smooth((cRaw - 0.42) / 0.42);
        if (sweep > 0.01 && sweep < 0.99 && dis < 0.02) {
          ctx.save();
          cupBodyPath();
          ctx.clip();
          var syw = lerp(-118, 26, sweep);
          var lg = ctx.createLinearGradient(0, syw - 26, 0, syw + 26);
          lg.addColorStop(0, "rgba(255,240,205,0)");
          lg.addColorStop(0.5, mix(AMBER, "#FFF6DF", 0.6, 0.5 * Math.sin(sweep * Math.PI)));
          lg.addColorStop(1, "rgba(255,240,205,0)");
          ctx.fillStyle = lg;
          ctx.fillRect(-70, syw - 26, 140, 52);
          ctx.restore();
        }
        ctx.restore();
      }

    }

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

    /* ── البحر الكريمي بطبقتين ──
       طبقة خلفية أدفأ تتحرك بطور مختلف = عمق سائل، وطبقة أمامية
       قاعها كريم من أول لحظة (تلامس حد قسم المحصول طول الوقت)
       وقمتها عسلية تصفى. الموجة تنتفخ وين تضرب الصبّة السطح. */
    if (flood > 0.001) {
      var settle = settleF;
      var ix = OX + streamLandX * S;

      /* الطبقة الخلفية */
      var ampB = 20 * (1 - settle);
      var topB = seaTopW - 17;
      ctx.beginPath();
      ctx.moveTo(-4, H + 4);
      ctx.lineTo(-4, topB);
      for (var xb = 0; xb <= W + 20; xb += W / 22) {
        ctx.lineTo(xb, topB + Math.sin(xb / (W / 4.4) - t * 0.55 + 1.6) * ampB);
      }
      ctx.lineTo(W + 4, H + 4);
      ctx.closePath();
      ctx.fillStyle = mix("#D9AE6E", CREAM_2, toCream);
      ctx.fill();

      /* الطبقة الأمامية مع انتفاخة الاصطدام */
      var amp = ampF;
      var bumpH = 15 * pour * (1 - settle);
      ctx.beginPath();
      ctx.moveTo(-4, H + 4);
      ctx.lineTo(-4, seaTopW);
      for (var x = 0; x <= W + 20; x += W / 26) {
        var dxi = x - ix;
        var bump = bumpH * Math.exp(-(dxi * dxi) / (2 * 54 * 54));
        ctx.lineTo(x, seaTopW + Math.sin(x / (W / 6.5) + t * 0.7) * amp - bump);
      }
      ctx.lineTo(W + 4, H + 4);
      ctx.closePath();
      var fillCol = ctx.createLinearGradient(0, seaTopW - 20, 0, H);
      fillCol.addColorStop(0, mix("#EAC98F", CREAM, toCream));
      fillCol.addColorStop(0.45, mix("#F2DCB2", CREAM, clamp01(0.4 + toCream)));
      fillCol.addColorStop(1, CREAM);
      ctx.fillStyle = fillCol;
      ctx.fill();
      ctx.strokeStyle = mix(AMBER_DEEP, CREAM, toCream, 0.5 * (1 - settle));
      ctx.lineWidth = 3;
      ctx.stroke();

      /* زبد التقاء الصبّة بالقمة: عرام أبيض صغير يرقص عند الاصطدام */
      if (pour > 0.15) {
        for (var fo = 0; fo < 6; fo++) {
          var fx = ix + (fo - 2.5) * 9 + Math.sin(t * 1.3 + fo * 2.1) * 3;
          var dxf = fx - ix;
          var fBump = bumpH * Math.exp(-(dxf * dxf) / (2 * 54 * 54));
          var fy = seaTopW + Math.sin(fx / (W / 6.5) + t * 0.7) * amp - fBump - 2 - (fo % 2) * 3;
          ctx.globalAlpha = 0.55 * pour * (1 - settle);
          ctx.fillStyle = fo % 3 ? CREAM : mix(AMBER, CREAM, 0.5);
          ctx.beginPath();
          ctx.arc(fx, fy, 2 + (fo % 3), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      /* فقاعات كريما على السطح حول الاصطدام، تهدأ مع البحر */
      if (pour > 0.1) {
        for (var b = 0; b < 8; b++) {
          var bxp = ix + (b - 3.5) * 16 + Math.sin(t * 0.7 + b * 1.7) * 5;
          var byp = seaTopW + Math.sin(bxp / (W / 6.5) + t * 0.7) * amp + 4 + (b % 3) * 3;
          ctx.globalAlpha = 0.4 * pour * (1 - settle);
          ctx.fillStyle = b % 2 ? mix(AMBER_DEEP, AMBER, 0.5) : CREAM_2;
          ctx.beginPath();
          ctx.arc(bxp, byp, 1.6 + (b % 3), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      /* دوائر وين تضرب الصبّة السطح */
      if (pour > 0.1 && flood < 0.96) {
        var surfY = seaTopW + Math.sin(ix / (W / 6.5) + t * 0.7) * amp;
        ctx.strokeStyle = mix(AMBER_DEEP, CREAM, 0.45);
        for (var ri = 0; ri < 2; ri++) {
          var rpp = (t * 0.5 + ri * 0.5) % 1;
          ctx.globalAlpha = 0.3 * (1 - rpp) * pour * (1 - settle);
          ctx.lineWidth = 2.2 - ri * 0.5;
          ell(ix, surfY, (26 + rpp * 110) * S, (7 + rpp * 26) * S);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

    }
  }

  /* ─── التشغيل ─── */
  /* نقيس بـVP وH المخزّنين لا بالقيم الحيّة: draw يفكّ النسبة إلى
     المرجعين بنفسهما، ولو اختلف المقياسان (شريط عنوان الجوال يختفي
     وسط التمرير مثلاً) انزاح التوقيت عن هندسة الصفحة */
  function progress() {
    var r = band.getBoundingClientRect();
    return clamp01((VP - r.top) / (VP + H));
  }

  /* مع prefers-reduced-motion نثبت على الطقم مستقراً وبخاره طالع.
     نحسب النسبة اللي تعطي apr≈0.93 (بعد الاستقرار وقبل التفكك)
     بدل رقم ثابت، لأن المعنى صار مربوطاً بارتفاعي الشريط والشاشة */
  function still() { return (0.93 * H) / (VP + H); }

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
    if (!running) draw(reduced ? still() : lastP, 0);
  }
  function onResize() { layout(); draw(reduced ? still() : progress(), 0); }

  band.classList.add("on");
  layout();
  draw(reduced ? still() : progress(), 0);
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
