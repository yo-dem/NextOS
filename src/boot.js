// src/boot.js

import { print } from "./terminal.js";
import { dom } from "./dom.js";
import { updateCaret, updatePrompt } from "./prompt.js";
import { state, VERSION } from "./state.js";

export function bootSequence() {
  print("      ▄▀▄     ▄▀▄");
  print("     ▄█░░▀▀▀▀▀░░█▄");
  print(" ▄▄  █░░░░░░░░░░░█  ▄▄");
  print("█▄▄█ █░░▀░░┬░░▀░░█ █▄▄█");
  print("");
  print(VERSION);
  print("");

  const lines = [
    "Booting NextOS kernel...",
    " [OK]",
    "",
    "Loading core modules:",
    "",
    " [OK] FILESYSTEM NextVFS             1.1.7",
    " [OK] EDITOR NextVI                  1.0.0",
    " [OK] EDITOR NextNANO                1.0.0",
    " [OK] INTERPRETER NextBASIC          0.7.1",
    "",
    " [INFO] Initializing user interface...",
    "",
    "Welcome to NextOS!",
    "",
  ];

  let i = 0;

  function next() {
    if (i < lines.length) {
      print(lines[i++]);
      setTimeout(next, 100);
    } else {
      dom.terminal.querySelector(".prompt").classList.remove("hidden");
      setTimeout(finish, 500);
    }
  }

  function finish() {
    state.isLoggingIn = false;
    dom.input.disabled = false;
    dom.input.focus();

    updatePrompt();
  }

  setTimeout(next, 700);
}
