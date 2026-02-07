// src/main.js

import { VERSION } from "./config.js";
import { dom } from "./dom.js";
import { loadFS } from "./fs.js";
import { bootSequence } from "./boot.js";
import { applyTheme } from "./theme.js";
import { state, loadTheme } from "./state.js";
import {
  handleHistory,
  handleNavigation,
  handleLoginMode,
} from "./handlers.js";
import { updateCaret, pauseBlink } from "./prompt.js";
import { executeCommand } from "./input.js";

async function start() {
  dom.version.innerText = VERSION;

  dom.input.disabled = true;

  const savedTheme = loadTheme();
  applyTheme(savedTheme);

  await loadFS();

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
