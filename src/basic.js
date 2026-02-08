// src/basic.js

import { state } from "./state.js";
import { dom } from "./dom.js";
import { normalizePath, saveFS, getNode } from "./fs.js";

/* ==========================
   STATE
========================== */

let program = new Map();
let vars = {};

let overlay = null;
let display = null;
let status = null;

let inputBuffer = "";
let outputBuffer = [];

let running = false;

/* ==========================
   ENTRY
========================== */

export function startBasic() {
  state.basicActive = true;

  createUI();
  render();
}

/* ==========================
   UI
========================== */

function createUI() {
  // hide shell
  dom.terminal.querySelector(".prompt").style.display = "none";

  overlay = document.createElement("div");

  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: var(--bg-color);
    color: var(--text-color);
    font-family: monospace;
    display: flex;
    flex-direction: column;
    padding: 20px;
    z-index: 1000;
  `;

  display = document.createElement("pre");
  display.style.cssText = `
    flex: 1;
    overflow-y: auto;
    margin: 0;
    white-space: pre-wrap;
  `;

  status = document.createElement("div");
  status.style.cssText = `
    border-top: 1px solid var(--prompt-color);
    padding-top: 6px;
    color: var(--prompt-color);
  `;

  overlay.appendChild(display);
  overlay.appendChild(status);

  document.body.appendChild(overlay);

  document.addEventListener("keydown", keyHandler);
}

/* ==========================
   RENDER
========================== */

function render() {
  let out = "";

  // header
  out += "NEXTOS BASIC v0.1\n";
  out += "================\n\n";

  // program
  const lines = [...program.entries()].sort((a, b) => a[0] - b[0]);

  for (const [n, c] of lines) {
    out += n.toString().padStart(4, " ") + " " + c + "\n";
  }

  out += "\n";
  if (outputBuffer.length) {
    out += "OUTPUT:\n";
    out += "-------\n";

    for (const line of outputBuffer) {
      out += line + "\n";
    }

    out += "\n";
  }
  // prompt
  out += "> " + inputBuffer + "▌";

  display.textContent = out;

  status.textContent =
    "LINES: " +
    program.size +
    "   VARS: " +
    Object.keys(vars).length +
    "   ESC = EXIT";
}

/* ==========================
   INPUT
========================== */

function keyHandler(e) {
  if (!state.basicActive) return;

  e.preventDefault();

  if (e.key === "Escape") {
    exitBasic();
    return;
  }

  if (e.key === "Enter") {
    handleLine(inputBuffer.trim());
    inputBuffer = "";
    render();
    return;
  }

  if (e.key === "Backspace") {
    inputBuffer = inputBuffer.slice(0, -1);
    render();
    return;
  }

  if (e.key.length === 1) {
    inputBuffer += e.key;
    render();
  }
}

/* ==========================
   CORE
========================== */

function handleLine(line) {
  if (!line) return;

  // numbered
  if (/^\d+/.test(line)) {
    storeLine(line);
    return;
  }

  execute(line.toUpperCase());
}

/* ==========================
   STORAGE
========================== */

function storeLine(line) {
  const m = line.match(/^(\d+)\s*(.*)$/);

  if (!m) return;

  const n = Number(m[1]);
  const code = m[2];

  if (!code) program.delete(n);
  else program.set(n, code);
}

/* ==========================
   COMMANDS
========================== */

function execute(cmd) {
  const parts = cmd.split(" ");

  switch (parts[0]) {
    case "RUN":
      run();
      break;

    case "LIST":
      break;

    case "NEW":
      program.clear();
      vars = {};
      break;

    case "EXIT":
      exitBasic();
      break;

    default:
      output("SYNTAX ERROR");
  }
}

/* ==========================
   EXECUTION
========================== */

function run() {
  vars = {};
  running = true;
  outputBuffer = [];

  const lines = [...program.entries()].sort((a, b) => a[0] - b[0]);

  let pc = 0;

  while (running && pc < lines.length) {
    const [, code] = lines[pc];

    pc = execLine(code, lines, pc);
  }

  output("READY");
}

/* ==========================
   LINE EXEC
========================== */

function execLine(code, lines, pc) {
  const parts = code.trim().split(" ");
  const cmd = parts[0];

  // PRINT
  if (cmd === "PRINT") {
    let text = code.slice(5).trim();

    // rimuove virgolette se ci sono
    if (
      (text.startsWith('"') && text.endsWith('"')) ||
      (text.startsWith("'") && text.endsWith("'"))
    ) {
      text = text.slice(1, -1);
    }

    output(text);
    return pc + 1;
  }

  // END
  if (cmd === "END") {
    running = false;
    return lines.length;
  }

  return pc + 1;
}

/* ==========================
   OUTPUT
========================== */

function output(text) {
  outputBuffer.push(String(text));
}

/* ==========================
   EXIT
========================== */

function exitBasic() {
  state.basicActive = false;

  document.removeEventListener("keydown", keyHandler);

  if (overlay) document.body.removeChild(overlay);

  dom.terminal.querySelector(".prompt").style.display = "flex";
  dom.input.focus();
}
