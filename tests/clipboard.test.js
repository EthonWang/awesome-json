import assert from "node:assert/strict";
import test from "node:test";
import { copyText } from "../src/lib/clipboard.js";

function browserStub(
  t,
  { clipboard, commandResult = true, inDialog = false, input = false } = {},
) {
  const calls = [];
  class Input {
    selectionStart = 2;
    selectionEnd = 5;
    selectionDirection = "backward";
    closest() {
      return inDialog ? host : null;
    }
    focus() {
      calls.push("restore-focus");
    }
    setSelectionRange(...args) {
      calls.push(["restore-input-selection", ...args]);
    }
  }
  const host = { appendChild: () => calls.push("dialog-host") };
  const range = { cloneRange: () => "original-range" };
  const activeElement = input
    ? new Input()
    : {
        closest: () => (inDialog ? host : null),
        focus: () => calls.push("restore-focus"),
      };
  const textarea = {
    style: {},
    setAttribute() {},
    focus() {},
    select() {},
    setSelectionRange() {},
    remove: () => calls.push("remove-textarea"),
  };
  const values = {
    navigator: { clipboard },
    HTMLInputElement: Input,
    HTMLTextAreaElement: class {},
    document: {
      activeElement,
      body: { appendChild: () => calls.push("body-host") },
      getSelection: () => ({
        rangeCount: 1,
        getRangeAt: () => range,
        removeAllRanges: () => calls.push("clear-selection"),
        addRange: (range) => calls.push(["restore-range", range]),
      }),
      createElement: () => textarea,
      execCommand: (command) => {
        calls.push([command, textarea.value]);
        return commandResult;
      },
    },
  };
  for (const [key, value] of Object.entries(values)) {
    const original = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true });
    t.after(() => {
      if (original) Object.defineProperty(globalThis, key, original);
      else delete globalThis[key];
    });
  }
  return calls;
}

test("native clipboard succeeds without changing focus or DOM", async (t) => {
  let copied;
  const calls = browserStub(t, {
    clipboard: {
      writeText: async (text) => {
        copied = text;
      },
    },
  });
  await copyText('原始 JSON\n{"emoji":"😀"}');
  assert.equal(copied, '原始 JSON\n{"emoji":"😀"}');
  assert.deepEqual(calls, []);
});

test("a rejected permission falls back inside the dialog and restores selection", async (t) => {
  const calls = browserStub(t, {
    clipboard: {
      writeText: async () => {
        throw new Error("NotAllowedError");
      },
    },
    inDialog: true,
  });
  await copyText('{"value":1}');
  assert.deepEqual(calls, [
    "dialog-host",
    ["copy", '{"value":1}'],
    "remove-textarea",
    "restore-focus",
    "clear-selection",
    ["restore-range", "original-range"],
  ]);
});

test("an unavailable API copies empty text and preserves input selection", async (t) => {
  const calls = browserStub(t, { input: true });
  await copyText("");
  assert.deepEqual(calls, [
    "body-host",
    ["copy", ""],
    "remove-textarea",
    "restore-focus",
    ["restore-input-selection", 2, 5, "backward"],
  ]);
});

test("failed fallback reports failure and still removes the temporary field", async (t) => {
  const calls = browserStub(t, { commandResult: false });
  await assert.rejects(copyText("test"), /Clipboard copy is unavailable/);
  assert.ok(calls.includes("remove-textarea"));
  assert.ok(calls.includes("restore-focus"));
});
