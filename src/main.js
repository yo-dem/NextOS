// src/main.js

import { dom } from "./dom.js";
import { loadFS } from "./fs.js";
import { bootSequence } from "./boot.js";
import { loadTheme } from "./state.js";
import { applyTheme } from "./theme.js";

import { executeCommand } from "./input.js";

export const VERSION_NUMBER = "v1.1.7";
export const VERSION = "NextOS Terminal [" + VERSION_NUMBER + "] - 1984-2026 -";

async function start() {
  const savedTheme = loadTheme();
  applyTheme(savedTheme);

  dom.version.innerText = VERSION;

  await loadFS();
  bootSequence();

  dom.input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      executeCommand();
      return;
    }
  });
}

start();
