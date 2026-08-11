// يحدّث تقييم قوقل ماب في site/index.html من SerpApi، وقت البناء.
//
// لماذا وقت البناء لا وقت التصفح: لو جلبناه من المتصفح لظهر المفتاح
// للزوار، ولاحتاج كل زائر طلباً زائداً، ولبقي الرقم خارج الـHTML فما
// تقرأه محركات البحث. هنا يُكتب في الملف قبل النشر، والصفحة تبقى
// ساكنة كما هي.
//
// الرقمان معلَّمان بـdata-gmaps فالتعديل يصيبهما وحدهما لا بتخمين
// على نص حر. وأي فشل أو قيمة غير معقولة يمرّ بلا كتابة: الرقم
// المحفوظ في المستودع أهون من رقم خاطئ على الواجهة.

import { readFile, writeFile } from "node:fs/promises";

const PLACE_ID = "ChIJvSp0YmrjBxYR1_CFyBOXpoY"; // جَازن، حي السويس، جيزان
const PAGE = "site/index.html";

async function fetchPlace(key) {
  const url = new URL("https://serpapi.com/search.json");
  url.search = new URLSearchParams({
    engine: "google_maps", type: "place", place_id: PLACE_ID,
    hl: "ar", api_key: key,
  });
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`SerpApi ردّ ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(`SerpApi: ${data.error}`);

  // المحرّك يرجّع place_results لمكان بعينه، وlocal_results لو رجع بحثاً
  const place = data.place_results
    ?? (data.local_results ?? []).find((p) => p.place_id === PLACE_ID);
  if (!place) throw new Error("ما رجع المكان في الاستجابة");
  if (place.place_id && place.place_id !== PLACE_ID)
    throw new Error(`رجع مكان آخر: ${place.place_id}`);
  return { rating: place.rating, reviews: place.reviews };
}

// المكان قائم بتقييم عالٍ، فأي قيمة خارج هذه الحدود خللٌ في المصدر
// لا تغيّرٌ حقيقي
function unreasonable({ rating, reviews }) {
  if (typeof rating !== "number" || !(rating >= 1 && rating <= 5))
    return `تقييم غير معقول: ${rating}`;
  if (!Number.isInteger(reviews) || !(reviews >= 1 && reviews <= 1e6))
    return `عدد مراجعات غير معقول: ${reviews}`;
  return null;
}

function swap(html, key, value) {
  const re = new RegExp(`(<span data-gmaps="${key}">)([^<]*)(</span>)`);
  const m = html.match(re);
  if (!m) throw new Error(`ما لقيت علامة data-gmaps=${key} في الصفحة`);
  return [html.replace(re, `$1${value}$3`), m[2]];
}

const key = (process.env.SERPAPI_KEY ?? "").trim();
if (!key) {
  console.warn("SERPAPI_KEY غير مضبوط — الصفحة تُنشر برقمها المحفوظ");
  process.exit(0);
}

let place;
try {
  place = await fetchPlace(key);
} catch (e) {
  console.warn(`تعذّر الجلب، الصفحة تُنشر برقمها المحفوظ — ${e.message}`);
  process.exit(0);
}

const bad = unreasonable(place);
if (bad) {
  console.warn(`${bad} — الصفحة تُنشر برقمها المحفوظ`);
  process.exit(0);
}

// 4.8 لا 4.80، و5 لا 5.0
const ratingTxt = String(Number(place.rating.toFixed(1)));

let html = await readFile(PAGE, "utf8");
let oldRating, oldReviews;
[html, oldRating] = swap(html, "rating", ratingTxt);
[html, oldReviews] = swap(html, "reviews", String(place.reviews));

if (oldRating === ratingTxt && oldReviews === String(place.reviews)) {
  console.log(`التقييم كما هو: ${ratingTxt} من 5، ${place.reviews} تقييم`);
  process.exit(0);
}

await writeFile(PAGE, html);
console.log(`حُدّث: ${oldRating}→${ratingTxt} من 5، ${oldReviews}→${place.reviews} تقييم`);
