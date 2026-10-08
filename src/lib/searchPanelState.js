import { StateEffect, StateField } from "@codemirror/state";

export const openReplaceEffect = StateEffect.define();
// CodeMirror may rebuild panels when its phrases change. Keep UI state in the
// editor so language reconfiguration preserves the expanded replacement row.
export const searchPanelState = StateField.define({
  create: () => false,
  update(expanded, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(openReplaceEffect)) expanded = effect.value;
    }
    return expanded;
  },
});
