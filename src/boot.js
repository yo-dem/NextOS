// src/boot.js

import { print, clearTerminal } from "./terminal.js";
import { dom } from "./dom.js";
import { updatePrompt } from "./prompt.js";
import { state } from "./state.js";

export function bootSequence() {
  const lines = [
    "NextOS BIOS v3.9.2",
    "Yodema Labs 1984-2026",
    "",
    "Mounting virtual filesystem...",
    "",
    "Loading GUEST",
    "",
    "Loading kernel modules...",
    "",
    "[OK] Modules loaded",
  ];

  let i = 0;

  function next() {
    if (i < lines.length) {
      print(lines[i++]);
      setTimeout(next, 120);
    } else {
      setTimeout(finish, 600);
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

  setTimeout(next, 700);
}
