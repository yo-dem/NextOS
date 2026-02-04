// src/input.js

import { dom } from "./dom.js";
import { state } from "./state.js";

import { updateCaret, pauseBlink } from "./prompt.js";
import { print } from "./terminal.js";

import { cmdLs, cmdCd, cmdMkdir, cmdRmdir, cmdRm } from "./commands.js";

import { startLogin, handleLogin, cmdLogout } from "./login.js";

import {
  tryRunApp,
  cmdReboot,
  cmdHelp,
  cmdPrintDateTime,
  cmdClear,
} from "./system.js";

import { cmdTheme } from "./theme.js";
import { showHelp, hasHelpFlag } from "./help-utils.js";
import { openEditor, isEditorActive } from "./editor.js";

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

  const parts = raw.split(/\s+/);
  const cmd = parts[0];
  const args = parts.slice(1);

  if (hasHelpFlag(args)) {
    showHelp(cmd.toLowerCase());
    return;
  }

  switch (cmd.toLowerCase()) {
    case "ls":
      cmdLs();
      break;

    case "cd":
      cmdCd(args[0]);
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

    case "mkdir":
      cmdMkdir(args[0]);
      break;

    case "rmdir":
      cmdRmdir(args[0]);
      break;

    case "rm":
      cmdRm(args);
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
      print("NEXTOS TERMINAL");
      print("");
      break;

    case "login":
      startLogin();
      break;

    case "theme":
      cmdTheme(args);
      break;

    case "vi":
    case "vim":
      openEditor(args[0]);
      break;

    default:
      tryRunApp(cmd);
  }
}

// KEYDOWN - Un solo listener!
dom.input.addEventListener("keydown", (e) => {
  // Se l'editor è attivo, non processare input del terminal
  if (isEditorActive()) return;

  /* LOGIN MODE */
  if (state.isLoggingIn) {
    if (e.key !== "Enter") return;

    e.preventDefault();

    const value = dom.input.value.trim();
    dom.input.value = "";
    updateCaret();

    handleLogin(value);
    return;
  }

  /* HISTORY UP */
  if (e.key === "ArrowUp") {
    if (e.shiftKey) return;

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
    if (e.shiftKey) return;

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

  /* AGGIORNA CURSORE PER FRECCE LATERALI E SELEZIONI */
  if (
    e.key === "ArrowLeft" ||
    e.key === "ArrowRight" ||
    e.key === "Home" ||
    e.key === "End"
  ) {
    requestAnimationFrame(updateCaret);
    pauseBlink();
    return;
  }

  /* EXECUTE */
  if (e.key === "Enter") {
    executeCommand();
    return;
  }

  requestAnimationFrame(updateCaret);
  pauseBlink();
});

// INPUT
dom.input.addEventListener("input", (e) => {
  // Se siamo nel passo password, gestisci il buffer nascosto
  if (state.isLoggingIn && state.loginStep === 1) {
    const currentValue = dom.input.value;
    const previousLength = state.passwordBuffer.length;

    // Se l'utente ha aggiunto caratteri
    if (currentValue.length > previousLength) {
      const newChars = currentValue.substring(previousLength);
      state.passwordBuffer += newChars;
    }
    // Se l'utente ha cancellato caratteri
    else if (currentValue.length < previousLength) {
      state.passwordBuffer = state.passwordBuffer.substring(
        0,
        currentValue.length,
      );
    }

    // Mostra solo asterischi
    dom.input.value = "*".repeat(state.passwordBuffer.length);
  }

  updateCaret();
  pauseBlink();
});

// SELECTION CHANGE
document.addEventListener("selectionchange", () => {
  if (document.activeElement === dom.input) {
    updateCaret();
  }
});

// CLICK
dom.input.addEventListener("click", () => {
  updateCaret();
  pauseBlink();
});
