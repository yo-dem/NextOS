// src/boot.js

import { print, clearTerminal } from "./terminal.js";
import { dom } from "./dom.js";
import { updatePrompt } from "./prompt.js";
import { state } from "./state.js";

export function bootSequence() {
  print("");
  print("      ▄▀▄     ▄▀▄");
  print("     ▄█░░▀▀▀▀▀░░█▄");
  print(" ▄▄  █░░░░░░░░░░░█  ▄▄");
  print("█▄▄█ █░░▀░░┬░░▀░░█ █▄▄█");
  print("");

  const lines = [
    "Booting NextOS kernel...",
    " [OK]",
    "",
    "Loading core modules:",
    " [OK] VIRTUAL FILESYSTEM ",
    " [OK] VI EDITOR          ",
    " [OK] BASIC INTERPRETER  ",
    "",
    " [INFO] Virtual filesystem mounted",
    " [INFO] Initializing user interface...",
    " [INFO] Starting background services...",
    "",
    "Welcome to NextOS!",
    "",
    "",
  ];

  let i = 0;

  function next() {
    if (i < lines.length) {
      print(lines[i++]);
      setTimeout(next, 100);
    } else {
      setTimeout(finish, 2200);
    }
  }

  function finish() {
    dom.version.style.display = "none";
    clearTerminal();

    dom.terminal.querySelector(".prompt").classList.remove("hidden");

    state.isLoggingIn = false;
    dom.input.disabled = false;
    dom.input.focus();

    updatePrompt();
  }

  setTimeout(next, 700);
}
