const course = window.FRENCH_PRACTICE_CONTENT;
const main = document.querySelector("#main");
const sidebar = document.querySelector("#sidebar");
const chapterList = document.querySelector("#chapter-list");
const search = document.querySelector("#search");
const progressSummary = document.querySelector("#progress-summary");
const toast = document.querySelector("#toast");
const backdrop = document.querySelector("#backdrop");
const completionKey = "french-practice-completed";
const themeKey = "french-practice-theme";

let completed = new Set(JSON.parse(localStorage.getItem(completionKey) || "[]"));
let lastSelectedText = "";

document.addEventListener("selectionchange", () => {
  const text = getSelection()?.toString().trim();
  if (text) lastSelectedText = text;
});

function route() {
  const hash = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
  if (!hash) {
    renderHome();
    updateNavigation();
    return;
  }
  const [chapterSlug, ...documentParts] = hash.split("/");
  const chapter = course.chapters.find((item) => item.slug === chapterSlug);
  if (!chapter) {
    renderHome();
    return;
  }
  const documentId = documentParts.length
    ? `${chapterSlug}/${documentParts.join("/")}`
    : chapter.documents[0].id;
  const document = chapter.documents.find((item) => item.id === documentId)
    || chapter.documents[0];
  renderDocument(chapter, document);
  updateNavigation(chapter.slug);
  closeSidebar();
  main.scrollTop = 0;
  main.focus({ preventScroll: true });
}

function renderHome() {
  main.innerHTML = `
    <section class="content-card">
      <div class="document-header">
        <div class="eyebrow">Beginner course · Chapters 0-16</div>
        <h1>Learn French by using it</h1>
        <p>New to French? Start with Chapter 0 for pronunciation and your first phrases. Read, listen, write from memory, correct, and review. Your progress is saved on this device.</p>
      </div>
      <div class="home-grid">
        ${course.chapters.map((chapter) => `
          <article class="home-card" data-route="${chapter.slug}">
            <span>Chapter ${chapter.number}</span>
            <h2>${escapeHtml(chapter.title)}</h2>
          </article>
        `).join("")}
      </div>
    </section>`;
  main.querySelectorAll("[data-route]").forEach((card) => {
    card.addEventListener("click", () => {
      location.hash = `#/${card.dataset.route}`;
    });
  });
}

function renderDocument(chapter, document) {
  const isDone = completed.has(document.id);
  main.innerHTML = `
    <article class="content-card">
      <header class="document-header">
        <div class="eyebrow">Chapter ${chapter.number} · ${escapeHtml(document.type)}</div>
        <h1>${escapeHtml(document.title)}</h1>
        <p>${escapeHtml(chapter.title)}</p>
      </header>
      <div class="document-tabs">
        ${chapter.documents.map((item) => `
          <button class="document-tab ${item.id === document.id ? "active" : ""}"
            data-document="${escapeAttribute(item.id)}">
            ${escapeHtml(shortTitle(item))}
          </button>
        `).join("")}
      </div>
      <button class="completion-button ${isDone ? "done" : ""}" id="completion-button">
        ${isDone ? "✓ Completed" : "Mark this section complete"}
      </button>
      <section class="lesson-body">${document.html}</section>
    </article>`;

  main.querySelectorAll("[data-document]").forEach((button) => {
    button.addEventListener("click", () => {
      location.hash = `#/${button.dataset.document}`;
    });
  });
  main.querySelector("#completion-button").addEventListener("click", () => {
    if (completed.has(document.id)) {
      completed.delete(document.id);
    } else {
      completed.add(document.id);
    }
    saveProgress();
    renderDocument(chapter, document);
    updateNavigation(chapter.slug);
  });
  bindSpeakableExamples();
}

function renderChapters(filter = "") {
  const needle = filter.trim().toLowerCase();
  if (needle) {
    const results = [];
    course.chapters.forEach((chapter) => {
      chapter.documents.forEach((document) => {
        if (
          chapter.title.toLowerCase().includes(needle)
          || document.title.toLowerCase().includes(needle)
          || document.search.includes(needle)
        ) {
          results.push({ chapter, document });
        }
      });
    });
    chapterList.innerHTML = `
      <div class="search-results">
        ${results.slice(0, 40).map(({ chapter, document }) => `
          <button class="search-result" data-document="${escapeAttribute(document.id)}">
            <strong>${escapeHtml(document.title)}</strong>
            <span>Chapter ${chapter.number}: ${escapeHtml(chapter.title)}</span>
          </button>
        `).join("") || "<p>No matching lessons.</p>"}
      </div>`;
    chapterList.querySelectorAll("[data-document]").forEach((button) => {
      button.addEventListener("click", () => {
        location.hash = `#/${button.dataset.document}`;
        search.value = "";
        renderChapters();
      });
    });
    return;
  }

  const activeSlug = decodeURIComponent(location.hash).split("/")[1] || "";
  chapterList.innerHTML = course.chapters.map((chapter) => {
    const done = chapter.documents.length > 0
      && chapter.documents.every((document) => completed.has(document.id));
    return `
      <button class="chapter-link ${chapter.slug === activeSlug ? "active" : ""}"
        data-route="${chapter.slug}">
        <span class="chapter-number">${chapter.number}</span>
        <span class="chapter-title">${escapeHtml(chapter.title)}</span>
        <span class="completion-dot ${done ? "done" : ""}"></span>
      </button>`;
  }).join("");
  chapterList.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => {
      location.hash = `#/${button.dataset.route}`;
    });
  });
}

function updateNavigation() {
  renderChapters(search.value);
  const total = course.chapters.reduce((sum, chapter) => sum + chapter.documents.length, 0);
  const count = completed.size;
  const percentage = total ? Math.round((count / total) * 100) : 0;
  progressSummary.innerHTML = `
    <strong>${count} of ${total} sections complete</strong>
    <div class="progress-track"><span style="width:${percentage}%"></span></div>`;
}

function shortTitle(document) {
  if (document.type === "Lessons" && /^Lesson \d+:/.test(document.title)) {
    return document.title.replace(/^Lesson \d+:\s*/, "");
  }
  return document.type;
}

function bindSpeakableExamples() {
  main.querySelectorAll("code.speakable").forEach((element) => {
    element.title = "Tap to pronounce in French";
    element.addEventListener("click", () => speakFrench(element.textContent));
  });
}

function speakFrench(text) {
  if (!("speechSynthesis" in window)) {
    showToast("Speech is not supported in this browser.");
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "fr-FR";
  utterance.rate = 0.88;
  const frenchVoices = speechSynthesis.getVoices().filter(
    (voice) => voice.lang.toLowerCase().startsWith("fr")
  );
  utterance.voice = frenchVoices.find((voice) =>
    /natural|premium|enhanced|google|microsoft|thomas|audrey|amelie|amélie/i.test(voice.name)
  ) || frenchVoices[0] || null;
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

function saveProgress() {
  localStorage.setItem(completionKey, JSON.stringify([...completed]));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function closeSidebar() {
  sidebar.classList.remove("open");
  backdrop.classList.remove("show");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]);
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

document.querySelector("#menu-button").addEventListener("click", () => {
  sidebar.classList.toggle("open");
  backdrop.classList.toggle("show");
});
backdrop.addEventListener("click", closeSidebar);
search.addEventListener("input", () => renderChapters(search.value));
window.addEventListener("hashchange", route);

document.querySelector("#theme-button").addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem(themeKey, next);
});
document.documentElement.dataset.theme = localStorage.getItem(themeKey)
  || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

const speakSelectionButton = document.querySelector("#speak-selection");
speakSelectionButton.addEventListener("pointerdown", (event) => {
  const text = getSelection()?.toString().trim();
  if (text) lastSelectedText = text;
  event.preventDefault();
});
speakSelectionButton.addEventListener("click", () => {
  const text = getSelection()?.toString().trim() || lastSelectedText;
  if (!text) {
    showToast("Select French text first.");
    return;
  }
  speakFrench(text);
});

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js");
}

renderChapters();
updateNavigation();
route();
