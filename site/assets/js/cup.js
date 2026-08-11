/* ============================================================
   جَازن: «الفنجان يهبط» — بين الهيرو وقسم المحصول.

   رسمة مسطّحة بأسلوب إيلستريشن، مرجعها صورهم لا كوب عام:
   ديمي-تاس أبيض بجسم مدوّر ويد صغيرة وعليه وردماركهم، على صحن
   بخصرة أمبر (تحية لصحونهم الفنية)، والكريما ذهبية مثل شوتهم.

   الحكاية بالتمرير، بإيقاع فلم: الصحن والكوب مرميان من فوق معاً
   كقطعتين منفصلتين تسقطان بجاذبية — الصحن يلقف الطاولة أولاً،
   والكوب يلحقه ويستقر فوقه بتموّجة، ويتصاعد البخار. ثم مع مواصلة
   النزول تتفكك الرسمة نفسها إلى قطعها: اليد تسحب لجهة، الجسم
   لجهة، الصحن لجهة، وقرص الكريما ينفصل وينسكب خيوطاً ذهبية
   لتحت — ومن الانسكاب يرتفع البحر الكريمي اللي يبتلع القطع
   الذايبة ويصير هو كريم قسم «القائمة تبدأ من المحصول».

   النعومة من التمهيد المخمَّد: الرسم لا يقفز مع نطّات السكرول بل
   يلحقها انسياباً كل إطار، فتطلع الحركة سينمائية مهما كان جهاز
   الزائر. canvas 2D وحده، بلا مكتبات، والرسم يشتغل فقط والشريط
   على الشاشة.
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
  var wmSkip = false;
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

  /* جزيئات الذوبان: تنشأ من القطع المتفككة وتهبط للبحر، فتربط
     التفكك بالاندماج حرفياً — القطع تتحلل حبيبات تسقط في الكريم */
  var PARTS = [];
  (function () {
    var seed = 8140777;
    var rnd = function () { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    for (var i = 0; i < 42; i++) {
      PARTS.push({
        src: i % 3,                       // 0 جسم، 1 كريما، 2 صحن
        lx: (rnd() - 0.5) * 96,
        ly: -20 - rnd() * 70,
        s: 1.1 + rnd() * 2.1,
        d: rnd() * 0.34,
        ph: rnd() * 6.28,
      });
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

    /* اللوقو على الجسم، مثل أكوابهم — يُتخطى بعد ما ينفصل ويطفو */
    if (wmReady && !wmSkip) {
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

  function drawSaucerBase() {
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
  }

  /* خصرة الأمبر قطعة لحالها: وقت التفكك تنشال عن الصحن وتطفو
     حلقة ذهبية معلقة قبل ما تذوب */
  function drawSaucerRing() {
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

    /* ── فصول الحكاية ── */
    var sRaw = clamp01((p - 0.14) / 0.22);
    var sFall = sRaw * sRaw;
    var sDip = Math.sin(clamp01((p - 0.36) / 0.10) * Math.PI);
    var cRaw = clamp01((p - 0.14) / 0.32);
    var cFall = cRaw * cRaw;
    var land = clamp01((p - 0.46) / 0.12);
    var bounce = Math.sin(Math.min(1, land) * Math.PI);
    var steamA = smooth((p - 0.51) / 0.07) * (1 - smooth((p - 0.60) / 0.08));
    var dis = smooth(clamp01((p - 0.60) / 0.22));
    var flood = smooth(clamp01((p - 0.64) / 0.22));
    var toCream = smooth((flood - 0.3) / 0.55);
    var pour = 0;
    var streamLandX = CX;
    var wmRipple = null;

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
    var poolA = (0.11 * smooth(sRaw) + 0.05 * bounce) * (1 - dis);
    if (poolA > 0.004) {
      var pool = ctx.createRadialGradient(CX, SY + 14, 8, CX, SY + 14, 170);
      pool.addColorStop(0, mix(AMBER, NIGHT, 0.25, poolA));
      pool.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = pool;
      ell(CX, SY + 14, 170, 44);
      ctx.fill();
      ctx.fillStyle = "rgba(12,7,3," + 0.35 * sFall * (1 - dis) + ")";
      ell(CX, SY + 12, 104, 20);
      ctx.fill();
    }

    /* ── الصحن: يسقط لوحاله، ووقت التفكك ينسحب وتنشال عنه خصرته ── */
    var sP = stag(dis, 0.05, 0.6);
    var sX = -16 * (1 - sRaw) - 88 * sP + Math.sin(t * 0.6) * 3 * sP;
    var sYv = -(VH * 0.72 + 80) * (1 - sFall) + sDip * 3 + 58 * sP;
    var sRot = -0.06 * (1 - sRaw) - 0.18 * sP;
    var sA = 1 - stag(sP, 0.72, 0.28);
    if (sA > 0.004) {
      ctx.save();
      ctx.globalAlpha = sA;
      ctx.translate(CX + sX, SY + sYv);
      ctx.rotate(sRot);
      drawSaucerBase();
      ctx.restore();
    }
    /* الخصرة تطفو حلقة ذهبية لحالها */
    var rP = stag(dis, 0.16, 0.55);
    var rA = (sA > 0 ? 1 : 1) * (1 - stag(rP, 0.68, 0.32));
    if (rA > 0.004 && dis > 0.001) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, rA);
      ctx.translate(CX + sX * (1 - rP) + 30 * rP, SY + sYv * (1 - rP * 0.2) - 105 * rP);
      ctx.rotate(sRot + 0.5 * rP + Math.sin(t * 0.9) * 0.05 * rP);
      ctx.scale(1 + 0.2 * rP, 1 + 0.2 * rP);
      drawSaucerRing();
      ctx.restore();
    } else if (dis <= 0.001 && sA > 0.004) {
      ctx.save();
      ctx.globalAlpha = sA;
      ctx.translate(CX + sX, SY + sYv);
      ctx.rotate(sRot);
      drawSaucerRing();
      ctx.restore();
    }

    /* ── الكوب: مرمي وراه، يستقر، ثم يميل ويصب ويتحلل ── */
    var bodyDx = 0, bodyDy = 0, bodyRot = 0, cX = 0, cY = 0, cTilt = 0;
    if (cRaw > 0.001) {
      cX = 26 * (1 - cRaw);
      cY = -(VH * 0.66 + 60) * (1 - cFall) - bounce * 6 + bob;
      cTilt = -0.14 * (1 - cRaw) + 0.04 * bounce;

      var bodyP = stag(dis, 0.08, 0.6);
      bodyDx = -52 * bodyP + Math.sin(t * 0.7) * 3 * bodyP;
      bodyDy = -46 * bodyP;
      bodyRot = -0.55 * bodyP;
      var bodyA = 1 - stag(bodyP, 0.78, 0.22);
      pour = stag(bodyP, 0.28, 0.55);

      var handleP = stag(dis, 0.0, 0.5);
      var handleA = 1 - stag(handleP, 0.6, 0.3);

      /* اللوقو ينفصل عن الجسم آخر القطع: يطفو نازلاً كورقة، آخر
         ما يلمس البحر — توقيع الختام */
      var wmP = stag(dis, 0.5, 0.5);
      var wmDetached = wmP > 0.001;

      /* خيوط الصب: من شفة الفوهة المنخفضة إلى سطح البحر */
      if (pour > 0.01) {
        var br = cTilt + bodyRot;
        var ox = CX + cX + bodyDx, oy = FOOT_Y + cY + bodyDy;
        var pcx = ox + (-54) * Math.cos(br) - (-88) * Math.sin(br);
        var pcy = oy + (-54) * Math.sin(br) + (-88) * Math.cos(br);
        streamLandX = pcx + 4;
        var reach = Math.max(0, (Math.min(seaTopS + 14, VH + 80) - pcy)) * Math.min(1, pour * 1.3);
        ctx.lineCap = "round";
        var pourA = 0.92 * pour * Math.min(1, bodyA * 1.5);
        [[-3, 9, 0], [7, 6, 2.2], [14, 3.4, 4.1]].forEach(function (st) {
          var sway = Math.sin(t * 0.8 + st[2]) * 5;
          ctx.globalAlpha = pourA;
          ctx.strokeStyle = "#3B2110";
          ctx.lineWidth = st[1];
          ctx.beginPath();
          ctx.moveTo(pcx + st[0], pcy + 4);
          ctx.quadraticCurveTo(pcx + st[0] + sway, pcy + reach * 0.55, pcx + st[0] + sway * 0.4, pcy + reach);
          ctx.stroke();
        });
        ctx.globalAlpha = pourA * 0.55;
        ctx.strokeStyle = mix(AMBER, "#F7DE9B", 0.3);
        ctx.lineWidth = 1.8;
        var hsway = Math.sin(t * 0.8) * 5;
        ctx.beginPath();
        ctx.moveTo(pcx - 7, pcy + 6);
        ctx.quadraticCurveTo(pcx - 7 + hsway, pcy + reach * 0.55, pcx - 7 + hsway * 0.4, pcy + reach);
        ctx.stroke();

        /* رذاذ الاصطدام: قطرات غامقة تنط من موضع سقوط الصبة */
        if (flood > 0.02 && flood < 0.93) {
          ctx.fillStyle = "#3B2110";
          for (var dr = 0; dr < 3; dr++) {
            var dp = (t * 0.9 + dr * 0.33) % 1;
            ctx.globalAlpha = pourA * 0.7 * (1 - dp);
            var dxx = streamLandX + (dr - 1) * 14 * dp;
            var dyy = seaTopS - Math.sin(dp * Math.PI) * (16 + dr * 5);
            ell(dxx, dyy, 2.4 - dr * 0.4, 2.8 - dr * 0.4);
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
      }

      /* الجسم والكريما داخله */
      if (bodyA > 0.004) {
        ctx.save();
        ctx.globalAlpha = bodyA;
        ctx.translate(CX + cX + bodyDx, FOOT_Y + cY + bodyDy);
        ctx.rotate(cTilt + bodyRot);
        wmSkip = wmDetached;
        drawCupBody();
        wmSkip = false;
        ctx.save();
        ctx.translate(-9 * bodyP, 2 * bodyP);
        drawCrema(1);
        ctx.restore();
        ctx.restore();
      }

      /* اليد */
      if (handleA > 0.004) {
        ctx.save();
        ctx.globalAlpha = handleA;
        ctx.translate(CX + cX + 98 * handleP, FOOT_Y + cY - 74 * handleP + Math.sin(t * 1.1) * 4 * handleP);
        ctx.rotate(cTilt + 0.75 * handleP);
        drawHandle();
        ctx.restore();
      }

      /* اللوقو الطافي */
      if (wmDetached && wmReady) {
        var br2 = cTilt + bodyRot;
        var wx0 = CX + cX + bodyDx + (0) * Math.cos(br2) - (-52) * Math.sin(br2);
        var wy0 = FOOT_Y + cY + bodyDy + (0) * Math.sin(br2) + (-52) * Math.cos(br2);
        var wx = lerp(wx0, CX + 10, wmP) + Math.sin(t * 1.2 + wmP * 5) * 9 * (1 - wmP);
        var wy = lerp(wy0, seaTopS - 4, wmP * wmP);
        var wA = 1 - stag(wmP, 0.86, 0.14);
        var wS = 1 - 0.15 * wmP;
        if (wA > 0.004) {
          ctx.save();
          ctx.globalAlpha = wA * 0.95;
          ctx.translate(wx, wy);
          ctx.rotate(Math.sin(t * 0.9 + 1) * 0.09 + 0.08 * (1 - wmP));
          ctx.scale(wS, wS);
          var ww = 40, wh = (ww * wm.height) / wm.width;
          ctx.drawImage(wm, -ww / 2, -wh / 2, ww, wh);
          ctx.restore();
        }
        if (wmP > 0.8) wmRipple = { x: OX + wx * S, p: stag(wmP, 0.8, 0.2) };
      }

      /* جزيئات الذوبان: تتقشر من القطع وتهبط لسطح البحر */
      if (dis > 0.18) {
        for (var i = 0; i < PARTS.length; i++) {
          var pr = PARTS[i];
          var pp = stag(dis, 0.2 + pr.d, 0.5);
          if (pp <= 0.004 || pp >= 0.996) continue;
          var bx, by, col;
          if (pr.src === 0) { bx = CX + cX + bodyDx; by = FOOT_Y + cY + bodyDy - 40; col = CREAM; }
          else if (pr.src === 1) { bx = CX + cX + bodyDx; by = FOOT_Y + cY + bodyDy - 84; col = mix(AMBER_DEEP, AMBER, 0.4); }
          else { bx = CX + sX; by = SY + sYv; col = CREAM_2; }
          var px = bx + pr.lx + Math.sin(t * 0.8 + pr.ph) * 7 * pp;
          var py = by + pr.ly * (1 - pp * 0.3) + (Math.min(seaTopS, VH + 40) - (by + pr.ly)) * pp * pp;
          ctx.globalAlpha = Math.sin(pp * Math.PI) * 0.8;
          ctx.fillStyle = col;
          var ps = pr.s * (1 - 0.35 * pp);
          ell(px, py, ps, ps * 0.8);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
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
      var settle = smooth(flood * 1.15);
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
      var amp = 15 * (1 - settle);
      var bumpH = 13 * pour * (1 - settle);
      ctx.beginPath();
      ctx.moveTo(-4, H + 4);
      ctx.lineTo(-4, seaTopW);
      for (var x = 0; x <= W + 20; x += W / 26) {
        var dxi = x - ix;
        var bump = bumpH * Math.exp(-(dxi * dxi) / (2 * 46 * 46));
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

      /* دائرة هبوط اللوقو: الوداعية */
      if (wmRipple) {
        var surfY2 = seaTopW + Math.sin(wmRipple.x / (W / 6.5) + t * 0.7) * amp;
        ctx.strokeStyle = mix(AMBER_DEEP, CREAM, 0.35);
        ctx.globalAlpha = 0.45 * (1 - wmRipple.p);
        ctx.lineWidth = 2;
        ell(wmRipple.x, surfY2, (18 + wmRipple.p * 90) * S, (5 + wmRipple.p * 22) * S);
        ctx.stroke();
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
  var STILL = 0.54;

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
