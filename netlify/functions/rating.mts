// تقييم قوقل ماب من SerpApi، مخبَّأ على حافة نتلفاي يوماً كاملاً.
//
// المفتاح يبقى على الخادم فلا يصل المتصفح. والتخبئة تعني أن سيربآبي
// يُسأل مرة واحدة في اليوم مهما زار الموقع من زائر — لا مرة لكل زائر.
//
// الصفحة أصلاً تحمل رقمها مطبوعاً في الـHTML (يُحدَّث وقت البناء)،
// وهذه الدالة تنعشه فقط. فإن سقطت أو انقطعت الشبكة، بقي الرقم
// المطبوع ظاهراً ولا يفقد الزائر شيئاً.

import type { Config, Context } from "@netlify/functions";

const PLACE_ID = "ChIJvSp0YmrjBxYR1_CFyBOXpoY"; // جَازن، حي السويس، جيزان

export default async (_req: Request, _ctx: Context) => {
  const key = (Netlify.env.get("SERPAPI_KEY") ?? "").trim();
  if (!key) return new Response("null", { status: 204 });

  try {
    const url = new URL("https://serpapi.com/search.json");
    url.search = new URLSearchParams({
      engine: "google_maps", type: "place", place_id: PLACE_ID,
      hl: "ar", api_key: key,
    }).toString();

    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) throw new Error(`SerpApi ردّ ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(String(data.error));

    const place = data.place_results
      ?? (data.local_results ?? []).find((p: any) => p.place_id === PLACE_ID);
    if (!place) throw new Error("ما رجع المكان");
    if (place.place_id && place.place_id !== PLACE_ID)
      throw new Error("رجع مكان آخر");

    const rating = place.rating, reviews = place.reviews;
    // المكان قائم بتقييم عالٍ، فأي قيمة خارج هذه الحدود خللٌ في
    // المصدر لا تغيّرٌ حقيقي — نصمت ونترك المطبوع
    if (typeof rating !== "number" || !(rating >= 1 && rating <= 5)) throw new Error("تقييم شاذ");
    if (!Number.isInteger(reviews) || !(reviews >= 1)) throw new Error("عدد شاذ");

    return Response.json({ rating, reviews }, {
      headers: {
        // المتصفح يراجع، والحافة تحتفظ يوماً وتقدّم القديم أسبوعاً
        // إن تعذّر التجديد
        "Cache-Control": "public, max-age=0, must-revalidate",
        "Netlify-CDN-Cache-Control":
          "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (e) {
    console.warn("تعذّر جلب التقييم:", (e as Error).message);
    return new Response("null", { status: 204 });
  }
};

export const config: Config = {
  path: "/api/rating",
};
