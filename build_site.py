#!/usr/bin/env python3
import html
import json
import re
from pathlib import Path


ROOT = Path(__file__).parent
OUTPUT = ROOT / "docs"


def inline(text):
    placeholders = []

    def stash(value):
        placeholders.append(value)
        return f"\x00{len(placeholders) - 1}\x00"

    text = html.escape(text, quote=False)
    text = re.sub(
        r"`([^`]+)`",
        lambda match: stash(
            f'<code class="speakable" lang="fr">{match.group(1)}</code>'
        ),
        text,
    )
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"\*([^*]+)\*", r"<em>\1</em>", text)
    text = re.sub(
        r"\[([^\]]+)\]\(([^)]+)\)",
        lambda match: f'<span class="reference-link">{match.group(1)}</span>',
        text,
    )
    text = text.replace(" -&gt; ", " → ")

    for index, value in enumerate(placeholders):
        text = text.replace(f"\x00{index}\x00", value)
    return text


def markdown_to_html(source):
    lines = source.splitlines()
    output = []
    paragraph = []
    list_type = None
    in_table = False

    def flush_paragraph():
        if paragraph:
            output.append(f"<p>{inline(' '.join(paragraph))}</p>")
            paragraph.clear()

    def close_list():
        nonlocal list_type
        if list_type:
            output.append(f"</{list_type}>")
            list_type = None

    def close_table():
        nonlocal in_table
        if in_table:
            output.append("</tbody></table></div>")
            in_table = False

    index = 0
    while index < len(lines):
        raw = lines[index].rstrip()
        stripped = raw.strip()

        if not stripped:
            flush_paragraph()
            close_list()
            close_table()
            index += 1
            continue

        heading = re.match(r"^(#{1,4})\s+(.+)$", stripped)
        if heading:
            flush_paragraph()
            close_list()
            close_table()
            level = len(heading.group(1))
            text = heading.group(2)
            anchor = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
            output.append(f'<h{level} id="{anchor}">{inline(text)}</h{level}>')
            index += 1
            continue

        if stripped.startswith("> "):
            flush_paragraph()
            close_list()
            close_table()
            output.append(f"<blockquote>{inline(stripped[2:])}</blockquote>")
            index += 1
            continue

        if "|" in stripped and index + 1 < len(lines):
            separator = lines[index + 1].strip()
            if re.match(r"^\|?[\s:|-]+\|[\s:|-]+\|?$", separator):
                flush_paragraph()
                close_list()
                close_table()
                headers = [cell.strip() for cell in stripped.strip("|").split("|")]
                output.append('<div class="table-wrap"><table><thead><tr>')
                output.extend(f"<th>{inline(cell)}</th>" for cell in headers)
                output.append("</tr></thead><tbody>")
                in_table = True
                index += 2
                while index < len(lines) and "|" in lines[index]:
                    cells = [
                        cell.strip() for cell in lines[index].strip().strip("|").split("|")
                    ]
                    output.append("<tr>")
                    output.extend(f"<td>{inline(cell)}</td>" for cell in cells)
                    output.append("</tr>")
                    index += 1
                close_table()
                continue

        unordered = re.match(r"^[-*]\s+(.+)$", stripped)
        ordered = re.match(r"^\d+\.\s+(.+)$", stripped)
        if unordered or ordered:
            flush_paragraph()
            close_table()
            required_type = "ul" if unordered else "ol"
            if list_type != required_type:
                close_list()
                list_type = required_type
                output.append(f"<{list_type}>")
            value = unordered.group(1) if unordered else ordered.group(1)
            output.append(f"<li>{inline(value)}</li>")
            index += 1
            continue

        paragraph.append(stripped)
        index += 1

    flush_paragraph()
    close_list()
    close_table()
    return "\n".join(output)


def title_from_markdown(path):
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    return path.stem.replace("-", " ").title()


def document_type(path):
    name = path.name.lower()
    if name == "readme.md":
        return "Overview"
    if "lesson" in name:
        return "Lessons"
    if "phrase" in name:
        return "Phrasebook"
    if "glossary" in name or "reference" in name:
        return "Reference"
    if "writing" in name:
        return "Writing"
    if "exercise" in name:
        return "Exercises"
    if "answer" in name:
        return "Answers"
    if "review" in name or "plan" in name:
        return "Review"
    if "audio" in name or path.suffix == ".txt":
        return "Audio"
    return "Resource"


def chapter_data(folder):
    number_match = re.match(r"chapter-(\d+)-", folder.name)
    number = int(number_match.group(1))
    overview = folder / "README.md"
    title = title_from_markdown(overview)
    title = re.sub(r"^Chapter \d+(?: Learning Pack)?:\s*", "", title)

    paths = [path for path in folder.rglob("*") if path.suffix in {".md", ".txt"}]
    priority = {
        "Overview": 0,
        "Lessons": 1,
        "Phrasebook": 2,
        "Writing": 3,
        "Exercises": 4,
        "Answers": 5,
        "Review": 6,
        "Audio": 7,
        "Reference": 8,
        "Resource": 9,
    }
    documents = []
    for path in paths:
        raw = path.read_text(encoding="utf-8")
        kind = document_type(path)
        documents.append(
            {
                "id": f"{folder.name}/{path.relative_to(folder).as_posix()}",
                "title": title_from_markdown(path),
                "type": kind,
                "html": markdown_to_html(raw),
                "search": re.sub(r"\s+", " ", raw).lower(),
            }
        )
    documents.sort(key=lambda doc: (priority[doc["type"]], doc["title"]))
    return {
        "number": number,
        "slug": folder.name,
        "title": title,
        "documents": documents,
    }


def main():
    OUTPUT.mkdir(exist_ok=True)
    chapters = [
        chapter_data(folder)
        for folder in ROOT.glob("chapter-*")
        if folder.is_dir()
    ]
    chapters.sort(key=lambda chapter: chapter["number"])
    payload = {"chapters": chapters}
    (OUTPUT / "content.js").write_text(
        "window.FRENCH_PRACTICE_CONTENT = "
        + json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )
    print(
        f"Generated {len(chapters)} chapters and "
        f"{sum(len(chapter['documents']) for chapter in chapters)} documents."
    )


if __name__ == "__main__":
    main()
