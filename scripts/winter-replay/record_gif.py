"""Step the cold-spell map's scrubber and save frames, then assemble a GIF with ffmpeg.

Run: uv run --with playwright scripts/winter-replay/record_gif.py [base-url]
Writes review/YYYY-MM-DD/draft/winter-replay/animation.gif (local, untracked).
"""
import datetime
import subprocess
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
SET = """(i) => { const r = document.querySelector('.amap-bar input[type=range]');
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(r, String(i));
  r.dispatchEvent(new Event('input', { bubbles: true })); return Number(r.max); }"""


def main():
    base = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5175"
    out = ROOT / "review" / datetime.date.today().isoformat() / "draft" / "winter-replay"
    frames = out / "gif-frames"
    frames.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch()
        page = b.new_page(viewport={"width": 1100, "height": 900}, device_scale_factor=1)
        page.goto(f"{base}/winter-replay", wait_until="networkidle")
        box = page.locator(".box:has(.amap)").first
        box.scroll_into_view_if_needed()
        n = page.evaluate(SET, 0) + 1
        for i in range(n):
            page.evaluate(SET, i)
            page.wait_for_timeout(150)
            box.screenshot(path=frames / f"f{i:02d}.png")
        b.close()
    gif = out / "animation.gif"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", "1.5", "-i", str(frames / "f%02d.png"),
                    "-vf", "scale=560:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=64[p];[b][p]paletteuse",
                    "-loop", "0", str(gif)], check=True)
    size = gif.stat().st_size
    assert size < 3 * 1024 * 1024, size
    print(gif, size // 1024, "KB,", n, "frames")


if __name__ == "__main__":
    main()
