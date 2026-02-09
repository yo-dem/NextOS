// src/handlers.js

import { dom } from "./dom.js";
import { state, saveUser } from "./state.js";
import { updateCaret, pauseBlink, updatePrompt } from "./prompt.js";
import { autocomplete } from "./fs.js";
import { print } from "./terminal.js";
import { clearTerminal } from "./terminal.js";
import { requestBreak } from "./basic-runner.js";

/* ===========================
   EVENTS DOM
=========================== */

document.addEventListener("keydown", (e) => {
  handleTab(e);
  if (e.ctrlKey && e.key === "c") {
    requestBreak();
  }
});

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

/* ===========================
   LOGIN HANDLER
=========================== */

export function handleLoginMode(e) {
  if (!state.isLoggingIn) return false;

  if (e.key !== "Enter") return true;

  e.preventDefault();

  const value = dom.input.value.trim();
  dom.input.value = "";
  updateCaret();
  handleLogin(value);

  return true;
}

/* ===========================
   HISTORY HANDLER
=========================== */

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

/* ===========================
   NAVIGATION HANDLER
=========================== */

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

export function handlePasswordMask() {
  if (!state.isLoggingIn || state.loginStep !== 1) return;

  const value = dom.input.value;
  const prevLength = state.passwordBuffer.length;

  if (value.length > prevLength) {
    state.passwordBuffer += value.slice(prevLength);
  } else {
    state.passwordBuffer = state.passwordBuffer.slice(0, value.length);
  }

  dom.input.value = "*".repeat(state.passwordBuffer.length);
}

/* ===========================
   TAB COMPLETION
=========================== */

export function handleTab(e) {
  if (e.key !== "Tab") return;

  e.preventDefault();

  const input = dom.input.value;
  const result = autocomplete(input, state.cwd);

  if (!result.matches.length) return;

  const base = result.parts.join(" ");
  const spacer = base ? " " : "";

  if (result.matches.length === 1) {
    // Un solo match: completa tutto
    let completePath = result.basePath + result.matches[0];

    // Se è una directory, aggiungi / alla fine
    if (result.isDirectory && result.isDirectory[0]) {
      completePath += "/";
    }

    if (!base) {
      dom.input.value = completePath;
    } else {
      dom.input.value = base + spacer + completePath;
    }
  } else {
    // Multipli match: trova il prefisso comune
    const commonPrefix = findCommonPrefix(result.matches);

    // Estrai il nome corrente (ultima parte dopo /)
    const inputParts = input.split(/\s+/);
    const lastPart = inputParts[inputParts.length - 1] || "";
    const currentName = lastPart.split("/").pop();

    if (commonPrefix.length > currentName.length) {
      const completePath = result.basePath + commonPrefix;
      if (!base) {
        dom.input.value = completePath;
      } else {
        dom.input.value = base + spacer + completePath;
      }
    } else {
      // Mostra i match senza il basePath (solo i nomi)
      print(result.matches.join("  "));
    }
  }

  updateCaret();
}

// Funzione helper per trovare il prefisso comune
function findCommonPrefix(strings) {
  if (!strings.length) return "";
  if (strings.length === 1) return strings[0];

  let prefix = strings[0];

  for (let i = 1; i < strings.length; i++) {
    while (!strings[i].startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
      if (!prefix) return "";
    }
  }

  return prefix;
}

function handleLogin(value) {
  // USERNAME
  if (state.loginStep === 0) {
    const user = state.fs.users.find((u) => u.username === value);

    if (!user) {
      print("User not found.");
      print("");
      resetLogin();
      updatePrompt();
      return;
    }

    state.loginUser = user;
    state.loginStep = 1;

    clearTerminal();
    print("Insert password:");
    print("");
    return;
  }

  // PASSWORD
  if (state.loginStep === 1) {
    if (state.passwordBuffer !== state.loginUser.password) {
      print("Access Denied.");
      print("");
      resetLogin();
      updatePrompt();
      return;
    }

    state.currentUser = {
      username: state.loginUser.username,
      role: state.loginUser.role,
    };

    saveUser();

    clearTerminal();

    print(`Access Granted. Welcome, ${state.currentUser.username}!`);
    print("");

    resetLogin();
    updatePrompt();
  }
}

function resetLogin() {
  state.isLoggingIn = false;
  state.loginStep = 0;
  state.loginUser = null;
  dom.input.type = "text";
}
