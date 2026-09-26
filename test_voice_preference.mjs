import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(root, "docs", "app.js"), "utf8");

function stubElement() {
  const element = {
    innerHTML: "",
    value: "",
    textContent: "",
    disabled: false,
    dataset: {},
    options: [],
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    addEventListener() {},
    removeEventListener() {},
    querySelector: () => stubElement(),
    querySelectorAll: () => [],
    focus() {},
    scrollTo() {},
  };
  return element;
}

function makeVoice(name, lang) {
  return { name, lang, default: false, localService: true, voiceURI: name };
}

/** Loads docs/app.js in a sandbox with just enough browser surface to run. */
function loadApp(voices) {
  const store = new Map();
  const elements = new Map();
  const getElement = (selector) => {
    if (!elements.has(selector)) elements.set(selector, stubElement());
    return elements.get(selector);
  };

  const spoken = [];
  const speechSynthesis = {
    getVoices: () => voices,
    speak: (utterance) => spoken.push(utterance),
    cancel() {},
    addEventListener() {},
  };

  class SpeechSynthesisUtterance {
    constructor(text) {
      this.text = text;
      this.lang = "";
      this.rate = 1;
      this.voice = null;
    }
  }

  const documentStub = {
    documentElement: { dataset: {} },
    querySelector: getElement,
    querySelectorAll: () => [],
    addEventListener() {},
    createElement: () => stubElement(),
  };

  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    SpeechSynthesisUtterance,
    speechSynthesis,
    document: documentStub,
    navigator: {},
    location: { hash: "", protocol: "file:" },
    getSelection: () => ({ toString: () => "" }),
    matchMedia: () => ({ matches: false }),
    addEventListener() {},
    removeEventListener() {},
    scrollTo() {},
    localStorage: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
    },
  };
  sandbox.window = sandbox;
  sandbox.window.FRENCH_PRACTICE_CONTENT = { chapters: [] };
  sandbox.globalThis = sandbox;

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  return { sandbox, spoken, store, elements };
}

const FRENCH_SET = [
  makeVoice("Amélie", "fr-CA"),
  makeVoice("Thomas", "fr-FR"),
  makeVoice("Jacques", "fr-FR"),
  makeVoice("Alex", "en-US"),
];

test("only French voices are offered", () => {
  const { sandbox } = loadApp(FRENCH_SET);
  const names = sandbox.frenchVoices().map((voice) => voice.name);
  assert.deepEqual(names, ["Amélie", "Thomas", "Jacques"]);
});

test("defaults to a France French voice over another French locale", () => {
  const { sandbox } = loadApp(FRENCH_SET);
  const chosen = sandbox.preferredVoice();
  assert.equal(chosen.lang, "fr-FR");
  assert.equal(chosen.name, "Thomas");
});

test("prefers a Google voice when one is installed", () => {
  const { sandbox } = loadApp([
    makeVoice("Thomas", "fr-FR"),
    makeVoice("Google français", "fr-FR"),
  ]);
  assert.equal(sandbox.preferredVoice().name, "Google français");
});

test("an explicit choice overrides the default ranking", () => {
  const { sandbox, store } = loadApp(FRENCH_SET);
  store.set("french-practice-voice", "Amélie::fr-CA");
  assert.equal(sandbox.preferredVoice().name, "Amélie");
});

test("a stale saved choice falls back to the ranking", () => {
  const { sandbox, store } = loadApp(FRENCH_SET);
  store.set("french-practice-voice", "Removed Voice::fr-FR");
  assert.equal(sandbox.preferredVoice().name, "Thomas");
});

test("returns no voice when none is installed for French", () => {
  const { sandbox } = loadApp([makeVoice("Alex", "en-US")]);
  assert.equal(sandbox.preferredVoice(), null);
});

test("speaking uses the French voice and its locale", () => {
  const { sandbox, spoken } = loadApp(FRENCH_SET);
  sandbox.speakFrench("bonjour");
  assert.equal(spoken.length, 1);
  assert.equal(spoken[0].text, "bonjour");
  assert.equal(spoken[0].voice.name, "Thomas");
  assert.equal(spoken[0].lang, "fr-FR");
});

test("speaking is deferred while the voice list is still empty", () => {
  // The original bug: getVoices() is empty on first call, so the utterance
  // was assigned a null voice and read aloud with an English voice.
  const { sandbox, spoken } = loadApp([]);
  sandbox.speakFrench("bonjour");
  assert.equal(spoken.length, 0, "must not speak before voices are known");
});
