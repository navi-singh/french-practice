(() => {
  const data = window.FRENCH_COACH_CONTENT;
  const key = "french-coach-plan-v1";
  const emptyState = () => ({ version: 1, completed: [], attempts: [], exposures: [], reflections: {}, errors: [] });
  let state;
  let storageBroken = false;
  let session = null;
  let timer = null;
  let taskTimer = null;
  let audioCancel = null;
  let recorder = null;
  let stream = null;
  const recordingURLs = new Set();
  let viewToken = 0;
  let recordingToken = 0;

  const esc = (value) => escapeHtml(value);
  const link = (path, title) => `<a href="#/coach/${path}">${esc(title)}</a>`;
  const button = (id, title) => `<button type="button" id="${id}">${esc(title)}</button>`;
  const field = (id, title, options) => `<label for="${id}">${esc(title)}</label>
    <select id="${id}">${options.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join("")}</select>`;
  const skills = ["listening", "reading", "speaking", "writing"];
  const reviewCriteria = {
    listening: ["Identify the final decision, speaker and purpose.", "Preserve conditions, exceptions and uncertainty.", "Explain the evidence and why a tempting alternative is wrong."],
    reading: ["Identify who claims what and the intended reader/action.", "Track scope, deadlines, references and implied meaning.", "Do not turn an example, proposal or correlation into a proven general fact."],
    speaking: ["Answer the exact question with relevant development and examples.", "Respond to follow-ups, qualify a claim and repair missing language.", "Review intelligibility, fluency, organization and grammatical control separately."],
    writing: ["Fulfil every instruction and use a consistent reader/register.", "Develop reasons and preserve source meanings without copying or distortion.", "Check paragraph logic, references, tense, agreement and every required word range."],
  };
  const skillChapters = {
    listening: "1, 5, 7, 18", reading: "3, 9, 16, 17",
    speaking: "2, 3, 19, 20, 21, 22", writing: "4, 10, 16, 23, 24",
  };

  function load() {
    if (state) return;
    try {
      const raw = localStorage.getItem(key);
      state = raw ? JSON.parse(raw) : emptyState();
      if (state && !Object.hasOwn(state, "exposures")) {
        state.exposures = Array.isArray(state.attempts)
          ? state.attempts.map((a) => ({ owner: a.owner, skill: a.skill, date: a.started || a.date, finished: true }))
          : [];
      }
      if (state.version !== 1 || !Array.isArray(state.completed)
          || !state.completed.every((x) => typeof x === "string")
          || !Array.isArray(state.attempts) || !Array.isArray(state.errors)
          || !Array.isArray(state.exposures) || !state.exposures.every((x) => x
            && typeof x.owner === "string" && skills.includes(x.skill)
            && typeof x.date === "string" && typeof x.finished === "boolean")
          || !state.attempts.every((x) => x && typeof x.owner === "string"
            && skills.includes(x.skill) && Array.isArray(x.items) && typeof x.date === "string"
            && x.items.every((i) => i && typeof i.id === "string"
              && ["choice", "production"].includes(i.type)
              && typeof i.attempted === "boolean"
              && (i.self === null || typeof i.self === "string")))
          || !state.errors.every((x) => x && typeof x.note === "string" && skills.includes(x.skill)
            && (x.date === undefined || typeof x.date === "string"))
          || !state.reflections || typeof state.reflections !== "object"
          || Array.isArray(state.reflections)) throw new Error("Invalid saved coach records");
    } catch (error) {
      state = emptyState();
      storageBroken = true;
      storageWarning("French coach plan storage could not be read. Its saved data is untouched. Open Coach progress to export or reset only this track.");
    }
  }

  function save() {
    if (storageBroken) {
      storageWarning("Coach progress is only in memory. Open Coach progress to export or reset unreadable storage.");
      return false;
    }
    try {
      localStorage.setItem(key, JSON.stringify(state));
      const warning = document.querySelector("#storage-warning");
      if (warning?.textContent.startsWith("Coach saving failed.")) warning.hidden = true;
      return true;
    } catch (error) {
      storageWarning("Coach saving failed. Export your current progress before leaving; enable site storage or free space, then try again.");
      return false;
    }
  }

  function frame(title, eyebrow = "French coach plan") {
    main.innerHTML = `<article class="content-card coach">
      <header class="document-header"><div class="eyebrow">${esc(eyebrow)}</div>
      <h1>${esc(title)}</h1><p>Beginner to TCF Canada · NCLC 8 is a goal, not a course certificate.</p></header>
      <nav class="coach-toolbar" aria-label="Coach tools">
        ${link("", "Plan")}${link("orientation", "Start here")}${link("assessment/diagnostic", "Diagnostic")}
        ${link("target", "NCLC 8 route")}
        ${link("progress", "Progress & error log")}${link("assessments", "Checkpoints & practice sets")}
      </nav><div id="coach-body"></div></article>`;
    return main.querySelector("#coach-body");
  }

  function home() {
    const body = frame("A steady route to four-skill French");
    body.innerHTML = `<p>Start at zero, or use the diagnostic to find gaps. Work across listening, reading,
      speaking and writing from the beginning. Keep the original course available through the track selector.</p>
      <p class="coach-notice"><strong>Target: NCLC 8 in all four abilities.</strong> English teaching stays available throughout.
      Chapters 17–24 add 32 fresh stretch activities for inference, responsive interaction, argument and accurate synthesis.
      ${link("target", "Follow the NCLC 8 route")} · Practice is unofficial and does not predict your score.</p>
      <div class="coach-notice"><strong>Daily core: 4 hours, 6 days a week</strong>
      <p>45 min retrieval/pronunciation + 45 listening + 40 reading + 45 speaking + 45 writing
      + 20 correction and spaced review. Take breaks; split blocks across the day.
      Optional extra study reinforces a weak skill. Day 7 can be rest.</p>
      <p>Review a small bank subset after 1, 3, 7, 14 and 30 days. Retrieve first, reveal,
      correct, then use the phrase in a fresh situation. Timing is guidance, not a universal formula.</p></div>
      <p>${link("orientation", "Read the complete study plan")} · ${link("chapter-01", "I'm a complete beginner: start Chapter 1")}</p>
      ${[1, 2, 3, 4, 5, 6].map((phase) => `<section><h2>Phase ${phase} · ${[
        "Foundations", "Everyday transactions", "Past narration", "Planning and reasoning",
        "Comprehension and argumentation", "TCF production",
      ][phase - 1]}</h2><div class="home-grid">${data.chapters.filter((c) => c.phase === phase).map((c) =>
        `<a class="home-card" href="#/coach/${c.id}"><span>Chapter ${c.number}</span><h3>${esc(c.title)}</h3>
        <small>${c.bank.length} mixed-use sentences · four-skill practice</small>
        <p class="hint">${["lesson", "bank", "practice"].filter((part) => state.completed.includes(`${c.id}/${part}`)).length}/3 study sections marked</p></a>`).join("")}</div>
        <p>${link(`assessment/checkpoint-${phase}`, `Phase ${phase} checkpoint & remediation`)}</p></section>`).join("")}
      <p class="coach-notice">All listening here is original browser-generated speech, not authentic exam audio.
      Voices may use device-provider network services. Text is cached best effort; speech and recording are device-dependent.
      Only an official examination establishes your scores.</p>`;
  }

  function navigation(filter = "") {
    if (!data) {
      chapterList.textContent = "Coach content could not load. Reload online to refresh cached assets.";
      progressSummary.textContent = "Coach progress unavailable until its content loads.";
      return;
    }
    load();
    const needle = filter.trim().toLocaleLowerCase();
    const matches = data.chapters.filter((c) =>
      !needle || `${c.title} ${c.html.replace(/<[^>]+>/g, " ")} ${c.bank.map((b) => `${b.fr} ${b.en}`).join(" ")}`
        .toLocaleLowerCase().includes(needle));
    chapterList.innerHTML = `<p class="hint">Searching French coach plan only</p>
      ${link("", "Coach home")}${matches.map((c) => `<a class="chapter-link ${location.hash.includes(c.id) ? "active" : ""}"
      href="#/coach/${c.id}"><span class="chapter-number">${c.number}</span>
      <span class="chapter-title">${esc(c.title)}</span>
      <small aria-label="Study sections marked">${["lesson", "bank", "practice"].filter((part) => state.completed.includes(`${c.id}/${part}`)).length}/3</small></a>`).join("") || "<p>No matching coach chapters.</p>"}`;
    const total = data.chapters.length * 3;
    const count = data.chapters.reduce((n, c) =>
      n + ["lesson", "bank", "practice"].filter((part) => state.completed.includes(`${c.id}/${part}`)).length, 0);
    progressSummary.innerHTML = `<strong>Coach: ${count}/${total} study sections marked</strong>
      <p class="hint">Completion is not mastery or an exam score.</p>`;
  }

  function completion(id, host) {
    const control = document.createElement("button");
    control.className = "completion-button";
    const sync = () => {
      const done = state.completed.includes(id);
      control.textContent = done ? "Marked studied — undo" : "Mark this section studied";
      control.setAttribute("aria-pressed", String(done));
    };
    control.addEventListener("click", () => {
      state.completed = state.completed.includes(id)
        ? state.completed.filter((x) => x !== id) : [...state.completed, id];
      save();
      sync();
      navigation(search.value);
    });
    sync();
    host.append(control);
  }

  function chapterView(chapter, tab = "lesson") {
    const body = frame(chapter.title, `French coach plan · Phase ${chapter.phase} · Chapter ${chapter.number}`);
    body.innerHTML = `<nav class="document-tabs" aria-label="Chapter sections">
      ${[["lesson", "Learn & review"], ["bank", `${chapter.bank.length}-sentence bank`], ["practice", "Four-skill practice"]]
        .map(([id, title]) => `<a class="document-tab ${tab === id ? "active" : ""}" href="#/coach/${chapter.id}/${id}">${title}</a>`).join("")}
      </nav><div id="chapter-panel"></div>`;
    const panel = main.querySelector("#chapter-panel");
    if (tab === "bank") {
      bankView(chapter, panel);
    } else if (tab === "practice") {
      panel.innerHTML = `<p>Try before revealing. Objective checks and self-assessments are different records.
        Speaking models are examples, not a responsive examiner or the only correct response.
        ${chapter.number >= 17 ? "Choose supported learning or a French-only run before starting." : "Use English instructions to build the foundations before French-only tasks in Chapters 17–24."}</p>
        ${[false, true].map((stretch) => {
          const items = chapter.activities.map((a, i) => ({ a, i })).filter(({ a }) => !!a.stretch === stretch);
          return items.length ? `<h2>${stretch ? "NCLC 8 stretch · fresh transfer tasks" : "Core practice"}</h2>
            ${stretch ? "<p>These new prompts target greater independence, not a calibrated NCLC level. Prior study completion does not mark them mastered.</p>" : ""}
            <div class="coach-activity-grid">${items.map(({ a, i }) =>
              `<button type="button" data-activity="${i}"><small>${esc(a.skill)}</small><strong>${esc(a.title)}</strong></button>`).join("")}</div>` : "";
        }).join("")}
        <div id="activity-host"></div>`;
      panel.querySelectorAll("[data-activity]").forEach((b) => b.addEventListener("click", () => {
        cleanup();
        const item = chapter.activities[Number(b.dataset.activity)];
        begin(`${chapter.id}${item.stretch ? "-stretch" : ""}`, { id: item.id, skill: item.skill, seconds: item.seconds || 600, items: [item] },
          false, panel.querySelector("#activity-host"));
      }));
    } else {
      panel.innerHTML = `<section class="lesson-body" lang="en">${chapter.html}</section>
        ${chapter.frenchHtml ? `<details><summary>Optional French reading: ${esc(chapter.frenchTitle)}</summary>
          <section class="lesson-body" lang="fr">${chapter.frenchHtml}</section></details>` : ""}`;
      bindSpeakableExamples();
    }
    completion(`${chapter.id}/${["bank", "practice"].includes(tab) ? tab : "lesson"}`, panel);
  }

  function bankView(chapter, host) {
    let revealAnswers = [];
    host.innerHTML = `<p>All ${chapter.bank.length} sentences are on this page. Try each prompt, then click its answer to reveal it.
      A model is not the only natural answer.
      Pronunciation uses your French device voice; it is not pronunciation grading.</p>
      <div class="coach-fields">${field("bank-mode", "Practice mode", [
        ["purpose", "Use each item's practice purpose"], ["translation", "English to French recall"],
        ["listening", "Listen before reading"], ["comprehension", "Read, then recall the meaning"],
        ["oral-response", "Respond aloud"],
      ])}</div>
      <div class="coach-toolbar">${button("bank-show-all", "Reveal all answers")}${button("bank-hide-all", "Hide all answers")}</div>
      <div id="bank-list" class="coach-bank-list"></div>`;
    function display() {
      audioCancel?.();
      revealAnswers = [];
      const selected = host.querySelector("#bank-mode").value;
      const lateChapter = chapter.number >= 17;
      const purposePrompt = {
        translation: "Recall a natural French version of the English meaning.",
        retrieval: "Express this meaning in French without reading the model.",
        listening: "Listen first. Explain the meaning and any condition or important detail before revealing.",
        comprehension: "Read the French. Explain its meaning, including restrictions and uncertainty, before revealing.",
        "oral-response": "Give a natural reply aloud using this meaning; vary details without reading the French model.",
        transformation: "Transform the input into a different natural French formulation. Use the target meaning as a guide.",
      };
      const list = host.querySelector("#bank-list");
      list.innerHTML = chapter.bank.map((item, index) => {
        const mode = selected === "purpose" ? item.purpose : selected;
        const prompt = selected === "purpose" ? (lateChapter ? purposePrompt[mode] : item.prompt) : {
          translation: "Recall a natural French version of this meaning.",
          listening: "Listen without reading French. Explain the meaning or a key detail.",
          comprehension: "Read French, then recall its meaning before revealing it.",
          "oral-response": "Use this meaning in a reply aloud. Vary the details without reading the French model.",
        }[mode];
        const revealLabel = mode === "comprehension" ? "Reveal meaning & cue"
          : mode === "listening" ? "Reveal transcript, meaning & cue"
            : mode === "transformation" ? "Reveal model transformation & cue" : "Reveal French answer & cue";
        return `<section class="coach-bank-row" aria-labelledby="bank-heading-${index}">
        <div class="coach-bank-prompt"><h2 id="bank-heading-${index}">${index + 1}. <span>${esc(mode)}</span></h2>
        <p lang="en">${esc(prompt)}</p>
        ${["translation", "retrieval", "oral-response"].includes(mode) ? `<p><strong>Meaning/goal cue:</strong> ${esc(item.en)}</p>` : ""}
        ${mode === "listening" ? `<button type="button" class="bank-listen" aria-label="Listen to sentence ${index + 1} in French">Listen in French</button>
          <p class="bank-audio-status" role="status"></p>` : ""}
        ${mode === "comprehension" ? `<p><code class="speakable" lang="fr">${esc(item.fr)}</code></p>` : ""}
        ${mode === "transformation" ? `<p>Transform this input:</p><p><code class="speakable" lang="fr">${esc(item.source)}</code></p>
          <p><strong>Target meaning:</strong> ${esc(item.en)}</p>` : ""}
        </div><details class="bank-reveal"><summary aria-label="${revealLabel} for sentence ${index + 1}">${revealLabel}</summary>
          <div class="bank-answer"></div></details></section>`;
      }).join("");
      list.querySelectorAll(".coach-bank-row").forEach((card, index) => {
        const item = chapter.bank[index];
        const mode = selected === "purpose" ? item.purpose : selected;
        card.querySelector(".bank-listen")?.addEventListener("click", (event) =>
          play(item.fr, false, event.currentTarget, (ok, message) => {
            const status = card.querySelector(".bank-audio-status");
            if (status) status.textContent = message;
          }));
        const disclosure = card.querySelector(".bank-reveal");
        const answer = card.querySelector(".bank-answer");
        const populate = () => {
          if (answer.childElementCount) return false;
          answer.innerHTML = `${mode !== "comprehension" ? `<p><code class="speakable" lang="fr">${esc(item.fr)}</code></p>` : ""}
          <p lang="en">${esc(item.en)}</p>
          ${lateChapter ? `<p class="hint" lang="en">Check the model against your attempt: preserve who acts, time, conditions and scope.
            Use the English lesson to review the language point.</p>
            <details><summary>Original French question & language cue</summary>
              <p lang="fr">${esc(item.prompt)}</p><p class="hint" lang="fr">${esc(item.cue)}</p></details>`
            : `<p class="hint">${esc(item.cue)}</p>`}
          <p class="hint">Self-report, not objective marking:</p>
          <div class="coach-toolbar"><button type="button" data-rating="retrieved independently">Retrieved independently</button>
            <button type="button" data-rating="needs review">Needs review</button></div>
          <p class="bank-rating" role="status"></p>`;
          const rating = answer.querySelector(".bank-rating");
          const previous = state.reflections[item.id];
          if (previous) rating.textContent = `Last report: ${previous.rating} (${previous.skill}).`;
          answer.querySelectorAll("[data-rating]").forEach((control) => control.addEventListener("click", () => {
            state.reflections[item.id] = { skill: mode, rating: control.dataset.rating, date: new Date().toISOString() };
            rating.textContent = save() ? `Saved: ${control.dataset.rating}.` : "Not saved to this device; export current progress before leaving.";
          }));
          return true;
        };
        disclosure.addEventListener("toggle", () => {
          if (disclosure.open && populate()) bindSpeakableExamples();
        });
        disclosure.querySelector("summary").addEventListener("click", () => {
          if (!disclosure.open && populate()) bindSpeakableExamples();
        });
        revealAnswers.push(populate);
      });
      bindSpeakableExamples();
    }
    host.querySelector("#bank-mode").addEventListener("change", display);
    for (const [id, open] of [["bank-show-all", true], ["bank-hide-all", false]]) {
      host.querySelector(`#${id}`).addEventListener("click", () => {
        if (open) {
          revealAnswers.forEach((populate) => populate());
          bindSpeakableExamples();
        }
        host.querySelectorAll(".coach-bank-row").forEach((card) => {
          card.querySelector(".bank-reveal").open = open;
        });
      });
    }
    display();
  }

  function assessments() {
    const body = frame("Check your skills, not just your chapter count");
    body.innerHTML = `<p>No locks, automatic NCLC conversion or pass prediction.
      Repeating a set is useful review, but memorized improvement is not fresh evidence.</p>
      <div class="home-grid">${data.assessments.map((a) =>
        `<a class="home-card" href="#/coach/assessment/${a.id}"><small>${esc(a.kind)}</small><h2>${esc(a.title)}</h2></a>`).join("")}</div>`;
  }

  function assessmentView(assessment) {
    const body = frame(assessment.title);
    body.innerHTML = `<section class="lesson-body">${assessment.html}</section>
      <p class="coach-notice">Original, unofficial practice. Synthetic audio cannot establish readiness for authentic
      exam listening. Objective raw counts are not TCF/NCLC scores. Complete all four sections for full-format practice;
      section breaks and manual solo role play are practice conveniences, not official exam conditions.
      ${assessment.kind !== "mock" ? "Task instructions/options now use French; earlier English-supported records are retained but are not directly comparable." : ""}</p>
      <div class="coach-activity-grid">${assessment.sections.map((section, i) => {
        const count = state.exposures.filter((a) => a.owner === assessment.id && a.skill === section.skill).length;
        return `<button type="button" data-section="${i}"><strong>${esc(section.title)}</strong>
          <small>${section.items.length} tasks/questions · ${Math.round(section.seconds / 60)} min · ${count ? `repeat after ${count} recorded start(s), including unfinished` : "not started on this device"}</small></button>`;
      }).join("")}</div><div id="activity-host"></div>`;
    bindSpeakableExamples();
    body.querySelectorAll("[data-section]").forEach((control) => control.addEventListener("click", () => {
      cleanup();
      begin(assessment.id, assessment.sections[Number(control.dataset.section)], true, body.querySelector("#activity-host"));
    }));
  }

  function begin(owner, section, exam, host) {
    const repeats = state.exposures.filter((a) => a.owner === owner && a.skill === section.skill).length;
    const offersFrenchOnly = !exam && section.items.every((item) => item.lang === "fr");
    host.innerHTML = `<h2>${esc(section.title || section.items[0].title)}</h2>
      <p>${exam ? "Exam-style: normal-speed, one successful audio play per item; no transcript or marking until you finish."
        : `Learning mode permits replay and slower speech. Attempt first, then request English guidance if available; its use is recorded.
          ${offersFrenchOnly ? "French-only practice withholds assistance until review." : "This foundation activity uses English instructions; French-only tasks begin in Chapters 17–24."}`}</p>
      ${offersFrenchOnly ? `<div class="coach-fields">${field("attempt-mode", "Practice conditions", [
        ["learning", "Supported learning"], ["independent", "French-only practice · no help until review"],
      ])}</div>` : ""}
      <p>${repeats ? `Repeat attempt ${repeats + 1}. Previous starts, including unfinished attempts, can inflate performance.` : "First recorded start on this device."}</p>
      ${section.skill === "speaking" && !owner.startsWith("mock-") ? "<p>The section clock is an overall maximum. Individual task timers are suggested practice windows; you control when to move between tasks.</p>" : ""}
      <p>Starting another section or navigating away discards this unfinished attempt and unsaved recordings.
      Download any recording before continuing.</p>${button("start-attempt", "Start timed attempt")}`;
    host.querySelector("#start-attempt").addEventListener("click", () => {
      const frenchOnly = exam || (offersFrenchOnly && host.querySelector("#attempt-mode").value === "independent");
      const exposure = { owner, skill: section.skill, date: new Date().toISOString(), finished: false };
      state.exposures.push(exposure);
      save();
      session = { owner, section, exam: frenchOnly, host, index: 0, responses: {}, played: new Set(), supportUsed: new Set(),
        timedSpeaking: exam && owner.startsWith("mock-") && section.skill === "speaking",
        recordings: [], deadline: Date.now() + section.seconds * 1000, repeats,
        started: exposure.date, exposure, finished: false };
      lastSelectedText = "";
      getSelection()?.removeAllRanges();
      if ("speechSynthesis" in window) speechSynthesis.cancel();
      document.querySelector(".speak-bar").hidden = frenchOnly;
      timer = setInterval(() => {
        if (!session || session.finished) return;
        updateClock();
        if (Date.now() >= session.deadline) finish(true);
      }, 500);
      renderAttempt();
    });
  }

  function updateClock() {
    const clock = session?.host.querySelector("#attempt-clock");
    if (!clock) return;
    const seconds = Math.max(0, Math.ceil((session.deadline - Date.now()) / 1000));
    clock.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")} remaining`;
  }

  function renderAttempt() {
    const current = session;
    const item = current.section.items[current.index];
    const contentLang = item.lang || (current.owner.startsWith("mock-")
      || (current.owner.startsWith("chapter-") && Number(current.owner.slice(8)) >= 17) ? "fr" : "en");
    const response = current.responses[item.id] || {};
    const host = current.host;
    host.innerHTML = `<section class="coach-attempt"><p id="attempt-clock" role="timer" aria-live="off"></p>
      <p>${esc(current.section.skill)} · ${current.index + 1}/${current.section.items.length}</p>
      <h2>${current.exam ? `${item.type === "choice" ? "Question" : "Tâche"} ${current.index + 1}` : esc(item.title)}</h2>
      <p lang="${contentLang}">${esc(item.prompt)}</p>
      ${!current.exam && item.support ? `<p class="hint">Choose an answer or mark your production attempted before requesting English guidance.</p>
        ${button("english-guidance", "I've tried — show English task guidance")}
        <div id="english-guidance-text"></div>` : ""}
      ${item.passage ? `<blockquote lang="fr">${esc(item.passage)}</blockquote>` : ""}
      ${item.script ? `<p>Synthetic French voice · ${current.exam ? "normal speed, one delivered play" : "your selected learning speed"}</p>
        ${button("listen-task", current.played.has(item.id) && current.exam ? "Audio already delivered" : "Play listening audio")}
        ${!current.exam ? `${button("listen-slow", "Play slower")}<details><summary>Learning transcript (reveal deliberately)</summary><p lang="fr">${esc(item.script)}</p></details>` : ""}
        <p id="audio-status" role="status">${current.played.has(item.id) ? "Audio delivered." : "Audio not delivered yet. A failed or interrupted play does not count."}</p>` : ""}
      ${item.type === "choice" ? `<fieldset><legend>Choose one answer</legend>${item.options.map((option, i) =>
        `<label class="coach-option" lang="${contentLang}"><input type="radio" name="coach-answer" value="${i}" ${response.choice === i ? "checked" : ""}> ${esc(option)}</label>`).join("")}</fieldset>`
        : `<p>${item.skill === "writing" ? `${item.minWords || 0}–${item.maxWords || "unlimited"} words recommended for this task. `
          : "Speak aloud before looking at a model. Optional recording is local; it is never uploaded. "}
          Word counts split on whitespace; apostrophe/hyphen groups count as one. This aid may differ from examiner judgments.</p>
          ${item.skill === "speaking" ? `<p>${item.seconds ? `Task window: ${item.seconds} seconds${item.prepSeconds ? `, including ${item.prepSeconds} seconds preparation` : ", no dedicated preparation"}.` : "Use the section clock."}
            This solo model cannot react like an examiner.</p><p id="task-status" role="status"></p>
            <p id="task-clock" role="timer" aria-live="off"></p>${button("task-timer", "Start this task's timing")}
            <div class="recording-tools"></div>` : ""}
          <label for="production-response">${item.skill === "writing" ? "Your written response" : "Optional notes or transcript (do the speaking aloud)"}</label>
          <textarea id="production-response" lang="fr" spellcheck="false" autocorrect="off" autocomplete="off" autocapitalize="off" rows="9">${esc(response.text || "")}</textarea>
          <p id="word-count"></p><label><input id="production-done" type="checkbox" ${response.done ? "checked" : ""}>
          I attempted this task ${item.skill === "speaking" ? "aloud" : "in writing"} before revealing its model.</label>`}
      <div class="coach-toolbar">${button("attempt-prev", "Previous")}${button("attempt-next", "Next")}
      ${button("attempt-finish", "Finish attempt & review")}</div>
      <p class="hint">Unanswered tasks are recorded as unattempted, not as mastery. Leaving loses unfinished work.</p></section>`;
    updateClock();
    const guidance = host.querySelector("#english-guidance");
    const attempted = () => {
      const saved = current.responses[item.id] || {};
      return saved.choice !== undefined || !!saved.done;
    };
    if (guidance) {
      const reveal = () => {
        current.supportUsed.add(item.id);
        host.querySelector("#english-guidance-text").innerHTML =
          `<p lang="en">${esc(item.support.prompt)}</p><p class="hint">English support used: this is supported learning, not independent evidence.</p>`;
        guidance.disabled = true;
      };
      guidance.disabled = !attempted();
      guidance.addEventListener("click", reveal);
      if (current.supportUsed.has(item.id)) reveal();
    }
    if (item.script) {
      const listen = host.querySelector("#listen-task");
      listen.disabled = current.exam && current.played.has(item.id);
      const listenTo = (control, slow) => {
        if (current.exam) host.querySelector("#attempt-next").disabled = true;
        play(item.script, current.exam, control, (success, message) => {
          if (session !== current || current.finished) return;
          const status = host.querySelector("#audio-status");
          if (status) status.textContent = message;
          if (success) current.played.add(item.id);
          listen.disabled = current.exam && current.played.has(item.id);
          if (current.exam) {
            host.querySelector("#attempt-next").disabled = current.index === current.section.items.length - 1;
          }
        }, slow);
      };
      listen.addEventListener("click", () => listenTo(listen, false));
      host.querySelector("#listen-slow")?.addEventListener("click", (event) => listenTo(event.currentTarget, true));
    }
    host.querySelectorAll('input[name="coach-answer"]').forEach((input) => input.addEventListener("change", () => {
      current.responses[item.id] = { choice: Number(input.value) };
      if (guidance && !current.supportUsed.has(item.id)) guidance.disabled = false;
    }));
    const text = host.querySelector("#production-response");
    if (text) {
      const update = () => {
        const words = text.value.trim() ? text.value.trim().split(/\s+/u).length : 0;
        host.querySelector("#word-count").textContent = `${words} words${item.minWords && words < item.minWords ? " — below range" : ""}${item.maxWords && words > item.maxWords ? " — above range" : ""}`;
        current.responses[item.id] = { text: text.value, done: host.querySelector("#production-done").checked };
        if (guidance && !current.supportUsed.has(item.id)) guidance.disabled = !attempted();
      };
      text.addEventListener("input", update);
      host.querySelector("#production-done").addEventListener("change", update);
      update();
      if (item.skill === "speaking") {
        recording(host.querySelector(".recording-tools"));
        host.querySelector("#task-timer").addEventListener("click", (event) => {
          event.currentTarget.disabled = true;
          const start = current.timedSpeaking
            ? current.deadline - current.section.seconds * 1000
              + current.section.items.slice(0, current.index).reduce((sum, a) => sum + (a.seconds || 120), 0) * 1000
            : Date.now();
          const total = item.seconds || 120;
          const prep = item.prepSeconds || 0;
          let lastPhase = "";
          const tick = () => {
            const elapsed = (Date.now() - start) / 1000;
            const preparing = elapsed < prep;
            const left = Math.max(0, Math.ceil((preparing ? prep : total) - elapsed));
            const clock = host.querySelector("#task-clock");
            const phase = preparing ? "Preparation time started." : "Speaking time started.";
            if (phase !== lastPhase) {
              const status = host.querySelector("#task-status");
              if (status) status.textContent = phase;
              lastPhase = phase;
            }
            if (clock) clock.textContent = `${preparing ? "Prepare" : "Speak"}: ${left} seconds`;
            if (elapsed >= total) {
              clearInterval(taskTimer);
              if (current.timedSpeaking) {
                preserveRecording();
                if (current.index < current.section.items.length - 1) {
                  current.index += 1;
                  renderAttempt();
                } else {
                  finish(true);
                }
              } else {
                stopRecording();
                if (clock) clock.textContent = "Task time ended. Continue to the next task.";
                const status = host.querySelector("#task-status");
                if (status) status.textContent = "Task time ended.";
              }
            }
          };
          taskTimer = setInterval(tick, 500);
          tick();
        });
      }
    }
    host.querySelector("#attempt-prev").disabled = current.index === 0
      || current.timedSpeaking || (current.exam && current.section.skill === "listening");
    host.querySelector("#attempt-next").disabled = current.index === current.section.items.length - 1;
    if (current.timedSpeaking) {
      host.querySelector("#attempt-next").disabled = true;
    }
    for (const [id, delta] of [["attempt-prev", -1], ["attempt-next", 1]]) {
      host.querySelector(`#${id}`).addEventListener("click", () => {
        preserveRecording();
        clearInterval(taskTimer);
        current.index += delta;
        renderAttempt();
      });
    }
    host.querySelector("#attempt-finish").addEventListener("click", () => finish(false));
    if (current.timedSpeaking) host.querySelector("#task-timer")?.click();
    host.tabIndex = -1;
    host.focus({ preventScroll: true });
  }

  function play(text, exam, control, done, slow = false) {
    audioCancel?.();
    const token = viewToken;
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      const message = "Speech unavailable. Install/use a browser with a French voice. You may study the transcript outside exam mode; this is not a valid listening attempt.";
      showToast(message);
      done(false, message);
      return;
    }
    control.disabled = true;
    control.textContent = "Preparing French audio…";
    let finished = false;
    let started = false;
    let watchdog;
    let utterance;
    const settle = (ok, message) => {
      if (finished) return;
      finished = true;
      clearTimeout(watchdog);
      audioCancel = null;
      control.disabled = false;
      control.textContent = ok && exam ? "Audio delivered" : "Play listening audio";
      if (token === viewToken) {
        done(ok, message);
        if (!ok) showToast(message);
      }
    };
    audioCancel = () => {
      settle(false, "Audio interrupted. No delivered play recorded; retry this item.");
      speechSynthesis.cancel();
    };
    whenVoicesReady(() => {
      if (finished || token !== viewToken) return;
      const voice = preferredVoice();
      if (!voice) {
        settle(false, "No French voice available. Install a French device voice and retry; listening is not completed.");
        return;
      }
      try {
        utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = voice;
        utterance.lang = voice.lang;
        utterance.rate = exam ? 1 : speechRate(slow ? Math.round(speechRate() * 100) / 2 : undefined);
      } catch (error) {
        settle(false, "The French voice could not be prepared. Refresh device voices and retry; listening has not counted.");
        return;
      }
      utterance.onstart = () => {
        started = true;
        control.textContent = "Playing…";
        clearTimeout(watchdog);
        watchdog = setTimeout(() => {
          settle(false, "Audio did not finish. Restart this item; it has not counted.");
          speechSynthesis.cancel();
        }, Math.max(30000, text.length * 180 / utterance.rate));
      };
      utterance.onend = () => settle(started, started
        ? "Audio delivered. Answer from what you heard."
        : "Audio ended without starting. Retry; it has not counted.");
      utterance.onerror = () => settle(false, "Audio failed or was cancelled. Retry; it has not counted.");
      speechSynthesis.cancel();
      try {
        watchdog = setTimeout(() => {
          settle(false, "Audio could not start. Check your device voice and retry.");
          speechSynthesis.cancel();
        }, 15000);
        speechSynthesis.speak(utterance);
      } catch (error) {
        settle(false, "Speech failed to start. Check your device voice and retry.");
      }
    });
  }

  function finish(expired) {
    const current = session;
    if (!current || current.finished) return;
    current.finished = true;
    current.exposure.finished = true;
    clearInterval(timer);
    clearInterval(taskTimer);
    preserveRecording();
    const rows = current.section.items.map((item) => {
      const response = current.responses[item.id] || {};
      const delivered = !item.script || current.played.has(item.id);
      return { id: item.id, type: item.type, attempted: item.type === "choice" ? response.choice !== undefined : !!response.done,
        validAudio: delivered, correct: item.type === "choice" && delivered && response.choice === item.answer,
        choice: response.choice, text: response.text || "", self: null, supportUsed: current.supportUsed.has(item.id) };
    });
    const result = { owner: current.owner, skill: current.section.skill, date: new Date().toISOString(),
      started: current.started, repeat: current.repeats > 0, expired, mode: current.exam ? "french-only" : "learning", items: rows };
    state.attempts.push(result);
    save();
    document.querySelector(".speak-bar").hidden = false;
    const objective = rows.filter((r) => r.type === "choice");
    current.host.innerHTML = `<h2>${expired ? "Time ended — review" : "Attempt review"}</h2>
      <p>${objective.length ? `${objective.filter((r) => r.correct).length}/${objective.length} correct valid objective answers;`
        : "Production is self-assessed only; no automatic score."}
      ${rows.filter((r) => r.attempted).length}/${rows.length} tasks attempted.
      ${rows.filter((r) => !r.validAudio).length} item(s) without delivered audio are invalid for listening evidence.
      No NCLC/TCF score is calculated.</p>
      <p>${current.repeats ? "Repeat: useful retrieval practice, not fresh readiness evidence." : "First recorded exposure on this device only."}</p>
      <p>${current.exam ? "French-only practice conditions." : "Learning conditions: replay/transcript access was available."}
        ${rows.filter((r) => r.supportUsed).length} task(s) used English guidance. These are not independent NCLC evidence.</p>
      <details><summary>English self-review: work toward NCLC 8</summary><ul>
        ${reviewCriteria[current.section.skill].map((criterion) => `<li>${esc(criterion)}</li>`).join("")}</ul>
        <p>Check each criterion separately on a fresh prompt. This checklist is not an examiner rubric or a score conversion.
        ${link("target", "Review the complete NCLC 8 route")}</p></details>
      <p>${esc(remediation(current.section.skill, current.owner))}</p>
      ${current.owner === "diagnostic" ? `<div class="coach-notice"><strong>Suggested study route (not a level score)</strong>
        <p>This diagnostic now uses French task instructions/options. Earlier records from English-supported versions are not directly comparable.
        Difficulty decoding instructions is a reason to use the beginner route, not a predicted NCLC result.</p>
        <p>${rows.some((r) => r.type === "choice" && (!r.correct || !r.validAudio))
          ? "There are comprehension gaps in this skill. Start with Chapters 1–4 and the specific missed details; use the first checkpoint before deciding to move faster."
          : rows.some((r) => r.type === "choice")
            ? "These objective items were handled successfully. Try the Phase 1 checkpoint and a fresh spontaneous response before considering a faster route through Chapters 1–4."
            : "Compare your attempted response with every rubric criterion. If it needed substantial support, start with Chapters 1–4. If independent, try the Phase 1 checkpoint before skipping."}</p>
        <p>Make this decision separately for all four skills; strong reading does not establish speaking readiness.
        All chapters stay available. ${link("chapter-01", "Use the zero-beginner route")}</p></div>` : ""}
      ${current.section.items.map((item, i) => {
        const row = rows[i];
        return `<section class="coach-feedback"><h3>${i + 1}. ${esc(item.title)}</h3>
          <p>${row.attempted ? "Attempted" : "Unattempted"}${!row.validAudio ? " · audio not delivered: invalid listening evidence" : ""}</p>
          ${item.support ? `<details><summary>English task guidance${row.supportUsed ? " · used during learning" : " · review only"}</summary>
            <p lang="en">${esc(item.support.prompt)}</p></details>` : ""}
          ${item.script ? `<details><summary>French listening transcript</summary><p lang="fr">${esc(item.script)}</p></details>` : ""}
          ${item.type === "choice" ? `<p>Your answer: ${row.choice === undefined ? "none" : esc(item.options[row.choice])}</p>
            <p><strong>${row.correct ? "Correct" : "Review"}:</strong> ${esc(item.options[item.answer])}</p>
            ${item.support?.explanation ? `<p lang="en">${esc(item.support.explanation)}</p>
              ${item.explanation !== item.support.explanation ? `<details><summary>French explanation</summary><p lang="fr">${esc(item.explanation)}</p></details>` : ""}`
              : `<p>${esc(item.explanation)}</p>`}`
            : `<p>Your saved response/notes:</p><blockquote>${esc(row.text || "(Spoken or no text recorded)")}</blockquote>
            <details><summary>Illustrative model & self-check rubric</summary><p lang="fr">${esc(item.model)}</p>
            <ul lang="${item.rubricLang || (current.owner.startsWith("mock-") ? "fr" : "en")}">${item.rubric.map((r) => `<li>${esc(r)}</li>`).join("")}</ul></details>
            <label for="self-${i}">Self-assessment (not examiner grading)</label>
            <select id="self-${i}" data-self="${i}"><option value="">Choose after comparing</option>
            <option>Needs guided practice</option><option>Partly independent</option><option>Independent on this task</option></select>`}</section>`;
      }).join("")}
      <p>Record a concrete error and a correction in ${link("progress", "your error log")}. Repeat later with a new prompt.</p>`;
    current.host.querySelectorAll("[data-self]").forEach((select) => select.addEventListener("change", () => {
      rows[Number(select.dataset.self)].self = select.value;
      save();
    }));
    if (current.recordings.length) {
      const heading = document.createElement("h3");
      heading.textContent = "Local recordings — download before leaving";
      current.host.append(heading);
      current.recordings.forEach(({ title, panel }) => {
        const label = document.createElement("h4");
        label.textContent = title;
        panel.querySelector(".record-start").disabled = true;
        current.host.append(label, panel);
      });
    }
    current.host.focus({ preventScroll: true });
  }

  function remediation(skill, owner = "") {
    const phase = /^checkpoint-([1-6])$/.exec(owner);
    const chapter = /^chapter-(\d+)(?:-stretch)?$/.exec(owner);
    const focus = phase ? `First revisit Chapters ${Number(phase[1]) * 4 - 3}–${Number(phase[1]) * 4}, especially the ${skill} tasks. `
      : chapter ? `First revisit Chapter ${Number(chapter[1])}'s ${skill} task and explanations. ` : "";
    return `${focus}For broader ${skill} support, use Chapters ${skillChapters[skill]}. Identify a missed detail or task criterion, correct it,
      practise a small fresh subset, then return after a delay. This is guidance, not a diagnostic level assignment.`;
  }

  function recording(host) {
    let outputURL = null;
    host.innerHTML = `<p>Record only if you choose. Audio stays in this tab; download before leaving.
      Permission denial does not block speaking: use a device recorder/timer or practise aloud manually.</p>
      <button type="button" class="record-start">Start microphone recording</button>
      <button type="button" class="record-stop">Stop recording</button>
      <p class="record-status" role="status"></p><div class="record-output"></div>`;
    const start = host.querySelector(".record-start");
    const stop = host.querySelector(".record-stop");
    const status = host.querySelector(".record-status");
    stop.disabled = true;
    start.addEventListener("click", async () => {
      if (session?.finished) {
        status.textContent = "This attempt has ended. Download or delete your recording, or start a new attempt.";
        return;
      }
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        status.textContent = "Recording unavailable here. Use a secure supported browser or practise aloud manually; no recording is required.";
        return;
      }
      audioCancel?.();
      stopRecording();
      main.querySelectorAll("audio").forEach((audio) => audio.pause());
      if (outputURL) {
        URL.revokeObjectURL(outputURL);
        recordingURLs.delete(outputURL);
        outputURL = null;
      }
      host.querySelector(".record-output").innerHTML = "";
      const token = ++recordingToken;
      const page = viewToken;
      start.disabled = true;
      status.textContent = "Requesting microphone permission…";
      try {
        const acquired = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (page !== viewToken || token !== recordingToken || session?.finished || document.hidden) {
          acquired.getTracks().forEach((track) => track.stop());
          if (page === viewToken && host.isConnected) {
            start.disabled = !!session?.finished;
            stop.disabled = true;
            status.textContent = "Recording request cancelled while inactive. Return to this activity and start again, or practise manually.";
          }
          return;
        }
        stream = acquired;
        const chunks = [];
        let failed = false;
        const active = new MediaRecorder(stream);
        recorder = active;
        active.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
        active.onerror = () => {
          failed = true;
          status.textContent = "Recording failed. Microphone stopped; continue manually or try again.";
          acquired.getTracks().forEach((track) => track.stop());
          if (recorder === active) stopRecording();
          start.disabled = false;
          stop.disabled = true;
        };
        active.onstop = () => {
          acquired.getTracks().forEach((track) => track.stop());
          if (recorder === active) { recorder = null; stream = null; }
          if (page !== viewToken) return;
          start.disabled = !!session?.finished;
          stop.disabled = true;
          if (failed) {
            status.textContent = "Recording failed. No usable recording saved; continue manually or retry.";
            return;
          }
          if (!chunks.length) {
            status.textContent = "No audio captured. Continue manually or retry.";
            return;
          }
          const blob = new Blob(chunks, { type: active.mimeType });
          if (outputURL) {
            URL.revokeObjectURL(outputURL);
            recordingURLs.delete(outputURL);
          }
          outputURL = URL.createObjectURL(blob);
          recordingURLs.add(outputURL);
          const ext = /mp4/i.test(blob.type) ? "mp4" : /ogg/i.test(blob.type) ? "ogg" : "webm";
          host.querySelector(".record-output").innerHTML = `<audio controls aria-label="Your local speaking recording" src="${outputURL}"></audio>
            <a href="${outputURL}" download="french-practice-recording.${ext}">Download recording</a>
            <button type="button" class="record-delete">Delete recording</button>`;
          host.querySelector(".record-delete").addEventListener("click", () => {
            host.querySelector("audio")?.pause();
            URL.revokeObjectURL(outputURL);
            recordingURLs.delete(outputURL);
            outputURL = null;
            host.querySelector(".record-output").innerHTML = "";
            status.textContent = "Recording deleted.";
          });
          status.textContent = "Recording stopped. Available here and in attempt review; download before leaving this activity. It is not saved across sessions.";
        };
        active.start();
        stop.disabled = false;
        status.textContent = "Recording locally. Stop to play, download or delete.";
      } catch (error) {
        if (page !== viewToken || token !== recordingToken) return;
        stopRecording();
        start.disabled = false;
        stop.disabled = true;
        status.textContent = "Microphone permission or recording failed. No upload occurred. Practise aloud manually or enable permission and retry.";
      }
    });
    stop.addEventListener("click", () => stopRecording());
  }

  function stopRecording() {
    if (recorder && recorder.state !== "inactive") recorder.stop();
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
  }

  function preserveRecording() {
    if (session) {
      const panel = session.host.querySelector(".recording-tools");
      if (panel && !session.recordings.some((r) => r.panel === panel)) {
        session.recordings.push({ title: session.section.items[session.index].title, panel });
      }
    }
    recordingToken += 1;
    audioCancel?.();
    stopRecording();
    main.querySelectorAll("audio").forEach((audio) => audio.pause());
  }

  function stopMedia() {
    recordingToken += 1;
    audioCancel?.();
    stopRecording();
    main.querySelectorAll("audio").forEach((audio) => audio.pause());
    recordingURLs.forEach((url) => URL.revokeObjectURL(url));
    recordingURLs.clear();
  }

  function progress() {
    const body = frame("Your local practice evidence");
    body.innerHTML = `<p>Saved on this browser/device only. Clearing site data removes records.
      No account, sync, automatic correction or official grading. Export regularly.
      Completion, objective answers and self-assessment are deliberately separate.</p>
      <div class="coach-toolbar">${button("export-coach", "Export current coach records")}
      ${button("export-raw", "Export saved raw coach data")}${button("save-coach", "Retry saving")}</div>
      ${storageBroken ? `<p class="coach-notice">Unreadable storage remains untouched. Export raw data before resetting only coach data.</p>
        <label><input type="checkbox" id="confirm-reset"> I understand this resets French coach plan only</label>${button("reset-coach", "Reset unreadable coach storage")}` : ""}
      <h2>Study completion</h2><p>${state.completed.length} study sections marked, independent of correctness.</p>
      <details><summary>Study sections by chapter</summary><ul>${data.chapters.map((c) =>
        `<li>${link(c.id, `Chapter ${c.number}: ${c.title}`)}:
        ${[["lesson", "learn/review"], ["bank", "sentence bank"], ["practice", "four-skill practice"]].map(([id, title]) =>
          `${link(`${c.id}/${id}`, title)} ${state.completed.includes(`${c.id}/${id}`) ? "(marked studied)" : "(not marked)"}`).join(" · ")}</li>`).join("")}</ul></details>
      <p>${state.exposures.length} recorded practice starts; ${state.exposures.filter((e) => !e.finished).length}
      left unfinished. These still count as prior exposure when you retry.</p>
      <h2>Skill evidence & remediation</h2>${skills.map((skill) => {
        const attempts = state.attempts.filter((a) => a.skill === skill);
        const latest = attempts.at(-1);
        return `<section class="coach-feedback"><h3>${esc(skill)}</h3><p>${attempts.length} recorded attempts.
          ${latest ? `Latest: ${esc(latest.owner)} · ${esc(latest.date.slice(0, 10))} · ${latest.repeat ? "repeat" : "first exposure on this device"}.
          ${latest.items.some((r) => r.type === "choice")
            ? `${latest.items.filter((r) => r.correct).length}/${latest.items.filter((r) => r.type === "choice").length} correct valid objective answers.`
            : "Production: no automatic score."}
          ${latest.items.filter((r) => r.self).length} self-assessments.` : "No evidence yet."}</p><p>${esc(remediation(skill, latest?.owner))}</p></section>`;
      }).join("")}
      <h2>Sentence-bank self-reports</h2><p>${Object.keys(state.reflections).length} items with a latest recall report.
      This is self-report, separate from objective correctness.</p>
      <ul>${data.chapters.flatMap((c) => c.bank.filter((b) => state.reflections[b.id]?.rating === "needs review")
        .map((b) => `<li>${link(`${c.id}/bank`, `Chapter ${c.number}, sentence ${c.bank.indexOf(b) + 1}`)} · needs review</li>`))
        .slice(0, 30).join("") || "<li>No items marked for another review.</li>"}</ul>
      <h2>Attempt history</h2><details><summary>Inspect recorded tasks and self-assessment</summary>
      ${state.attempts.map((a) => `<section><h3>${esc(a.owner)} · ${esc(a.skill)}</h3><p>${esc(a.date)} · ${a.repeat ? "repeat" : "first recorded attempt"}
        · ${a.mode ? esc(a.mode) : "conditions not recorded in earlier version"}</p>
        <ul>${a.items.map((i) => `<li>${esc(i.id)}: ${i.attempted ? "attempted" : "unattempted"} ·
          ${i.type === "choice" ? `${i.correct ? "correct" : "incorrect/unanswered"}${i.validAudio === false ? " (audio invalid)" : ""}` : esc(i.self || "not self-assessed")}
          ${i.supportUsed ? " · English support used" : ""}</li>`).join("")}</ul></section>`).join("") || "<p>No attempts recorded.</p>"}</details>
      <h2>Error log</h2><form id="error-form">${field("error-skill", "Skill", skills.map((s) => [s, s]))}
      <label for="error-note">What went wrong, your correction, and when to revisit</label>
      <textarea id="error-note" required maxlength="3000" rows="4" placeholder="Example: confused depuis / pendant; correct phrase and fresh example; revisit in 3 days."></textarea>
      <button type="submit">Save error & correction</button></form><div id="error-list"></div>`;
    function download(text, name) {
      const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = name;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    body.querySelector("#export-coach").addEventListener("click", () => download(JSON.stringify(state, null, 2), "french-coach-progress.json"));
    body.querySelector("#export-raw").addEventListener("click", () => {
      try {
        download(localStorage.getItem(key) || "null", "french-coach-raw.json");
      } catch (error) {
        storageWarning("Raw export failed because browser storage is inaccessible. Export current in-memory records instead.");
      }
    });
    body.querySelector("#save-coach").addEventListener("click", () => {
      if (save()) showToast("Coach records saved on this device.");
    });
    body.querySelector("#reset-coach")?.addEventListener("click", () => {
      if (!body.querySelector("#confirm-reset").checked) {
        showToast("Confirm the coach-only reset first.");
        return;
      }
      try {
        localStorage.removeItem(key);
        storageBroken = false;
        state = emptyState();
        if (save()) {
          if (legacyStorageInvalid) {
            storageWarning("Legacy progress is still unreadable and remains untouched. Repair its saved records and reload.");
          } else {
            document.querySelector("#storage-warning").hidden = true;
          }
          progress();
          navigation(search.value);
        }
      } catch (error) {
        storageWarning("Coach reset failed. Browser storage is inaccessible; legacy data was not changed.");
      }
    });
    function showErrors() {
      body.querySelector("#error-list").innerHTML = state.errors.map((error, i) =>
        `<section class="coach-feedback"><strong>${esc(error.skill)} · ${esc(error.date?.slice(0, 10) || "")}</strong>
        <p>${esc(error.note)}</p><button type="button" data-delete-error="${i}">Delete error entry</button></section>`).join("") || "<p>No errors logged yet.</p>";
      body.querySelectorAll("[data-delete-error]").forEach((b) => b.addEventListener("click", () => {
        state.errors.splice(Number(b.dataset.deleteError), 1);
        save();
        showErrors();
      }));
    }
    body.querySelector("#error-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const note = body.querySelector("#error-note").value.trim();
      if (!note) { showToast("Write an error and correction before saving."); return; }
      state.errors.push({ skill: body.querySelector("#error-skill").value, note, date: new Date().toISOString() });
      save();
      body.querySelector("#error-note").value = "";
      showErrors();
    });
    showErrors();
  }

  function cleanup() {
    viewToken += 1;
    clearInterval(timer);
    clearInterval(taskTimer);
    stopMedia();
    session = null;
    const bar = document.querySelector(".speak-bar");
    if (bar) bar.hidden = false;
  }

  function route(parts) {
    if (!data) {
      main.textContent = "Coach content could not load. Reload online to update the offline cache.";
      navigation();
      return;
    }
    load();
    const [id, sub] = parts;
    if (!id) home();
    else if (id === "target") {
      frame("Your route toward NCLC 8").innerHTML = `<section class="lesson-body" lang="en">${data.target}</section>`;
      bindSpeakableExamples();
    }
    else if (id === "orientation") {
      frame("Start here: your study plan").innerHTML = `<section class="lesson-body">${data.orientation}</section>
        <h2>Reference sources</h2><p>References, not required off-site homework:
        <a href="https://www.france-education-international.fr/test/tcf-canada?langue=en" target="_blank" rel="noopener noreferrer">FEI: TCF Canada</a> ·
        <a href="https://www.france-education-international.fr/document/manuelcandidattoutes20dc3a9clinaisonsi" target="_blank" rel="noopener noreferrer">FEI candidate manual (speaking, p. 18)</a> ·
        <a href="https://www.france-education-international.fr/document/tcf-tp-qc-ca-exemple-epreuve-ee" target="_blank" rel="noopener noreferrer">FEI writing task instructions</a> ·
        <a href="https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/documents/language-test.html" target="_blank" rel="noopener noreferrer">IRCC: language scores</a> ·
        <a href="https://www.psychologicalscience.org/publications/journals/pspi/learning-techniques.html" target="_blank" rel="noopener noreferrer">Retrieval and distributed-practice evidence</a>.
        Retrieval/spacing evidence does not prove this exact chapter order or a fixed time to NCLC 8.</p>`;
      bindSpeakableExamples();
    } else if (id === "progress") progress();
    else if (id === "assessments") assessments();
    else if (id === "assessment" && data.assessments.some((a) => a.id === sub)) {
      assessmentView(data.assessments.find((a) => a.id === sub));
    } else {
      const chapter = data.chapters.find((c) => c.id === id);
      if (chapter) chapterView(chapter, sub);
      else frame("Coach page not found").innerHTML = `<p>${link("", "Return to the coach plan")}</p>`;
    }
    navigation(search.value);
  }

  window.addEventListener("pagehide", cleanup);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      audioCancel?.();
      recordingToken += 1;
      stopRecording();
      main.querySelectorAll(".record-start").forEach((control) => {
        control.disabled = !!session?.finished;
      });
    }
  });
  window.Coach = { route, navigation, cleanup, examActive: () => !!session?.exam && !session.finished };
})();
