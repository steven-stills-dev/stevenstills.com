"""Fetch a public URL once and cache the response on disk (scripts/_cache/, untracked)."""
import hashlib
import time
import urllib.request
from pathlib import Path

CACHE = Path(__file__).resolve().parent / "_cache"


def get(url, pause=0.15, retries=3):
    """Return the body of `url` as bytes, from the cache when present."""
    CACHE.mkdir(exist_ok=True)
    f = CACHE / hashlib.sha1(url.encode()).hexdigest()
    if f.exists():
        return f.read_bytes()
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "python-urllib"})
            body = urllib.request.urlopen(req, timeout=60).read()
            f.write_bytes(body)
            time.sleep(pause)
            return body
        except Exception:
            if attempt == retries - 1:
                raise
            time.sleep(2 * (attempt + 1))


if __name__ == "__main__":
    assert b"success" in get("https://api.neso.energy/api/3/action/package_show?id=historic-demand-data")
    print("ok")
