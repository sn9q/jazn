# يقرأ scripts/urls.json ويحمل الصور ويحولها WebP داخل reference/
import json, os, urllib.request
from PIL import Image

HERE = os.path.dirname(__file__)
URLS = json.load(open(os.path.join(HERE, "urls.json"), encoding="utf-8"))


def fetch(url, path, max_px, quality):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    raw = urllib.request.urlopen(req, timeout=60).read()
    tmp = path + ".tmp"
    open(tmp, "wb").write(raw)
    im = Image.open(tmp).convert("RGB")
    w, h = im.size
    if max(w, h) > max_px:
        r = max_px / max(w, h)
        im = im.resize((int(w * r), int(h * r)), Image.LANCZOS)
    im.save(path, "WEBP", quality=quality, method=6)
    os.remove(tmp)
    return os.path.getsize(path)


def run(items, outdir, max_px, quality):
    os.makedirs(outdir, exist_ok=True)
    total = 0
    for key, url in items:
        out = os.path.join(outdir, f"{key}.webp")
        if os.path.exists(out):
            continue
        try:
            total += fetch(url, out, max_px, quality)
            print("ok", key)
        except Exception as e:
            print("ERR", key, e)
    print(outdir, "total KB:", total // 1024)


run([(p["key"], p["url"]) for p in URLS["products"]],
    os.path.join(HERE, "..", "reference", "products"), 800, 80)
run([(f"g{i:02d}", u) for i, u in enumerate(URLS["google"])],
    os.path.join(HERE, "..", "reference", "maps"), 1400, 78)
