/* جَازن اسبريسو بار، لوحة تحكم المنيو (Supabase، مخطط jazn) */
(async function () {
  "use strict";

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  const CATS = {
    espresso: "الاسبريسو",
    freddo: "اسبريسو فريدو",
    v60: "القهوة المقطرة",
    milk: "مشروبات الحليب",
    sweets: "الحلويات",
    store: "متجر جَازن",
  };

  /* الدخول باسم مستخدم: يتحول داخلياً لإيميل ثابت (Supabase Auth مبني على الإيميل) */
  const USER_DOMAIN = "jazn.local";
  const toEmail = (u) => String(u).trim().toLowerCase() + "@" + USER_DOMAIN;
  const toUser = (e) => String(e).replace("@" + USER_DOMAIN, "");
  const validUser = (u) => /^[a-zA-Z0-9._-]{2,30}$/.test(String(u).trim());
  const cfg = window.JAZN_CONFIG || {};
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
    throw new Error("إعدادات قاعدة البيانات ناقصة في assets/js/config.js");
  }

  const views = { login: $("#loginView"), dash: $("#dashView") };
  const show = (name) => Object.entries(views).forEach(([k, el]) => (el.hidden = k !== name));

  /* ─── تنبيهات ─── */
  const toast = (msg, isError) => {
    const el = document.createElement("div");
    el.className = "adm-toast" + (isError ? " adm-toast--error" : "");
    el.textContent = msg;
    $("#toasts").appendChild(el);
    setTimeout(() => el.remove(), 3500);
  };

  /* ─── طبقة البيانات: كل الجداول في مخطط jazn ─── */
  let currentEmail = "";
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  const supabase = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, { db: { schema: "jazn" } });
  let db, staffDb;
  {
    const throwIf = (error) => { if (error) throw new Error(error.message); };
    db = {
      async list() {
        const { data, error } = await supabase.from("menu_items").select("*");
        throwIf(error);
        return data;
      },
      async insert(row) { throwIf((await supabase.from("menu_items").insert(row)).error); },
      async update(id, patch) { throwIf((await supabase.from("menu_items").update(patch).eq("id", id)).error); },
      async remove(id) { throwIf((await supabase.from("menu_items").delete().eq("id", id)).error); },
    };
    staffDb = {
      async list() {
        const { data, error } = await supabase.from("staff").select("email,name,is_owner").order("added_at");
        throwIf(error);
        return data || [];
      },
      async add(email, password, name) {
        const ins = await supabase.from("staff").insert({ email, name });
        if (ins.error) {
          throw new Error(/duplicate|23505/i.test((ins.error.code || "") + ins.error.message)
            ? "الموظف موجود مسبقاً" : ins.error.message);
        }
        /* إنشاء حساب الدخول بعميل مؤقت لا يمس جلسة المدير الحالية */
        const temp = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { error } = await temp.auth.signUp({ email, password });
        if (error && !/already|registered|exists/i.test(error.message)) throw new Error(error.message);
      },
      async updateName(email, name) {
        throwIf((await supabase.from("staff").update({ name }).eq("email", email)).error);
      },
      async setPassword(email, password) {
        const { error } = await supabase.rpc("set_staff_password", {
          target_email: email, new_password: password,
        });
        if (error) throw new Error(error.message);
      },
      async remove(email) { throwIf((await supabase.from("staff").delete().eq("email", email)).error); },
    };
  }

  /* هل الحساب مصرح له؟ الموظف يرى صفه فقط بسبب RLS، فوجود الصف = تصريح */
  let isOwnerUser = false;
  async function isAuthorized(email) {
    const { data, error } = await supabase
      .from("staff").select("is_owner")
      .eq("email", (email || "").toLowerCase()).limit(1);
    if (error || !data || !data.length) return false;
    isOwnerUser = !!data[0].is_owner;
    return true;
  }

  let items = [];
  let filter = "all";

  /* ─── المصادقة ─── */
  async function enterDashboard() {
    $("#staffBtn").hidden = !isOwnerUser;
    show("dash");
    await refresh();
  }

  const { data: { session } } = await supabase.auth.getSession();
  const sessEmail = (session && session.user && session.user.email) || "";
  if (session && (await isAuthorized(sessEmail))) {
    currentEmail = sessEmail;
    await enterDashboard();
  } else {
    if (session) await supabase.auth.signOut();
    show("login");
  }

  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("#loginBtn"), err = $("#loginError");
    const fail = (m) => { err.textContent = m; err.hidden = false; };
    err.hidden = true;
    btn.disabled = true; btn.textContent = "جار الدخول…";
    const uname = $("#loginUser").value.trim();
    if (!validUser(uname)) { btn.disabled = false; btn.textContent = "دخول"; return fail("اكتب اسم مستخدم صحيحاً (حروف وأرقام بدون مسافات)."); }
    const email = toEmail(uname);
    const { error } = await supabase.auth.signInWithPassword({
      email, password: $("#loginPassword").value,
    });
    if (!error && !(await isAuthorized(email))) {
      await supabase.auth.signOut();
      btn.disabled = false; btn.textContent = "دخول";
      return fail("هذا الحساب غير مصرح له بتعديل المنيو.");
    }
    btn.disabled = false; btn.textContent = "دخول";
    if (error) return fail("تعذر الدخول، تأكد من اسم المستخدم وكلمة المرور.");
    currentEmail = email;
    await enterDashboard();
  });

  $("#logoutBtn").addEventListener("click", async () => {
    await supabase.auth.signOut();
    show("login");
  });

  /* ─── العرض ─── */
  async function refresh() {
    try {
      items = await db.list();
      items.sort((a, b) => a.category.localeCompare(b.category) || a.sort_order - b.sort_order);
      render();
    } catch (e) {
      toast("تعذر تحميل المنيو: " + e.message, true);
    }
  }

  function render() {
    const total = items.length;
    const on = items.filter((i) => i.is_available).length;
    $("#stats").innerHTML = `
      <div class="adm-stat"><b>${total}</b><span>إجمالي الأصناف</span></div>
      <div class="adm-stat"><b>${on}</b><span>ظاهر في المنيو</span></div>
      <div class="adm-stat"><b>${total - on}</b><span>مخفي</span></div>`;

    const wrap = $("#itemsList");
    wrap.innerHTML = "";
    const cats = filter === "all" ? Object.keys(CATS) : [filter];
    let any = false;

    cats.forEach((cat) => {
      const group = items.filter((i) => i.category === cat);
      if (!group.length) return;
      any = true;

      const g = document.createElement("div");
      g.className = "adm-group";
      g.innerHTML = `<h3 class="adm-group__title">${CATS[cat]} <small>${group.length} صنف</small></h3>`;

      group.forEach((it, idx) => {
        const row = document.createElement("div");
        row.className = "adm-item" + (it.is_available ? "" : " adm-item--off");
        row.innerHTML = `
          <label class="adm-toggle" title="${it.is_available ? "إخفاء من المنيو" : "إظهار في المنيو"}">
            <input type="checkbox" data-act="toggle" data-id="${it.id}" ${it.is_available ? "checked" : ""} />
            <i></i>
          </label>
          <img class="adm-item__thumb" src="${esc(it.image_url || "/assets/img/logo-badge.webp")}" alt="" loading="lazy" decoding="async" width="44" height="44">
          <div class="adm-item__info">
            <div class="adm-item__name">
              ${esc(it.name)}
              ${it.is_available ? "" : '<span class="adm-item__badge adm-item__badge--off">مخفي</span>'}
            </div>
            ${it.note ? `<div class="adm-item__meta">${esc(it.note)}</div>` : ""}
          </div>
          <div class="adm-item__price">${Number(it.price)} <small class="sar" role="img" aria-label="ريال سعودي"><svg aria-hidden="true"><use href="#sar"></use></svg></small></div>
          <div class="adm-item__actions">
            <button class="adm-icon-btn" data-act="up" data-id="${it.id}" ${idx === 0 ? "disabled" : ""} aria-label="تحريك لأعلى">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
            </button>
            <button class="adm-icon-btn" data-act="down" data-id="${it.id}" ${idx === group.length - 1 ? "disabled" : ""} aria-label="تحريك لأسفل">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
            </button>
            <button class="adm-icon-btn" data-act="edit" data-id="${it.id}" aria-label="تعديل">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.8 2.8 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
            </button>
            <button class="adm-icon-btn adm-icon-btn--danger" data-act="delete" data-id="${it.id}" aria-label="حذف">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg>
            </button>
          </div>`;
        g.appendChild(row);
      });
      wrap.appendChild(g);
    });

    if (!any) {
      wrap.innerHTML = `<div class="adm-empty"><b>لا توجد أصناف هنا</b>أضف أول صنف بزر «صنف جديد».</div>`;
    }
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  /* ─── الفلاتر ─── */
  $$("#filters button").forEach((b) => {
    b.addEventListener("click", () => {
      filter = b.dataset.cat;
      $$("#filters button").forEach((x) => {
        const on = x === b;
        x.classList.toggle("is-active", on);
        x.setAttribute("aria-selected", String(on));
      });
      render();
    });
  });

  /* ─── أحداث القائمة (تفويض) ─── */
  $("#itemsList").addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const { act, id } = btn.dataset;
    const it = items.find((x) => String(x.id) === id);
    if (!it) return;

    if (act === "edit") openModal(it);
    if (act === "delete") openDelete(it);
    if (act === "up" || act === "down") await move(it, act === "up" ? -1 : 1);
  });
  $("#itemsList").addEventListener("change", async (e) => {
    const t = e.target.closest('[data-act="toggle"]');
    if (!t) return;
    const it = items.find((x) => String(x.id) === t.dataset.id);
    try {
      await db.update(it.id, { is_available: t.checked });
      toast(t.checked ? "الصنف صار ظاهراً في المنيو" : "الصنف انخفى من المنيو");
      await refresh();
    } catch (err) { toast("تعذر الحفظ: " + err.message, true); await refresh(); }
  });

  /* ترتيب: تبديل sort_order مع الجار في نفس القسم */
  async function move(it, dir) {
    const group = items.filter((i) => i.category === it.category);
    const idx = group.findIndex((i) => i.id === it.id);
    const neighbor = group[idx + dir];
    if (!neighbor) return;
    try {
      await db.update(it.id, { sort_order: neighbor.sort_order });
      await db.update(neighbor.id, { sort_order: it.sort_order });
      await refresh();
    } catch (err) { toast("تعذر تغيير الترتيب: " + err.message, true); }
  }

  /* ─── صور الأصناف ───
     الصورة تُصغَّر وتُحوَّل WebP في المتصفح قبل الرفع، عشان صورة الجوال
     الكبيرة ما تثقّل صفحة المنيو على الطاولة. تُرفع في bucket «jazn-menu»
     المخصص لجَازن وحده، وسياساته تمنع أي كتابة خارجه. */
  const BUCKET = "jazn-menu";
  const IMG_MAX = 900;      // أطول ضلع بالبكسل
  const IMG_QUALITY = 0.85;

  const isUploaded = (url) => typeof url === "string" && url.includes(`/${BUCKET}/`);

  const shrinkToWebp = (file) => new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, IMG_MAX / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      const ctx = c.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error("تعذر تجهيز الصورة"))), "image/webp", IMG_QUALITY);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("الملف ليس صورة صالحة")); };
    img.src = url;
  });

  const storage = {
    async upload(blob) {
      const path = `items/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
      const { error } = await supabase.storage.from(BUCKET)
        .upload(path, blob, { contentType: "image/webp", cacheControl: "31536000" });
      if (error) throw new Error(error.message);
      return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    },
    async remove(url) {
      if (!isUploaded(url)) return;             // صور المستودع الأصلية لا تُحذف
      const path = url.split(`/${BUCKET}/`)[1];
      if (path) await supabase.storage.from(BUCKET).remove([decodeURIComponent(path)]);
    },
  };

  /* ─── نافذة الإضافة/التعديل ─── */
  const modal = $("#itemModal");
  let editing = null;
  let imageUrl = null;        // الصورة الحالية في النافذة
  let imageWasReplaced = null; // الصورة القديمة اللي تُحذف بعد حفظ ناجح

  function paintImage() {
    const img = $("#imgPreviewImg");
    const empty = $("#imgPreviewEmpty");
    if (imageUrl) {
      img.src = imageUrl; img.hidden = false; empty.hidden = true;
      $("#imgClearBtn").hidden = false;
    } else {
      img.removeAttribute("src"); img.hidden = true; empty.hidden = false;
      $("#imgClearBtn").hidden = true;
    }
  }

  $("#imgPickBtn").addEventListener("click", () => $("#fImageFile").click());

  $("#fImageFile").addEventListener("change", async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";                        // عشان اختيار نفس الملف مرة ثانية يشتغل
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast("اختر ملف صورة", true);

    $("#imgBusy").hidden = false;
    $("#imgPickBtn").disabled = true;
    try {
      const blob = await shrinkToWebp(file);
      const url = await storage.upload(blob);
      if (isUploaded(imageUrl) && !imageWasReplaced) imageWasReplaced = imageUrl;
      imageUrl = url;
      paintImage();
    } catch (ex) {
      toast("تعذر رفع الصورة: " + ex.message, true);
    } finally {
      $("#imgBusy").hidden = true;
      $("#imgPickBtn").disabled = false;
    }
  });

  $("#imgClearBtn").addEventListener("click", () => {
    if (isUploaded(imageUrl) && !imageWasReplaced) imageWasReplaced = imageUrl;
    imageUrl = null;
    paintImage();
  });

  function openModal(it) {
    editing = it || null;
    $("#modalTitle").textContent = it ? "تعديل الصنف" : "صنف جديد";
    $("#fName").value = it ? it.name : "";
    $("#fCategory").value = it ? it.category : "espresso";
    $("#fNote").value = (it && it.note) || "";
    $("#fPrice").value = it && it.price != null ? it.price : "";
    $("#fAvailable").checked = it ? !!it.is_available : true;
    imageUrl = (it && it.image_url) || null;
    imageWasReplaced = null;
    paintImage();
    $("#formError").hidden = true;
    modal.hidden = false;
    $("#fName").focus();
  }

  const closeModal = async () => {
    /* أُلغي التعديل بعد رفع صورة: تُحذف المرفوعة الجديدة لا القديمة */
    if (isUploaded(imageUrl) && imageUrl !== (editing && editing.image_url)) {
      await storage.remove(imageUrl).catch(() => {});
    }
    modal.hidden = true;
    editing = null; imageUrl = null; imageWasReplaced = null;
  };

  $("#addBtn").addEventListener("click", () => openModal(null));

  $("#itemForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $("#formError");
    err.hidden = true;
    const fail = (m) => { err.textContent = m; err.hidden = false; };

    const name = $("#fName").value.trim();
    if (!name) return fail("اكتب اسم الصنف.");
    const price = parseFloat($("#fPrice").value);
    if (isNaN(price) || price < 0) return fail("أدخل سعراً صحيحاً.");

    const row = {
      name,
      category: $("#fCategory").value,
      note: $("#fNote").value.trim() || null,
      price,
      is_available: $("#fAvailable").checked,
      image_url: imageUrl,
    };

    const btn = $("#saveBtn");
    btn.disabled = true; btn.textContent = "جار الحفظ…";
    try {
      if (editing) {
        await db.update(editing.id, row);
        toast("تم حفظ التعديلات");
      } else {
        const maxSort = Math.max(0, ...items.filter((i) => i.category === row.category).map((i) => i.sort_order));
        await db.insert({ ...row, sort_order: maxSort + 1 });
        toast("تمت إضافة الصنف");
      }
      /* الصورة القديمة تُحذف بعد نجاح الحفظ فقط، عشان لا نخسرها لو فشل */
      if (imageWasReplaced) await storage.remove(imageWasReplaced).catch(() => {});
      imageUrl = null; imageWasReplaced = null;
      await closeModal();
      await refresh();
    } catch (ex) {
      fail("تعذر الحفظ: " + ex.message);
    } finally {
      btn.disabled = false; btn.textContent = "حفظ";
    }
  });

  /* ─── الحذف ─── */
  const delModal = $("#deleteModal");
  let deleting = null;
  function openDelete(it) {
    deleting = it;
    $("#deleteName").textContent = it.name;
    delModal.hidden = false;
  }
  $("#confirmDeleteBtn").addEventListener("click", async () => {
    if (!deleting) return;
    try {
      const orphan = deleting.image_url;
      await db.remove(deleting.id);
      /* صورة الصنف المحذوف ما لها مكان، تُشال من التخزين حتى لا تتراكم */
      await storage.remove(orphan).catch(() => {});
      toast("تم حذف الصنف");
      delModal.hidden = true; deleting = null;
      await refresh();
    } catch (err) { toast("تعذر الحذف: " + err.message, true); }
  });

  /* ─── إدارة الموظفين ─── */
  const staffModal = $("#staffModal");
  const seModal = $("#staffEditModal");
  let staffCache = [];
  let seEditing = null;

  const isMeFn = (em) => em.toLowerCase() === currentEmail.toLowerCase();

  const pwPolicyError = (pw) => {
    if (pw.length < 8) return "كلمة المرور 8 خانات على الأقل.";
    if (!/[A-Z]/.test(pw)) return "كلمة المرور تحتاج حرفاً كبيراً واحداً على الأقل (A-Z).";
    if (!/[^a-zA-Z0-9]/.test(pw)) return "كلمة المرور تحتاج رمزاً مميزاً مثل @.";
    return null;
  };

  async function renderStaff() {
    const wrap = $("#staffList");
    try {
      staffCache = await staffDb.list();
      wrap.innerHTML = staffCache.map((s) => {
        const me = isMeFn(s.email);
        const canDelete = !s.is_owner && !me;
        return `<div class="adm-staff__row">
          <div class="adm-staff__id">
            <b>${esc(s.name || "بدون اسم")}
              ${s.is_owner ? '<span class="adm-staff__you">مدير</span>' : ""}
              ${me ? '<span class="adm-staff__you">أنت</span>' : ""}
            </b>
            <span class="adm-staff__email">${esc(toUser(s.email))}</span>
          </div>
          <div class="adm-staff__acts">
            <button class="adm-icon-btn" data-staff-edit="${esc(s.email)}" aria-label="تعديل الموظف">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.8 2.8 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
            </button>
            <button class="adm-icon-btn adm-icon-btn--danger" data-staff-del="${esc(s.email)}" ${canDelete ? "" : "disabled"} aria-label="إزالة">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg>
            </button>
          </div>
        </div>`;
      }).join("");
    } catch (e) {
      wrap.innerHTML = `<p class="adm-error">تعذر جلب القائمة: ${esc(e.message)}</p>`;
    }
  }

  $("#staffBtn").addEventListener("click", async () => {
    $("#staffError").hidden = true;
    $("#sName").value = ""; $("#sUser").value = ""; $("#sPassword").value = "";
    staffModal.hidden = false;
    await renderStaff();
  });

  $("#staffList").addEventListener("click", async (e) => {
    const editBtn = e.target.closest("[data-staff-edit]");
    if (editBtn) {
      const s = staffCache.find((x) => x.email === editBtn.dataset.staffEdit);
      if (s) openStaffEdit(s);
      return;
    }
    const delBtn = e.target.closest("[data-staff-del]");
    if (!delBtn) return;
    const email = delBtn.dataset.staffDel;
    if (!window.confirm("إزالة " + toUser(email) + " من المصرح لهم؟")) return;
    try {
      await staffDb.remove(email);
      toast("أزيل الموظف، ما عاد يقدر يعدل المنيو");
      await renderStaff();
    } catch (err) { toast("تعذرت الإزالة: " + err.message, true); }
  });

  $("#staffForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $("#staffError");
    const fail = (m) => { err.textContent = m; err.hidden = false; };
    err.hidden = true;
    const name = $("#sName").value.trim();
    const uname = $("#sUser").value.trim();
    const password = $("#sPassword").value;
    if (!name) return fail("اكتب اسم الموظف.");
    if (!validUser(uname)) return fail("اسم المستخدم: حروف وأرقام بدون مسافات (حرفان فأكثر).");
    const pwErr = pwPolicyError(password);
    if (pwErr) return fail(pwErr);

    const btn = $("#staffSaveBtn");
    btn.disabled = true; btn.textContent = "جار الإضافة…";
    try {
      await staffDb.add(toEmail(uname), password, name);
      toast("أضيف " + name + " ، أعطه اسم المستخدم وكلمة المرور ليدخل");
      $("#sName").value = ""; $("#sUser").value = ""; $("#sPassword").value = "";
      await renderStaff();
    } catch (ex) {
      fail("تعذرت الإضافة: " + ex.message);
    } finally {
      btn.disabled = false; btn.textContent = "إضافة";
    }
  });

  /* نافذة تعديل موظف: الاسم + كلمة مرور جديدة (اختيارية) */
  function openStaffEdit(s) {
    seEditing = s;
    $("#seEmailShow").textContent = toUser(s.email);
    $("#seName").value = s.name || "";
    $("#sePassword").value = "";
    /* كلمة مرور المدير لا يغيرها إلا هو بنفسه */
    $("#sePassField").hidden = !!s.is_owner && !isMeFn(s.email);
    $("#seError").hidden = true;
    seModal.hidden = false;
    $("#seName").focus();
  }

  $("#staffEditForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!seEditing) return;
    const err = $("#seError");
    const fail = (m) => { err.textContent = m; err.hidden = false; };
    err.hidden = true;
    const name = $("#seName").value.trim();
    const password = $("#sePassword").value;
    if (!name) return fail("اكتب اسم الموظف.");
    if (password) {
      const pwErr = pwPolicyError(password);
      if (pwErr) return fail(pwErr);
    }

    const btn = $("#seSaveBtn");
    btn.disabled = true; btn.textContent = "جار الحفظ…";
    try {
      if (name !== (seEditing.name || "")) await staffDb.updateName(seEditing.email, name);
      if (password) await staffDb.setPassword(seEditing.email, password);
      toast(password ? "حفظ الاسم وتغيرت كلمة المرور" : "تم حفظ التعديلات");
      seModal.hidden = true; seEditing = null;
      await renderStaff();
    } catch (ex) {
      fail("تعذر الحفظ: " + ex.message);
    } finally {
      btn.disabled = false; btn.textContent = "حفظ";
    }
  });

  /* إغلاق النوافذ */
  const closeAll = () => {
    /* نافذة الصنف لها إغلاق خاص: ينظف أي صورة رُفعت ثم أُلغي التعديل */
    if (!modal.hidden) { closeModal(); }
    delModal.hidden = true; staffModal.hidden = true; seModal.hidden = true;
    deleting = seEditing = null;
  };
  $$("[data-close]").forEach((el) => el.addEventListener("click", closeAll));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeAll(); });
})().catch((e) => {
  document.body.insertAdjacentHTML("beforeend",
    `<div class="adm-toasts"><div class="adm-toast adm-toast--error">خطأ غير متوقع: ${e.message}</div></div>`);
});
