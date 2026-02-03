// src/main.js

import { VERSION } from "./config.js";
import { dom } from "./dom.js";
import { loadFS } from "./fs.js";
import { bootSequence } from "./boot.js";
import { updateCaret } from "./prompt.js";
import "./input.js";

async function start() {
  dom.version.innerText = "NextOS " + VERSION;

  dom.input.disabled = true;

  await loadFS();

  bootSequence();
}

start();

setInterval(updateCaret, 16);
