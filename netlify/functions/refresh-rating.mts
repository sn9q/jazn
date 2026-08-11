// مؤقّت يومي يطلب من نتلفاي إعادة البناء، فيُعاد جلب التقييم.
//
// نتلفاي ما عنده «بناء مجدول» جاهزاً، لكن عنده دوالّ مجدولة وخطّافات
// بناء — فهذه الدالة تصل بينهما: تُنبّه الخطّاف، والبناء يشغّل
// scripts/update_rating.mjs فيكتب الرقم الطازج في الصفحة المنشورة.
//
// عنوان الخطّاف سرّ (من يعرفه يقدر يشغّل بناءً)، فيُقرأ من متغيّر
// بيئة ولا يُكتب هنا.

import type { Config } from "@netlify/functions";

export default async () => {
  const hook = (Netlify.env.get("BUILD_HOOK_URL") ?? "").trim();
  if (!hook) {
    console.warn("BUILD_HOOK_URL غير مضبوط — ما في بناء");
    return new Response("لا خطّاف", { status: 200 });
  }

  const res = await fetch(hook, {
    method: "POST",
    body: JSON.stringify({ trigger_title: "تحديث تقييم قوقل ماب" }),
  });

  const msg = res.ok
    ? "طُلب البناء"
    : `تعذّر طلب البناء: ${res.status}`;
  console.log(msg);
  return new Response(msg, { status: 200 });
};

export const config: Config = {
  schedule: "0 3 * * *", // 6 صباحاً بتوقيت الرياض
};
