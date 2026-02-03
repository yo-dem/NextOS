// src/prompt.js

import { state } from "./state.js";
import { dom } from "./dom.js";

let blinkTimeout = null;

export function getPrompt() {
  if (state.isLoggingIn) {
    return "> ";
  }

  const base = `/${state.currentUser.username}`;

  if (!state.cwd.length) return base + "/>: ";

  return base + "/" + state.cwd.join("/") + "/>: ";
}

export function updatePrompt() {
  dom.promptPath.textContent = getPrompt();
  updateCaret();
}

export function updateCaret() {
  const pos = dom.input.selectionStart || 0;
  const len = dom.promptPath.textContent.length;

  dom.caret.style.marginLeft = (len + pos) * 0.6 + "em";
}

export function pauseBlink() {
  dom.caret.style.animation = "none";

  clearTimeout(blinkTimeout);

  blinkTimeout = setTimeout(() => {
    dom.caret.style.animation = "blink 1s steps(1) infinite";
  }, 600);
}
