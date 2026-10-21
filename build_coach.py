import hashlib
import json


SKILLS = {"listening", "reading", "speaking", "writing"}
PURPOSES = {
    "listening", "retrieval", "oral-response", "translation",
    "transformation", "comprehension",
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def build_coach(root, render):
    source = root / "coach"
    ids = set()

    def register(value):
        require(isinstance(value, str) and value and value not in ids,
                f"Missing or duplicate coach identifier: {value}")
        ids.add(value)

    def text(value, label):
        require(isinstance(value, str) and value.strip(), f"Missing {label}")

    def activity(item):
        register(item.get("id"))
        require(item.get("skill") in SKILLS, f"Invalid skill: {item['id']}")
        for key in ("title", "prompt"):
            text(item.get(key), f"{key}: {item['id']}")
        if item.get("type") == "choice":
            options = item.get("options", [])
            require(len(options) == 4 and all(isinstance(x, str) and x for x in options)
                    and len(set(options)) == 4, f"Need four distinct options: {item['id']}")
            require(type(item.get("answer")) is int and 0 <= item["answer"] < 4,
                    f"Invalid correct option: {item['id']}")
            # Stable option rotation removes authoring-position clues without changing saved retries.
            offset = hashlib.sha256(item["id"].encode("utf-8")).digest()[0] % 4
            item["options"] = options[-offset:] + options[:-offset] if offset else options
            item["answer"] = (item["answer"] + offset) % 4
            text(item.get("explanation"), f"explanation: {item['id']}")
            if item["skill"] in {"listening", "reading"}:
                key = "script" if item["skill"] == "listening" else "passage"
                text(item.get(key), f"{key}: {item['id']}")
        else:
            require(item.get("type") == "production", f"Invalid activity type: {item['id']}")
            text(item.get("model"), f"model: {item['id']}")
            require(isinstance(item.get("rubric"), list) and item["rubric"]
                    and all(isinstance(x, str) and x for x in item["rubric"]),
                    f"Missing rubric: {item['id']}")
        for key in ("seconds", "prepSeconds", "minWords", "maxWords"):
            if key in item:
                require(type(item[key]) is int and item[key] >= 0,
                        f"Invalid {key}: {item['id']}")
        if "minWords" in item and "maxWords" in item:
            require(item["minWords"] <= item["maxWords"], f"Invalid word range: {item['id']}")
            if item["type"] == "production" and item["skill"] == "writing":
                require(item["minWords"] <= len(item["model"].split()) <= item["maxWords"],
                        f"Writing model outside word range: {item['id']}")

    chapters = []
    all_french = set()
    for path in sorted((source / "chapters").glob("*.json")):
        chapter = json.loads(path.read_text(encoding="utf-8"))
        register(chapter.get("id"))
        require(chapter["id"] == f"chapter-{chapter.get('number', 0):02d}",
                f"Chapter ID must match number: {path}")
        require(chapter.get("phase") == (chapter.get("number", 0) - 1) // 4 + 1,
                f"Invalid phase: {path}")
        text(chapter.get("title"), f"chapter title: {path}")
        text(chapter.get("lessons"), f"lessons: {path}")
        require(len(chapter.get("bank", [])) >= 100, f"Need 100 bank items: {path}")
        french = set()
        previous_french = set(all_french)
        for item in chapter["bank"]:
            register(item.get("id"))
            for key in ("fr", "en", "prompt", "cue"):
                text(item.get(key), f"{key}: {item['id']}")
            require(item.get("purpose") in PURPOSES, f"Invalid purpose: {item['id']}")
            if item["purpose"] == "transformation":
                text(item.get("source"), f"transformation source: {item['id']}")
                require(item["source"] != item["fr"], f"Transformation input must differ from target: {item['id']}")
            normalized = " ".join(item["fr"].casefold().split())
            require(normalized not in french, f"Duplicate French bank sentence: {item['id']}")
            french.add(normalized)
            all_french.add(normalized)
        require(len(french - previous_french) >= 100,
                f"Need 100 bank sentences not copied from earlier coach chapters: {path}")
        require(len({item["purpose"] for item in chapter["bank"]}) > 1,
                f"Mixed practice purposes required: {path}")
        require({a.get("skill") for a in chapter.get("activities", [])} == SKILLS,
                f"All four skills required: {path}")
        for item in chapter["activities"]:
            activity(item)
        chapter["html"] = render(chapter.pop("lessons"))
        chapters.append(chapter)
    require([c["number"] for c in chapters] == list(range(1, 25)),
            "French coach plan requires teaching chapters 1–24")
    require(len(all_french) >= 2400, "Need at least 2,400 distinct coach bank sentences")

    assessments = []
    for path in sorted((source / "assessments").glob("*.json")):
        assessment = json.loads(path.read_text(encoding="utf-8"))
        register(assessment.get("id"))
        require(assessment.get("kind") in {"diagnostic", "checkpoint", "mock"},
                f"Invalid assessment kind: {path}")
        text(assessment.get("title"), f"assessment title: {path}")
        text(assessment.get("intro"), f"assessment introduction: {path}")
        sections = assessment.get("sections", [])
        require(len(sections) == 4 and {s.get("skill") for s in sections} == SKILLS,
                f"Four assessment sections required: {path}")
        for section in sections:
            require(section.get("id") == section["skill"], f"Section ID must match skill: {path}")
            require(type(section.get("seconds")) is int and section["seconds"] > 0,
                    f"Invalid section duration: {path}")
            require(section.get("items"), f"Empty section: {path}")
            for item in section["items"]:
                require(item.get("skill") == section["skill"], f"Wrong section skill: {item.get('id')}")
                activity(item)
        if assessment["kind"] == "mock":
            expected = {"listening": (39, 2100), "reading": (39, 3600),
                        "speaking": (3, 720), "writing": (3, 3600)}
            for section in sections:
                require((len(section["items"]), section["seconds"]) == expected[section["skill"]],
                        f"Incorrect full-format mock section: {path} {section['skill']}")
                if section["skill"] == "speaking":
                    require([(i.get("seconds"), i.get("prepSeconds", 0)) for i in section["items"]]
                            == [(120, 0), (330, 120), (270, 0)],
                            f"Incorrect speaking task/preparation windows: {path}")
                if section["skill"] == "writing":
                    require([(i.get("minWords"), i.get("maxWords")) for i in section["items"]]
                            == [(60, 120), (120, 150), (120, 180)],
                            f"Incorrect writing word ranges: {path}")
        assessment["html"] = render(assessment.pop("intro"))
        assessments.append(assessment)
    require(sorted(a["id"] for a in assessments) == sorted(
        ["diagnostic"] + [f"checkpoint-{n}" for n in range(1, 7)]
        + [f"mock-{n}" for n in range(1, 4)]
    ), "Need a diagnostic, six checkpoints, and three mocks")
    orientation = (source / "orientation.md").read_text(encoding="utf-8")
    text(orientation, "orientation")
    return {"id": "coach", "title": "French coach plan", "chapters": chapters,
            "assessments": assessments, "orientation": render(orientation)}


def write_coach(root, output, render):
    payload = build_coach(root, render)
    (output / "coach-content.js").write_text(
        "window.FRENCH_COACH_CONTENT = "
        + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    print(f"Generated French coach plan: {len(payload['chapters'])} chapters, "
          f"{sum(len(c['bank']) for c in payload['chapters'])} bank items, "
          f"{len(payload['assessments'])} assessments.")
