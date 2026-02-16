// src/input.js

import { dom } from "./dom.js";
import { state } from "./state.js";

import { updateCaret, printPrompt } from "./prompt.js";
import { handleBasicInput } from "./basic-runner.js";
import { openNano } from "./nano-editor.js";

import {
  cmdLs,
  cmdCd,
  cmdMkdir,
  cmdMkLink,
  cmdRmdir,
  cmdRm,
  cmdMv,
  cmdCp,
  cmdHelp,
  cmdClear,
  cmdLogout,
  cmdReset,
  cmdPrintDateTime,
  cmdPrintVersion,
  cmdLogin,
  cmdOpenEditor,
  cmdRunApp,
  cmdRun,
  handleConfirm,
} from "./commands.js";

import { cmdTheme } from "./theme.js";
import { showHelp, hasHelpFlag } from "./help.js";

/* ===========================
   DISPATCH
=========================== */

function runCommand(cmd, args) {
  switch (cmd) {
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

    case "mklink":
      cmdMkLink(args);
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
      cmdMv(args);
      break;

    case "cp":
      cmdCp(args);
      break;

    case "reset":
      dom.promptPath.textContent = ">:";
      updateCaret();
      cmdReset();
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
      cmdOpenEditor(args[0]);
      break;

    case "nano": {
      openNano(args[0]);
      break;
    }

    case "run":
      dom.promptPath.textContent = "";
      updateCaret();
      cmdRun(args);
      break;

    default:
      cmdRunApp(cmd);
  }
}

/* ===========================
   COMMAND EXECUTION
=========================== */

export function executeCommand() {
  const raw = dom.input.value.trim();

  if (state.waitingBasicInput) {
    const handled = handleBasicInput(raw);
    if (handled) {
      printPrompt(raw);
      dom.input.value = "";
      updateCaret();
      return;
    }
  }

  saveHistory(raw);
  clearInput();

  printPrompt(raw);

  const { cmd, args } = parseCommand(raw);

  if (state.waitingConfirm) {
    handleConfirm(cmd);
    return;
  }
  if (hasHelpFlag(args)) {
    showHelp(cmd);
    return;
  }
  if (raw) runCommand(cmd, args);
}

function saveHistory(cmd) {
  if (!cmd) return;

  state.history.push(cmd);
  state.historyIndex = state.history.length;
}

function clearInput() {
  dom.input.value = "";
  updateCaret();
}

function parseCommand(raw) {
  const parts = raw.split(/\s+/);

  return {
    cmd: parts[0],
    args: parts.slice(1),
  };
}
