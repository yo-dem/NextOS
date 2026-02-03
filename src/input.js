// src/input.js

import { dom } from "./dom.js";
import { state } from "./state.js";

import { updateCaret, pauseBlink } from "./prompt.js";
import { print } from "./terminal.js";

import { cmdLs, cmdCd } from "./commands.js";

import { startLogin, handleLogin, cmdLogout } from "./login.js";

import {
  tryRunApp,
  cmdReboot,
  cmdHelp,
  cmdPrintDateTime,
  cmdClear,
} from "./system.js";

function printPrompt(command) {
  const line = document.createElement("div");
  line.className = "line";

  const path = document.createElement("span");
  path.className = "prompt-path";
  path.textContent = document.getElementById("promptPath").textContent;

  const cmd = document.createElement("span");
  cmd.textContent = command;

  line.appendChild(path);
  line.appendChild(cmd);

  dom.terminal.insertBefore(line, dom.terminal.querySelector(".prompt"));

  dom.terminal.scrollTop = dom.terminal.scrollHeight;
}

function executeCommand() {
  const raw = dom.input.value.trim();

  if (raw) {
    state.history.push(raw);
    state.historyIndex = state.history.length;
  }

  dom.input.value = "";
  updateCaret();

  printPrompt(raw);

  if (!raw) return;

  const [cmd, arg] = raw.split(/\s+/);

  switch (cmd.toLowerCase()) {
    case "ls":
      cmdLs();
      print("");
      break;

    case "cd":
      cmdCd(arg);
      break;

    case "help":
      cmdHelp();
      break;

    case "clear":
    case "cls":
      cmdClear();
      break;

    case "logout":
      cmdLogout();
      break;

    case "reboot":
      cmdReboot();
      break;

    case "time":
    case "clock":
      cmdPrintDateTime();
      break;

    case "version":
    case "ver":
      print(" NEXTOS TERMINAL");
      print("");
      break;

    case "login":
      startLogin();
      break;

    default:
      tryRunApp(cmd);
  }
}

dom.input.addEventListener("keydown", (e) => {
  /* LOGIN MODE */
  if (state.isLoggingIn) {
    if (e.key !== "Enter") return;

    e.preventDefault();

    const value = dom.input.value.trim();
    dom.input.value = "";

    handleLogin(value);
    return;
  }

  /* HISTORY UP */
  if (e.key === "ArrowUp") {
    if (state.historyIndex > 0) {
      state.historyIndex--;

      dom.input.value = state.history[state.historyIndex];

      updateCaret();
    }

    e.preventDefault();
    return;
  }

  /* HISTORY DOWN */
  if (e.key === "ArrowDown") {
    if (state.historyIndex < state.history.length - 1) {
      state.historyIndex++;

      dom.input.value = state.history[state.historyIndex];
    } else {
      state.historyIndex = state.history.length;
      dom.input.value = "";
    }

    updateCaret();
    e.preventDefault();
    return;
  }

  /* EXECUTE */
  if (e.key === "Enter") {
    executeCommand();
  }

  requestAnimationFrame(updateCaret);
  pauseBlink();
});

dom.input.addEventListener("input", () => {
  updateCaret();
  pauseBlink();
});

dom.input.addEventListener("click", () => {
  updateCaret();
  pauseBlink();
});
