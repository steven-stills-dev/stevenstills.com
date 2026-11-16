"""Scan content, data and built output for terms that must never be published.

Terms come from a local, untracked `leak_terms.txt` (one per line, `re:` prefix
for a regular expression, `#` for comments). Lines in a local `leak_allow.txt`
of the form `path-prefix<TAB>term` (or `contains:<marker><TAB>term`) exempt a known public use.
Exit 1 on any hit. Run: uv run scripts/leak_scan.py [paths...]
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT = ["src", "public", "scripts", "index.html", "dist"]
TEXT = {".ts", ".tsx", ".js", ".mjs", ".css", ".html", ".json", ".csv", ".md", ".py", ".txt", ".svg", ".xml", ".geojson"}
PRIMES = [3, 5, 7, 13, 17, 19, 23, 29, 31, 37, 41, 43]
THIRTEEN = re.compile(r"(?<![\d.])\d{13}(?![\d.])")


def is_mpan(s):
    """Return True when a 13-digit string passes the MPAN core check digit."""
    return sum(int(d) * p for d, p in zip(s, PRIMES)) % 11 % 10 == int(s[12])


def load(name):
    """Read non-comment lines from a local list file."""
    p = ROOT / name
    return [l.strip("\n") for l in p.read_text().splitlines() if l.strip() and not l.startswith("#")] if p.exists() else []


def main():
    terms = []
    for t in load("leak_terms.txt"):
        # plain terms match case-sensitively (many are short or ordinary words); re: patterns ignore case
        if t.startswith("re:"):
            terms.append((t, re.compile(t[3:], re.I)))
        else:
            terms.append((t, re.compile(r"(?<![A-Za-z0-9])" + re.escape(t) + r"(?![A-Za-z0-9])")))
    if not terms:
        sys.exit("leak_terms.txt is missing or empty: refusing to pass the gate")
    allow = [tuple(l.split("\t")) for l in load("leak_allow.txt") if "\t" in l]
    hits = 0
    for arg in sys.argv[1:] or DEFAULT:
        base = ROOT / arg
        files = [base] if base.is_file() else [f for f in base.rglob("*") if f.is_file()] if base.exists() else []
        for f in files:
            if f.suffix not in TEXT or "node_modules" in f.parts or f.name == "leak_scan.py":
                continue
            rel = str(f.relative_to(ROOT))
            text = f.read_text(errors="ignore")
            found = [(t, m.group(0)) for t, rx in terms for m in [rx.search(text)] if m]
            found += [("13-digit MPAN pattern", m.group(0)) for m in THIRTEEN.finditer(text) if is_mpan(m.group(0))][:3]
            for t, m in found:
                if any(a in (t, m) and (text.find(p[9:]) >= 0 if p.startswith("contains:") else rel.startswith(p)) for p, a in allow):
                    continue
                hits += 1
                print(f"LEAK {rel}: {t!r} matched {m!r}")
    print(f"{hits} hit(s)")
    sys.exit(1 if hits else 0)


if __name__ == "__main__":
    assert is_mpan("1200023305967") and not is_mpan("1200023305960")
    main()
