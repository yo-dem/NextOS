// src/boot.js

import { print } from "./terminal.js";
import { dom } from "./dom.js";
import { updatePrompt } from "./prompt.js";
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
    " [OK] VIRTUAL FILESYSTEM ",
    " [OK] VI EDITOR          ",
    " [OK] BASIC INTERPRETER  ",
    "",
    " [INFO] Virtual filesystem mounted",
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
      setTimeout(finish, 500);
    }
  }

  function finish() {
    dom.terminal.querySelector(".prompt").classList.remove("hidden");

    state.isLoggingIn = false;
    dom.input.disabled = false;
    dom.input.focus();

    updatePrompt();
  }

  setTimeout(next, 700);
}
