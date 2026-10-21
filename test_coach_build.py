"""Regression checks for the separate French coach track."""
import copy
import json
import shutil
import tempfile
import unittest
from pathlib import Path

import build_coach
import build_site


class CoachBuildTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.course = build_coach.build_coach(
            build_site.ROOT, build_site.markdown_to_html
        )

    def test_complete_curriculum_has_distinct_sentence_banks_and_four_skills(self):
        chapters = self.course["chapters"]
        self.assertEqual([c["number"] for c in chapters], list(range(1, 25)))
        sentences = []
        for chapter in chapters:
            with self.subTest(chapter=chapter["id"]):
                self.assertGreaterEqual(len(chapter["bank"]), 100)
                self.assertEqual(
                    {a["skill"] for a in chapter["activities"]},
                    build_coach.SKILLS,
                )
                self.assertIn("<h", chapter["html"])
                sentences.extend(
                    " ".join(item["fr"].casefold().split())
                    for item in chapter["bank"]
                )
        self.assertGreaterEqual(len(sentences), 2400)
        self.assertEqual(len(sentences), len(set(sentences)))

    def test_assessment_inventory_and_official_mock_windows(self):
        assessments = self.course["assessments"]
        self.assertEqual(
            sorted(a["id"] for a in assessments),
            sorted(["diagnostic"] + [f"checkpoint-{n}" for n in range(1, 7)]
                   + [f"mock-{n}" for n in range(1, 4)]),
        )
        for assessment in assessments:
            if assessment["kind"] != "mock":
                continue
            sections = {s["skill"]: s for s in assessment["sections"]}
            with self.subTest(mock=assessment["id"]):
                self.assertEqual(
                    {skill: (len(s["items"]), s["seconds"])
                     for skill, s in sections.items()},
                    {"listening": (39, 2100), "reading": (39, 3600),
                     "speaking": (3, 720), "writing": (3, 3600)},
                )
                self.assertEqual(
                    [(i["seconds"], i.get("prepSeconds", 0))
                     for i in sections["speaking"]["items"]],
                    [(120, 0), (330, 120), (270, 0)],
                )
                self.assertEqual(
                    [(i["minWords"], i["maxWords"])
                     for i in sections["writing"]["items"]],
                    [(60, 120), (120, 150), (120, 180)],
                )

    def test_choice_rotation_is_stable_and_preserves_correct_answer(self):
        again = build_coach.build_coach(build_site.ROOT, build_site.markdown_to_html)
        self.assertEqual(self.course, again)
        for assessment in self.course["assessments"]:
            original = json.loads(
                (build_site.ROOT / "coach" / "assessments"
                 / f"{assessment['id']}.json").read_text(encoding="utf-8")
            )
            for before, after in zip(original["sections"], assessment["sections"]):
                for source, built in zip(before["items"], after["items"]):
                    if built["type"] == "choice":
                        self.assertEqual(
                            source["options"][source["answer"]],
                            built["options"][built["answer"]],
                        )

    def test_invalid_speaking_windows_and_writing_models_are_rejected(self):
        original = json.loads(
            (build_site.ROOT / "coach/assessments/mock-1.json")
            .read_text(encoding="utf-8")
        )
        for case in ("speaking", "writing"):
            with self.subTest(case=case), tempfile.TemporaryDirectory() as folder:
                root = Path(folder)
                shutil.copytree(build_site.ROOT / "coach", root / "coach")
                invalid = copy.deepcopy(original)
                section = next(s for s in invalid["sections"] if s["skill"] == case)
                if case == "speaking":
                    section["items"][1]["prepSeconds"] = 0
                    message = "speaking task/preparation windows"
                else:
                    section["items"][0]["model"] = "Trop court."
                    message = "Writing model outside word range"
                (root / "coach/assessments/mock-1.json").write_text(
                    json.dumps(invalid, ensure_ascii=False), encoding="utf-8"
                )
                with self.assertRaisesRegex(ValueError, message):
                    build_coach.build_coach(root, build_site.markdown_to_html)


if __name__ == "__main__":
    unittest.main()
