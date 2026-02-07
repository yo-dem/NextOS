// handlers.js

import { dom } from "./dom.js";
import { state } from "./state.js";
import { clearInput } from "./input.js";
import { updateCaret, pauseBlink } from "./prompt.js";
import { handleLogin } from "./login.js";
import { autocomplete } from "./fs.js";

export function handleLoginMode(e) {
  if (!state.isLoggingIn) return false;

  if (e.key !== "Enter") return true;

  e.preventDefault();

  const value = dom.input.value.trim();

  clearInput();
  handleLogin(value);

  return true;
}

export function handleHistory(e) {
  if (e.shiftKey) return false;

  if (e.key === "ArrowUp") {
    if (state.historyIndex > 0) {
      state.historyIndex--;
      dom.input.value = state.history[state.historyIndex];
      updateCaret();
    }

    e.preventDefault();
    return true;
  }

  if (e.key === "ArrowDown") {
    if (state.historyIndex < state.history.length - 1) {
      state.historyIndex++;
      dom.input.value = state.history[state.historyIndex];
    } else {
      state.historyIndex = state.history.length;
      dom.input.value = "";
    }

    updateCaret();
    e.preventDefault();
    return true;
  }

  return false;
}

export function handleNavigation(e) {
  if (
    e.key === "ArrowLeft" ||
    e.key === "ArrowRight" ||
    e.key === "Home" ||
    e.key === "End"
  ) {
    requestAnimationFrame(updateCaret);
    pauseBlink();
    return true;
  }

  return false;
}

/* ===========================
   PASSWORD MASK
=========================== */

function handlePasswordMask() {
  if (!state.isLoggingIn || state.loginStep !== 1) return;

  const value = dom.input.value;
  const prev = state.passwordBuffer.length;

  if (value.length > prev) {
    state.passwordBuffer += value.slice(prev);
  } else {
    state.passwordBuffer = state.passwordBuffer.slice(0, value.length);
  }

  dom.input.value = "*".repeat(state.passwordBuffer.length);
}

/* ===========================
   EVENTS
=========================== */

document.addEventListener("keydown", handleTab);

// dom.input.addEventListener("keydown", handleMainInput);

dom.input.addEventListener("input", () => {
  handlePasswordMask();
  updateCaret();
  pauseBlink();
});

document.addEventListener("selectionchange", () => {
  if (document.activeElement === dom.input) {
    updateCaret();
  }
});

dom.input.addEventListener("click", () => {
  updateCaret();
  pauseBlink();
});

export function handleTab(e) {
  if (e.key !== "Tab") return;

  e.preventDefault();

  const input = dom.input.value;

  const result = autocomplete(input, state.cwd);

  if (!result.matches.length) return;

  const base = result.parts.join(" ");
  const spacer = base ? " " : "";

  if (result.matches.length === 1) {
    dom.input.value = base + spacer + result.basePath + result.matches[0];
  } else {
    print(result.matches.join("  "));
  }

  updateCaret();
}
