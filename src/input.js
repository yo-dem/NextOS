// src/input.js

import { dom } from "./dom.js";
import { state } from "./state.js";

import { printPrompt, updateCaret, pauseBlink } from "./prompt.js";
import { print } from "./terminal.js";

import {
  cmdLs,
  cmdCd,
  cmdMkdir,
  cmdRmdir,
  cmdRm,
  CmdMv,
  handleConfirm,
} from "./commands.js";

import { cmdLogin, handleLogin, cmdLogout } from "./login.js";

import {
  tryRunApp,
  cmdReboot,
  cmdHelp,
  cmdPrintDateTime,
  cmdPrintVersion,
  cmdClear,
} from "./system.js";

import { cmdTheme } from "./theme.js";
import { showHelp, hasHelpFlag } from "./help.js";
import { openEditor } from "./editor.js";
import { autocomplete } from "./fs.js";

export function executeCommand() {
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

  if (state.waitingConfirm) {
    handleConfirm(cmd);
    return;
  }

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
      dom.promptPath.textContent = ">:";
      updateCaret();
      cmdRmdir(args[0]);
      break;

    case "rm":
      dom.promptPath.textContent = ">:";
      updateCaret();
      cmdRm(args);
      break;

    case "mv":
      CmdMv(args);
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
      cmdPrintVersion();
      break;

    case "login":
      cmdLogin();
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

dom.input.addEventListener("keydown", (e) => {
  // Se l'editor è attivo, non processare input del terminal
  if (state.editorActive) return;

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

  requestAnimationFrame(updateCaret);
  pauseBlink();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    const input = dom.input.value;

    const result = autocomplete(input, state.cwd);

    if (result.matches.length === 0) return;

    const base = result.parts.join(" ");
    const spacer = base ? " " : "";

    if (result.matches.length === 1) {
      dom.input.value = base + spacer + result.basePath + result.matches[0];
    } else {
      print(result.matches.join("  "));
    }

    updateCaret();
  }
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
