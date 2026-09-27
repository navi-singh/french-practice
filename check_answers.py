#!/usr/bin/env python3
"""Read-only check that answer blocks are well formed and purely additive.

Usage: python3 check_answers.py <file> [<file> ...]

Verifies, per file:
  * every `:::answer` has a matching closing `:::`
  * the file renders to balanced <details> elements
  * no speakable chip contains a percentage (those are read aloud in French)
  * the working-tree change adds lines only, so existing lesson text survives
"""
import re
import subprocess
import sys
from pathlib import Path

import build_site

BAD_CHIP = re.compile(r"%")
CHIP = re.compile(r'<code class="speakable"[^>]*>([^<]*)</code>')


def deletions(path):
    proc = subprocess.run(
        ["git", "diff", "--numstat", "--", str(path)],
        capture_output=True, text=True, check=True,
    )
    if not proc.stdout.strip():
        return 0
    return int(proc.stdout.split()[1])


def check(path):
    raw = Path(path).read_text(encoding="utf-8")
    lines = raw.splitlines()
    opens = sum(1 for line in lines if line.strip().startswith(":::answer"))
    closes = sum(1 for line in lines if line.strip() == ":::")
    problems = []
    if opens != closes:
        problems.append(f"{opens} opening markers vs {closes} closing markers")

    html = build_site.markdown_to_html(raw)
    if html.count('<details class="answer-block">') != opens:
        problems.append("some answer blocks did not render")
    if html.count("</details>") != opens:
        problems.append("unbalanced <details> in rendered HTML")
    if ":::" in html:
        problems.append("stray ::: marker leaked into the page")

    bad = [chip for chip in CHIP.findall(html) if BAD_CHIP.search(chip)]
    if bad:
        problems.append(f"non-French speakable chips: {bad}")

    removed = deletions(path)
    if removed:
        problems.append(
            f"{removed} line(s) deleted - answers must only be ADDED, never replace existing text"
        )
    return opens, problems


def main(paths):
    failed = False
    for path in paths:
        opens, problems = check(path)
        if problems:
            failed = True
            print(f"FAIL {path}")
            for problem in problems:
                print(f"       - {problem}")
        else:
            print(f"ok   {path}: {opens} answer blocks, additive, chips clean")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
