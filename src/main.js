// src/main.js

import { VERSION } from "./config.js";
import { dom } from "./dom.js";
import { loadFS } from "./fs.js";
import { bootSequence } from "./boot.js";
import { loadTheme } from "./state.js";
import { applyTheme } from "./theme.js";
import "./input.js";

async function start() {
  dom.version.innerText = VERSION;

  dom.input.disabled = true;

  const savedTheme = loadTheme();
  applyTheme(savedTheme);

  await loadFS();

  bootSequence();
}

start();
