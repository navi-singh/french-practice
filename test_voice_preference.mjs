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

test("underscore locales from Android count as French", () => {
  const { sandbox } = loadApp([makeVoice("Amelie", "fr_CA"), makeVoice("Alex", "en-US")]);
  assert.equal(sandbox.frenchVoices().length, 1);
  assert.equal(sandbox.preferredVoice().name, "Amelie");
});

test("fr_FR is still preferred over another French locale", () => {
  const { sandbox } = loadApp([makeVoice("Amelie", "fr_CA"), makeVoice("Jacques", "fr_FR")]);
  assert.equal(sandbox.preferredVoice().name, "Jacques");
});

test("the picker recovers when voices arrive after startup", async () => {  // iOS Safari and some Android builds never fire voiceschanged, so the
  // picker used to stay stuck on its empty state forever.
  const late = [];
  const { sandbox, elements } = loadApp(late);
  const select = elements.get("#voice-select");
  assert.equal(select.disabled, true, "starts disabled with no voices");

  late.push(makeVoice("Thomas", "fr-FR"));
  await new Promise((resolve) => setTimeout(resolve, 900));

  assert.equal(select.disabled, false, "re-enables once voices appear");
  assert.match(select.innerHTML, /Thomas/);
});

test("speed defaults to 88% of normal", () => {
  const { sandbox } = loadApp(FRENCH_SET);
  assert.equal(sandbox.speechRate(), 0.88);
});

test("50 on the slider really is half speed", () => {
  const { sandbox } = loadApp(FRENCH_SET);
  assert.equal(sandbox.speechRate(50), 0.5);
  assert.equal(sandbox.speechRate(100), 1);
  assert.equal(sandbox.speechRate(25), 0.25);
});

test("the saved speed is used when no override is given", () => {
  const { sandbox, store } = loadApp(FRENCH_SET);
  store.set("french-practice-rate", "40");
  assert.equal(sandbox.speechRate(), 0.4);
});

test("speed is clamped to a range the engines can actually render", () => {
  const { sandbox } = loadApp(FRENCH_SET);
  assert.equal(sandbox.speechRate(1), 0.2, "floor keeps audio intelligible");
  assert.equal(sandbox.speechRate(400), 1, "never faster than normal speech");
});

test("a corrupt saved speed falls back to the default", () => {
  const { sandbox, store } = loadApp(FRENCH_SET);
  store.set("french-practice-rate", "not-a-number");
  assert.equal(sandbox.speechRate(), 0.88);
});

test("the utterance carries the chosen speed", () => {
  const { sandbox, spoken, store } = loadApp(FRENCH_SET);
  store.set("french-practice-rate", "60");
  sandbox.speakFrench("bonjour");
  assert.equal(spoken[0].rate, 0.6);
  sandbox.speakFrench("bonjour", 30);
  assert.equal(spoken[1].rate, 0.3, "an explicit override wins");
});
