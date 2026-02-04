// src/boot.js

import { print, clearTerminal } from "./terminal.js";
import { dom } from "./dom.js";
import { updatePrompt } from "./prompt.js";
import { state } from "./state.js";

export function bootSequence() {
  const lines = [
    "Booting NextOS kernel...",
    // " [OK]",
    // "",
    // "Loading core modules:",
    // " [OK] MEMORY...",
    // " [OK] IO...",
    // " [OK] NETWORK...",
    // "",
    // "Checking devices...",
    // " [OK]",
    // "",
    // "",
    // " [INFO] Establishing secure link...",
    // " [INFO] Server authenticated.",
    // " [INFO] Virtual filesystem mounted",
    // "",
    // "Finalizing boot sequence...",
    "",
  ];

  let i = 0;

  function next() {
    if (i < lines.length) {
      print(lines[i++]);
      setTimeout(next, 200);
    } else {
      setTimeout(finish, 500);
    }
  }

  function finish() {
    clearTerminal();

    dom.terminal.querySelector(".prompt").classList.remove("hidden");

    state.isLoggingIn = false;
    dom.input.disabled = false;
    dom.input.focus();

    updatePrompt();
  }

  setTimeout(next, 800);
}
