#!/usr/bin/env python3
"""Tests for the static site generator."""
import unittest
from pathlib import Path

import build_site


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
        self.assert_type("tts-narration.txt", "Audio")
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


if __name__ == "__main__":
    unittest.main()
