"""Save a 1200x630 link-preview image for each article: its first chart panel, centred on the panel colour.

Run with the dev server up: uv run --with playwright --with pillow scripts/og_images.py [base-url]
Writes public/img/og/<slug>.jpg. Re-run after an article's first figure changes.
"""
import io
import sys
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "img" / "og"
BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"
W, H, PAD = 1200, 630, 40


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    slugs = sorted(p.parent.name for p in (ROOT / "src" / "projects").glob("*/meta.ts"))
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 900}, device_scale_factor=2)
        for slug in slugs:
            page.goto(f"{BASE}/{slug}")
            page.wait_for_selector(".article .box")
            page.wait_for_timeout(1500)
            ground = page.evaluate("getComputedStyle(document.querySelector('.box')).backgroundColor")
            rgb = tuple(int(v) for v in ground[ground.index("(") + 1:ground.index(")")].split(",")[:3])
            # the first chart panel, skipping small status boxes; a page without one falls back to its first photo
            tall = page.evaluate("[...document.querySelectorAll('.article .box')].findIndex(b => b.getBoundingClientRect().height >= 250)")
            target = page.locator(".article .box").nth(tall) if tall >= 0 else page.locator(".article .photo").first
            fig = Image.open(io.BytesIO(target.screenshot())).convert("RGB")
            fig.thumbnail((W - 2 * PAD, H - 2 * PAD))
            card = Image.new("RGB", (W, H), rgb)
            card.paste(fig, ((W - fig.width) // 2, (H - fig.height) // 2))
            card.save(OUT / f"{slug}.jpg", quality=82)
            assert (OUT / f"{slug}.jpg").stat().st_size > 5000, slug
            print(slug, fig.size)
        browser.close()


if __name__ == "__main__":
    main()
