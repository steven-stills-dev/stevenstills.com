"""Screenshot one page at desktop and mobile widths, plus each chart panel.

Run: uv run --with playwright scripts/shoot.py <path> <phase> [base-url]
Saves to review/YYYY-MM-DD/<phase>/<slug>/ (local, untracked).
"""
import datetime
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent


def main():
    path, phase = sys.argv[1].strip("/"), sys.argv[2]
    base = sys.argv[3] if len(sys.argv) > 3 else "http://localhost:5175"
    out = ROOT / "review" / datetime.date.today().isoformat() / phase / (path or "home")
    out.mkdir(parents=True, exist_ok=True)
    errors = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        for name, w, h in [("desktop", 1440, 900), ("mobile", 390, 844)]:
            page = b.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
            page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto(f"{base}/{path}", wait_until="networkidle")
            page.wait_for_timeout(1200)
            page.screenshot(path=out / f"{name}.jpg", full_page=True, type="jpeg", quality=70)
            if name == "desktop":
                for i, box in enumerate(page.locator(".box").all()[:14]):
                    box.scroll_into_view_if_needed()
                    page.wait_for_timeout(250)
                    box.screenshot(path=out / f"chart-{i + 1:02d}.jpg", type="jpeg", quality=80)
            page.close()
        b.close()
    print(out, "console errors:", len(errors))
    for e in errors[:10]:
        print("  ", e[:300])


if __name__ == "__main__":
    main()
