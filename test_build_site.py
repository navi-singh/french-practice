#!/usr/bin/env python3
"""Tests for the static site generator."""
import re
import unittest
from pathlib import Path

import build_site
import coverage_report


class DocumentTypeTests(unittest.TestCase):
    def assert_type(self, filename, expected):
        self.assertEqual(build_site.document_type(Path(filename)), expected)

    def test_core_document_types(self):
        self.assert_type("README.md", "Overview")
        self.assert_type("lessons.md", "Lessons")
        self.assert_type("exercises.md", "Exercises")
        self.assert_type("answer-key.md", "Answers")
        self.assert_type("review-plan.md", "Review")
        self.assert_type("writing-drills.md", "Writing")
        self.assert_type("audio-script.md", "Audio")
        self.assert_type("tts-narration.txt", "Narration")
        self.assert_type("error-log.md", "Resource")

    def test_phrasebook_and_reference_types(self):
        self.assert_type("survival-phrases.md", "Phrasebook")
        self.assert_type("glossary.md", "Reference")

    def test_review_plan_variants_stay_review(self):
        self.assert_type("7-day-plan.md", "Review")


class ChapterOrderingTests(unittest.TestCase):
    """A beginner must meet documents in teaching order, not alphabetical order."""

    def setUp(self):
        folder = build_site.ROOT / "chapter-00-getting-started"
        self.chapter = build_site.chapter_data(folder)

    def test_chapter_zero_metadata(self):
        self.assertEqual(self.chapter["number"], 0)
        self.assertIn("Getting Started", self.chapter["title"])

    def test_documents_follow_teaching_order(self):
        types = [document["type"] for document in self.chapter["documents"]]
        self.assertEqual(
            types,
            [
                "Overview",
                "Lessons",
                "Phrasebook",
                "Exercises",
                "Answers",
                "Review",
                "Reference",
            ],
        )

    def test_phrasebook_precedes_exercises(self):
        types = [document["type"] for document in self.chapter["documents"]]
        self.assertLess(types.index("Phrasebook"), types.index("Exercises"))

    def test_every_priority_key_is_reachable(self):
        """Any type document_type can return must be sortable."""
        names = [
            "README.md", "lessons.md", "survival-phrases.md", "writing.md",
            "exercises.md", "answer-key.md", "review-plan.md", "audio.md",
            "glossary.md", "notes.md",
        ]
        for name in names:
            with self.subTest(name=name):
                self.assertIsInstance(build_site.document_type(Path(name)), str)


class CourseBuildTests(unittest.TestCase):
    def test_all_chapters_build_and_sort(self):
        chapters = sorted(
            (
                build_site.chapter_data(folder)
                for folder in build_site.ROOT.glob("chapter-*")
                if folder.is_dir()
            ),
            key=lambda chapter: chapter["number"],
        )
        numbers = [chapter["number"] for chapter in chapters]
        self.assertEqual(numbers, list(range(0, 17)))
        self.assertEqual(numbers[0], 0, "Chapter 0 must come first for beginners")

    def test_every_chapter_has_lessons_and_overview(self):
        for folder in build_site.ROOT.glob("chapter-*"):
            if not folder.is_dir():
                continue
            chapter = build_site.chapter_data(folder)
            types = {document["type"] for document in chapter["documents"]}
            with self.subTest(chapter=chapter["number"]):
                self.assertIn("Overview", types)
                self.assertIn("Lessons", types)


class MarkdownRenderingTests(unittest.TestCase):
    def test_french_backticks_become_speakable(self):
        html = build_site.markdown_to_html("Say `bonjour` now.")
        self.assertIn('<code class="speakable" lang="fr">bonjour</code>', html)

    def test_table_renders(self):
        source = "| Letter | Name |\n|---|---|\n| `a` | `a` |\n"
        html = build_site.markdown_to_html(source)
        self.assertIn("<table>", html)
        self.assertIn("</tbody></table>", html)

    def test_heading_gets_anchor(self):
        html = build_site.markdown_to_html("## Nasal Vowels")
        self.assertIn('id="nasal-vowels"', html)


class TranslationTableTests(unittest.TestCase):
    """English/French drill tables need their own markup so the site can lay
    them out in two equal columns and mask the answers."""

    DRILL = "| English | French |\n|---|---|\n| 1. Hello. | `Bonjour.` |\n"

    def test_english_french_table_is_marked_as_a_drill(self):
        html = build_site.markdown_to_html(self.DRILL)
        self.assertIn('<div class="table-wrap translation-wrap">', html)
        self.assertIn('<table class="translation-table">', html)

    def test_drill_header_match_ignores_case(self):
        html = build_site.markdown_to_html(
            "| english | FRENCH |\n|---|---|\n| 1. Hi. | `Salut.` |\n"
        )
        self.assertIn('<table class="translation-table">', html)

    def test_drill_rows_keep_speakable_french(self):
        html = build_site.markdown_to_html(self.DRILL)
        self.assertIn('<code class="speakable" lang="fr">Bonjour.</code>', html)
        body = html.split("<tbody>")[1]
        self.assertEqual(body.count("<tr>"), 1)

    def test_other_tables_are_untouched(self):
        html = build_site.markdown_to_html("| Letter | Name |\n|---|---|\n| a | a |\n")
        self.assertIn('<div class="table-wrap"><table>', html)
        self.assertNotIn("translation-table", html)

    def test_three_column_table_is_not_a_drill(self):
        html = build_site.markdown_to_html(
            "| English | French | Note |\n|---|---|---|\n| Hi | `Salut` | x |\n"
        )
        self.assertNotIn("translation-table", html)


class OutlineTests(unittest.TestCase):
    def test_outline_lists_second_level_headings_in_order(self):
        sections = build_site.outline("# Title\n\n## First\n\ntext\n\n## Second\n")
        self.assertEqual([s["title"] for s in sections], ["First", "Second"])

    def test_outline_skips_other_heading_levels(self):
        sections = build_site.outline("# Title\n\n### Sub\n\n## Real\n")
        self.assertEqual([s["title"] for s in sections], ["Real"])

    def test_outline_titles_drop_markdown_emphasis(self):
        sections = build_site.outline("## Unit 1: `être` and **avoir**")
        self.assertEqual(sections[0]["title"], "Unit 1: être and avoir")

    def test_outline_ids_match_the_rendered_heading_anchors(self):
        source = "## Unit 1: `être` and Avoir\n\n## Translation Practice (100 Sentences)\n"
        html = build_site.markdown_to_html(source)
        for section in build_site.outline(source):
            with self.subTest(section=section["title"]):
                self.assertIn(f'id="{section["id"]}"', html)

    def test_every_lesson_document_exposes_its_outline(self):
        for folder in sorted(build_site.ROOT.glob("chapter-*")):
            chapter = build_site.chapter_data(folder)
            lessons = next(
                doc for doc in chapter["documents"] if doc["type"] == "Lessons"
            )
            with self.subTest(chapter=chapter["number"]):
                self.assertTrue(lessons["sections"])


class TranslationPracticeContentTests(unittest.TestCase):
    """Every chapter ends with a 100-sentence drill the learner can translate
    from memory, so the rows must stay numbered, unique, and parseable."""

    HEADING = "## English-to-French Translation Practice (100 Sentences)"

    def lesson_files(self):
        return sorted(build_site.ROOT.glob("chapter-*/lessons.md"))

    def drill_rows(self, path):
        source = path.read_text(encoding="utf-8")
        self.assertEqual(source.count(self.HEADING), 1, path)
        section = source.split(self.HEADING)[1]
        return [
            line for line in section.splitlines() if re.match(r"^\| \d+\. ", line)
        ]

    def test_every_chapter_has_one_hundred_numbered_rows(self):
        for path in self.lesson_files():
            with self.subTest(chapter=path.parent.name):
                rows = self.drill_rows(path)
                self.assertEqual(len(rows), 100)
                for number, row in enumerate(rows, 1):
                    self.assertTrue(row.startswith(f"| {number}. "), row)

    def test_french_column_is_speakable_and_english_is_not(self):
        for path in self.lesson_files():
            with self.subTest(chapter=path.parent.name):
                for row in self.drill_rows(path):
                    self.assertRegex(row, r"^\| \d+\. [^`|]+ \| `[^`|]+` \|$")

    def test_rows_are_not_mechanical_repeats(self):
        """The first version padded 10 sentences with 10 time phrases; every
        row must now be a distinct sentence."""
        for path in self.lesson_files():
            with self.subTest(chapter=path.parent.name):
                rows = self.drill_rows(path)
                english = [row.split("|")[1].strip() for row in rows]
                french = [row.split("`")[1] for row in rows]
                self.assertEqual(len(set(english)), 100)
                self.assertEqual(len(set(french)), 100)



class AnswerBlockTests(unittest.TestCase):
    def test_answer_block_is_collapsed_details(self):
        html = build_site.markdown_to_html(
            ":::answer\n1. `Nous sommes lundi.` — no article.\n:::"
        )
        self.assertIn('<details class="answer-block">', html)
        self.assertIn("<summary>Show answers</summary>", html)
        # No "open" attribute means the learner attempts first.
        self.assertNotIn("<details open", html)
        self.assertEqual(html.count("</details>"), 1)

    def test_answer_body_renders_nested_markdown(self):
        html = build_site.markdown_to_html(
            ":::answer\n- `je parle` — **regular** ending.\n\n| A | B |\n|---|---|\n| 1 | 2 |\n:::"
        )
        self.assertIn('<code class="speakable" lang="fr">je parle</code>', html)
        self.assertIn("<strong>regular</strong>", html)
        self.assertIn("<table>", html)

    def test_custom_summary_label(self):
        html = build_site.markdown_to_html(":::answer Show the model answers\ntext\n:::")
        self.assertIn("<summary>Show the model answers</summary>", html)

    def test_content_after_block_is_not_swallowed(self):
        html = build_site.markdown_to_html(":::answer\nhidden\n:::\n\n## Next unit")
        self.assertIn('<h2 id="next-unit">Next unit</h2>', html)
        self.assertLess(html.index("</details>"), html.index("Next unit"))

    def test_markers_are_stripped_from_search_text(self):
        chapter = build_site.chapter_data(
            build_site.ROOT / "chapter-03-dates-er-verbs-questions"
        )
        lessons = next(d for d in chapter["documents"] if d["type"] == "Lessons")
        self.assertNotIn(":::", lessons["search"])


class CourseAnswerCoverageTests(unittest.TestCase):
    """Guards the whole course, not just one chapter."""

    @classmethod
    def setUpClass(cls):
        # Chapter 1 nests its exercises under practice/, so recurse.
        cls.files = sorted(build_site.ROOT.glob("chapter-*/**/lessons.md")) + sorted(
            build_site.ROOT.glob("chapter-*/**/exercises.md")
        )

    def test_every_answer_block_is_closed(self):
        for path in self.files:
            lines = path.read_text(encoding="utf-8").splitlines()
            opens = sum(1 for line in lines if line.strip().startswith(":::answer"))
            closes = sum(1 for line in lines if line.strip() == ":::")
            with self.subTest(path=path.name, chapter=path.parent.name):
                self.assertEqual(opens, closes, "unbalanced ::: markers")

    def test_every_lessons_and_exercises_file_has_answers(self):
        for path in self.files:
            html = build_site.markdown_to_html(path.read_text(encoding="utf-8"))
            with self.subTest(path=path.name, chapter=path.parent.name):
                self.assertIn('<details class="answer-block">', html)

    def test_speakable_chips_hold_french_not_english_artifacts(self):
        import re

        # Bare numerals are legitimate: the numbers chapter expects a French
        # voice to read `70` as "soixante-dix". Percentages and UI labels are
        # not, since they only ever appear in English instructions.
        artifact = re.compile(r"%|Show answers|Speaking speed|Slower", re.I)
        for path in self.files:
            html = build_site.markdown_to_html(path.read_text(encoding="utf-8"))
            chips = re.findall(r'<code class="speakable"[^>]*>([^<]*)</code>', html)
            bad = [chip for chip in chips if artifact.search(chip)]
            with self.subTest(path=path.name, chapter=path.parent.name):
                self.assertEqual(bad, [], f"non-French chips: {bad}")


class AnswerKeyDriftTests(unittest.TestCase):
    """Inline answers duplicate `answer-key.md`, so guard against drift.

    `answer-key.md` stays canonical. Every answer it lists for Section A must
    still appear verbatim inside the matching inline block, so editing one copy
    without the other fails here instead of silently teaching two answers.
    """

    @staticmethod
    def key_answers(path):
        import re

        section = re.search(
            r"^## Section A\s*$(.*?)(?=^## )", path.read_text(encoding="utf-8"),
            re.MULTILINE | re.DOTALL,
        )
        if not section:
            return []
        return re.findall(r"^\d+\.\s+`([^`]+)`\s*$", section.group(1), re.MULTILINE)

    @staticmethod
    def first_answer_block(path):
        import re

        block = re.search(
            r"^:::answer.*?$(.*?)^:::\s*$", path.read_text(encoding="utf-8"),
            re.MULTILINE | re.DOTALL,
        )
        return block.group(1) if block else ""

    def test_section_a_answers_match_the_answer_key(self):
        checked = 0
        for key_path in sorted(build_site.ROOT.glob("chapter-*/**/answer-key.md")):
            answers = self.key_answers(key_path)
            exercises = key_path.parent / "exercises.md"
            if not answers or not exercises.exists():
                continue
            block = self.first_answer_block(exercises)
            if not block:
                continue
            checked += 1
            for answer in answers:
                with self.subTest(chapter=key_path.parent.name, answer=answer):
                    self.assertIn(
                        f"`{answer}`",
                        block,
                        "inline answer drifted from answer-key.md",
                    )
        self.assertGreater(checked, 0, "drift test compared nothing")


class PracticeCoverageTests(unittest.TestCase):
    """Every practice section must offer answers, or a learner working alone
    has no way to find out they rehearsed a mistake."""

    def test_no_practice_section_is_left_without_answers(self):
        uncovered = []
        for chapter in sorted(build_site.ROOT.glob("chapter-*")):
            for path in sorted(chapter.glob("**/*.md")):
                if path.name not in ("lessons.md", "exercises.md"):
                    continue
                for head in coverage_report.missing(path):
                    uncovered.append(f"{path.relative_to(build_site.ROOT)} -> {head}")
        report = "\n".join(uncovered[:15])
        self.assertEqual(
            0,
            len(uncovered),
            f"{len(uncovered)} practice sections have no answers:\n{report}",
        )
if __name__ == "__main__":
    unittest.main()
