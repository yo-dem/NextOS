// src/main.js

import { state, loadTheme, VERSION } from "./state.js";
import { dom } from "./dom.js";
import { loadFS } from "./fs.js";
import { applyTheme } from "./theme.js";
import { updateCaret, pauseBlink } from "./prompt.js";
import { executeCommand } from "./input.js";
import { bootSequence } from "./boot.js";
import {
  handleHistory,
  handleNavigation,
  handleLoginMode,
} from "./handlers.js";

async function start() {
  await loadFS();

  let savedTheme = loadTheme();
  applyTheme(savedTheme || "dracula");

  bootSequence();

  dom.input.addEventListener("keydown", handleMainInput);
}

function handleMainInput(e) {
  if (state.editorActive) return;

  if (handleLoginMode(e)) return;
  if (handleHistory(e)) return;
  if (handleNavigation(e)) return;

  if (e.key === "Enter") {
    executeCommand();
    return;
  }

  requestAnimationFrame(updateCaret);
  pauseBlink();
}

start();
