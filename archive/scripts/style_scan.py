"""Flag banned phrasing in article prose. Exit 1 on any hit.

Also lists, for a manual look, every paragraph that opens on a short declarative sentence (OPENER):
Steven never writes those, so each one is joined to the sentence after it unless it answers a question.

Run: uv run scripts/style_scan.py [files...]  (default: every project Page.tsx and meta.ts)
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BANNED = [
    r"—", r"–(?!\d)", r"\blet'?s dive\b", r"\bin today'?s\b", r"\bgame[- ]changer", r"\bunlock", r"\bleverag", r"\bdelv",
    r"\blandscape\b", r"\bnavigat", r"\bjourney\b", r"\bcrucial", r"\bseamless", r"\bin conclusion\b", r"\bfurthermore\b",
    r"\bmoreover\b", r"\badditionally\b", r"\bit'?s worth noting\b", r"\bit is important to note\b", r"\bunderscor",
    r"\btestament\b", r"\btapestry\b", r"\bpivotal\b", r"\bmeticulous", r"\bintricate", r"\brealm\b", r"\belevate", r"\bfoster",
    r"\bnot just\b", r"\bnot only\b", r"\brather than (merely|simply)\b", r"\bit'?s not [^.]{1,40}, it'?s\b", r"\bgenuinely\b",
    r"\bholistic", r"\bmultifaceted", r"\btransformative", r"\bgroundbreaking", r"\bstreamlin", r"\bempower", r"\bharness",
    r"\bat its core\b", r"\bat the heart of\b", r"\bevery single\b", r"\bsingle most\b", r"\bmatters because\b",
    r"\bhere'?s the (thing|kicker)\b", r"\bthe best part\b", r"\bcolor\b", r"\banalyz", r"\bmodeling\b", r"\boptimiz",
]
# "robust" is allowed only in a statistical sense; flag it for a manual look.
REVIEW = [r"\brobust"]
RX = [re.compile(p, re.I) for p in BANNED]
RV = [re.compile(p, re.I) for p in REVIEW]


OPENER_WORDS = 8


def short_opener(line):
    """Return the first sentence of a paragraph line if it is a statement of OPENER_WORDS words or fewer, else None."""
    if "<p>" not in line and "<p " not in line:
        return None
    text = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", re.sub(r"\{[^{}]*\}", "N", line))).strip()
    m = re.match(r"(.+?[.!?])(\s|$)", text)
    if not m or m.group(1).endswith("?") or not 0 < len(m.group(1).split()) <= OPENER_WORDS:
        return None
    return m.group(1)


PROSE = re.compile(r"<p[ >]|<li[ >]|<>|lede\s*=|\bline:|title[=:]|label:|sub=")


def prose(text):
    """Yield (line number, text) for lines that hold rendered prose, with markup stripped."""
    for i, line in enumerate(text.splitlines(), 1):
        if PROSE.search(line):
            yield i, re.sub(r"<[^>]+>|\{[^{}]*\}", " ", line)


def main():
    files = [Path(a) for a in sys.argv[1:]] or sorted((ROOT / "src/projects").glob("*/Page.tsx")) + sorted((ROOT / "src/projects").glob("*/meta.ts"))
    hits = openers = 0
    for f in files:
        for i, raw in enumerate(f.read_text().splitlines(), 1):
            first = short_opener(raw)
            if first:
                openers += 1
                print(f"OPENER {f}:{i}: {first!r}")
        for i, line in prose(f.read_text()):
            for rx in RX:
                m = rx.search(line)
                if m:
                    hits += 1
                    print(f"STYLE {f}:{i}: {m.group(0)!r}")
            for rx in RV:
                if rx.search(line):
                    print(f"REVIEW {f}:{i}: 'robust' (statistical sense only)")
    print(f"{openers} short opener(s) to review")
    print(f"{hits} hit(s)")
    sys.exit(1 if hits else 0)


if __name__ == "__main__":
    main()
