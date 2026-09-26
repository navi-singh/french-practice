# French Practice Course

This folder contains an original 17-chapter companion course organized around the progression in *Easy French Step-by-Step*. The exercises and explanations are newly written and do not reproduce the textbook.

**New to French? Start with [Chapter 0](chapter-00-getting-started/).** It teaches pronunciation, the alphabet, silent letters, nasal vowels, liaison, greetings, and your first phrases. Chapters 1-16 assume you can already read a French example aloud.

## How to use the course

Work through chapters in order. Later grammar depends on earlier forms.

For each chapter:

1. Learn one small unit.
2. Read every French example and its side-by-side English meaning.
3. Say it aloud, then cover the example and write it from memory.
4. Transform the sentence by changing its subject, number, tense, or polarity.
5. Complete the exercises without notes.
6. Correct by rule, not merely by answer.
7. Review after 1, 3, 7, and 30 days.

If a grammar term is unfamiliar at any point, look it up in the [glossary](chapter-00-getting-started/glossary.md), which defines every term used across all chapters in plain English.

Writing is valuable because it forces you to retrieve spelling, agreement, conjugation, and word order. It is most effective when paired with listening and speaking:

> Listen -> repeat -> cover -> write from memory -> check -> say the corrected form

## Phase 0: Before any grammar

| Chapter | Focus | Folder |
|---:|---|---|
| 0 | Pronunciation, alphabet, greetings, survival phrases, glossary | [Chapter 0](chapter-00-getting-started/) |

## Phase 1: Build present-tense foundations

| Chapter | Focus | Folder |
|---:|---|---|
| 1 | Nouns, articles, adjective agreement | [Chapter 1](chapter-01-nouns-adjectives/) |
| 2 | Être, avoir, subject pronouns, negation | [Chapter 2](chapter-02-etre-avoir-pronouns-negation/) |
| 3 | Calendar vocabulary, -er verbs, questions | [Chapter 3](chapter-03-dates-er-verbs-questions/) |
| 4 | Numbers, dates, time, regular -ir verbs | [Chapter 4](chapter-04-numbers-time-ir-verbs/) |
| 5 | Regular -re verbs and spelling changes | [Chapter 5](chapter-05-re-verbs-spelling-changes/) |
| 6 | Aller, near future, prepositions, faire | [Chapter 6](chapter-06-aller-prepositions-faire/) |
| 7 | High-frequency irregular verbs and infinitives | [Chapter 7](chapter-07-irregular-verbs-infinitives/) |
| 8 | More irregular verbs and relative pronouns | [Chapter 8](chapter-08-irregular-verbs-relative-pronouns/) |
| 9 | Partitives and object pronouns | [Chapter 9](chapter-09-partitives-object-pronouns/) |
| 10 | Possessives, demonstratives, comparisons, adverbs | [Chapter 10](chapter-10-possessives-demonstratives-comparisons-adverbs/) |

## Phase 2: Commands and pronominal verbs

| Chapter | Focus | Folder |
|---:|---|---|
| 11 | Expanded negatives, stressed pronouns, imperative | [Chapter 11](chapter-11-affirmatives-negatives-imperative/) |
| 12 | Pronominal verbs and present participle | [Chapter 12](chapter-12-pronominal-verbs-present-participle/) |

## Phase 3: Past, future, conditional, and subjunctive

| Chapter | Focus | Folder |
|---:|---|---|
| 13 | Passé composé | [Chapter 13](chapter-13-passe-compose/) |
| 14 | Imparfait, narration, double object pronouns | [Chapter 14](chapter-14-imparfait-past-narration-double-pronouns/) |
| 15 | Future, conditional, pluperfect, indefinites | [Chapter 15](chapter-15-future-conditional-indefinites/) |
| 16 | Present subjunctive | [Chapter 16](chapter-16-subjunctive/) |

## Recommended pacing

Complete Chapter 0 first. It takes 3-7 days and is not optional for a true beginner.

- **Light pace:** one chapter every two weeks
- **Standard pace:** one chapter per week
- **Intensive pace:** two chapters per week, only if your closed-book score stays above 85%

Do not measure progress only by pages completed. Advance when you can produce correct French without looking.

## Weekly routine

| Day | Work |
|---|---|
| 1 | Lesson unit 1 + handwriting |
| 2 | Recall unit 1 + lesson unit 2 |
| 3 | Lesson unit 3 + transformations |
| 4 | Lesson unit 4 + speaking |
| 5 | Exercises |
| 6 | Dictation + personal writing |
| 7 | Closed-book review and correction |

Record chapter status in [`progress-tracker.csv`](progress-tracker.csv).

## Mobile website

The generated website is in [`docs/`](docs/) and is ready for GitHub Pages. It includes:

- responsive chapter and document navigation;
- full-course search;
- local completion tracking;
- dark mode;
- tap-to-pronounce French examples;
- pronunciation of selected French text;
- a French voice picker, defaulting to a France French (`fr-FR`) voice;
- offline caching after the first visit.

Tap-to-pronounce pairs naturally with Chapter 0: tap any French phrase, listen, then imitate it immediately.

Speech uses the browser's built-in Web Speech API, so the available voices come from your device. If French sounds like it is being read by an English voice, no French voice is installed: add one in your system speech settings, or use Chrome, which ships a `Google français` voice. Pick the voice you prefer under **French voice** in the sidebar.

Regenerate the website after changing lesson files:

```bash
python3 build_site.py
```

Check the generator after changing it:

```bash
python3 -m unittest test_build_site
```

Check the pronunciation voice selection after changing `docs/app.js`:

```bash
node --test test_voice_preference.mjs
```

Preview it locally:

```bash
cd docs
python3 -m http.server 8765
```

Then open `http://localhost:8765`.
