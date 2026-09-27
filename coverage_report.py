#!/usr/bin/env python3
"""Report practice sections that still have no answer block.

Usage: python3 coverage_report.py [chapter-dir ...]

A section counts as needing answers when its heading names a practice activity
and its own text (up to the next heading of any level) actually asks the
learner to produce something. Parent headings whose work lives in sub-sections
are not flagged, because the answers belong with the sub-sections.
"""
import re
import sys
from pathlib import Path

PRACTICE = re.compile(
    r"practice|task|check|drill|assignment|analysis|^#+ [A-Z]\.", re.I
)
PROMPT = re.compile(r"^\s*(\d+\.|[-*])\s+\S", re.M)


def leaf_sections(text):
    parts = re.split(r"^(#{2,4} .+)$", text, flags=re.M)
    for i in range(1, len(parts), 2):
        yield parts[i].strip(), parts[i + 1]


def missing(path):
    for head, body in leaf_sections(path.read_text(encoding="utf-8")):
        if not PRACTICE.search(head):
            continue
        if ":::answer" in body:
            continue
        if not PROMPT.search(body):
            continue  # intro-only heading; its work lives in sub-sections
        yield head


def main(dirs):
    roots = [Path(d) for d in dirs] or sorted(Path(".").glob("chapter-*"))
    rows = []
    for root in roots:
        for path in sorted(root.glob("**/*.md")):
            if path.name not in ("lessons.md", "exercises.md"):
                continue
            for head in missing(path):
                rows.append(f"{path}  ->  {head}")
    print("\n".join(rows) if rows else "COMPLETE: every practice section has answers")
    print("total missing:", len(rows))
    return 1 if rows else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
