import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import i18n, { supportedLanguages } from "../src/i18n/index.js";
import { translateMessage } from "../src/i18n/message.js";
import { parseJsonInput, jsonError } from "../src/utils/jsonActions.js";
import { diffJson, describeDiff } from "../src/utils/jsonDiff.js";

const namespaces = ["common", "editor", "diff", "search"];
const resources = Object.fromEntries(supportedLanguages.map(({ code }) => [
  code,
  Object.fromEntries(namespaces.map((namespace) => [
    namespace,
    JSON.parse(readFileSync(new URL(`../src/i18n/locales/${code}/${namespace}.json`, import.meta.url))),
  ])),
]));
await i18n.init({ resources, lng: "zh-CN", fallbackLng: "zh-CN", interpolation: { escapeValue: false } });

test("catalogs have matching keys and interpolation variables", () => {
  const variables = (text) => [...text.matchAll(/{{(.*?)}}/g)].map((match) => match[1]).sort();
  for (const namespace of namespaces) {
    const chinese = resources["zh-CN"][namespace];
    const english = resources.en[namespace];
    assert.deepEqual(Object.keys(chinese).sort(), Object.keys(english).sort());
    for (const key of Object.keys(chinese)) {
      assert.ok(chinese[key].trim() && english[key].trim(), `${namespace}:${key}`);
      assert.deepEqual(variables(chinese[key]), variables(english[key]), `${namespace}:${key}`);
    }
  }
});

test("stored errors and notices follow language changes without altering input", async () => {
  await i18n.changeLanguage("zh-CN");
  const input = '{"value":}';
  const error = jsonError(input, true);
  assert.match(translateMessage(error), /格式有误/);
  const empty = parseJsonInput("", { key: "diff:left" }).translation;
  const notice = { key: "diff:copiedSide", values: { label: { key: "diff:right" } } };
  await i18n.changeLanguage("en");
  assert.match(translateMessage(error), /Invalid JSON/);
  assert.equal(translateMessage(empty), "Enter Original JSON first.");
  assert.equal(translateMessage(notice), "Target JSON copied.");
  assert.equal(input, '{"value":}');
  assert.match(parseJsonInput("[", "JSON").message, /unclosed quotes/);
});

test("existing diff records can be translated without recomputing comparisons", async () => {
  const left = { value: 1, type: true, removed: 0, list: [1, 2] };
  const right = { value: 2, type: "true", added: 0, list: [1] };
  const diffs = diffJson(left, right);
  const saved = structuredClone(diffs);
  await i18n.changeLanguage("en");
  const english = diffs.map(describeDiff);
  assert.ok(english.some((message) => message === "Different values: 1 ≠ 2"));
  assert.ok(english.some((message) => message.includes("Different types")));
  assert.ok(english.some((message) => message.includes("Property missing on the left")));
  assert.ok(english.some((message) => message.includes("Item [1] missing on the right")));
  await i18n.changeLanguage("zh-CN");
  assert.ok(diffs.map(describeDiff).some((message) => message === "值不等: 1 ≠ 2"));
  assert.deepEqual(diffs, saved);
});

test("English counters handle singular, plural and zero, with a Chinese fallback", async () => {
  await i18n.changeLanguage("en");
  assert.equal(i18n.t("search:resultCount", { count: 1 }), "1 result");
  assert.equal(i18n.t("search:resultCount", { count: 2 }), "2 results");
  assert.equal(i18n.t("editor:characterCount", { count: 0 }), "0 characters");
  await i18n.changeLanguage("fr");
  assert.equal(i18n.t("common:format"), "格式化");
});

test("replacement expansion survives CodeMirror language reconfiguration", async () => {
  const { EditorState, StateEffect } = await import("@codemirror/state");
  const { searchPanelState, openReplaceEffect } = await import("../src/lib/searchPanelState.js");
  let state = EditorState.create({
    doc: '{"value":1}',
    extensions: [searchPanelState],
  });
  state = state.update({ effects: openReplaceEffect.of(true) }).state;
  state = state.update({
    effects: StateEffect.reconfigure.of([
      searchPanelState,
      EditorState.phrases.of({ "Fold line": "折叠此行" }),
    ]),
  }).state;
  assert.equal(state.field(searchPanelState), true);
  assert.equal(state.doc.toString(), '{"value":1}');
  state = state.update({ effects: openReplaceEffect.of(false) }).state;
  assert.equal(state.field(searchPanelState), false);
});
