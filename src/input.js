// src/input.js

import { dom } from "./dom.js";
import { state } from "./state.js";

import { updateCaret, printPrompt } from "./prompt.js";

import {
  cmdLs,
  cmdCd,
  cmdMkdir,
  cmdRmdir,
  cmdRm,
  CmdMv,
  handleConfirm,
} from "./commands.js";

import { startLogin, cmdLogout } from "./login.js";

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

/* ===========================
   COMMAND EXECUTION
=========================== */

export function executeCommand() {
  const raw = dom.input.value.trim();

  saveHistory(raw);
  clearInput();

  printPrompt(raw);

  if (!raw) return;

  const { cmd, args } = parseCommand(raw);

  if (state.waitingConfirm) {
    handleConfirm(cmd);
    return;
  }

  if (hasHelpFlag(args)) {
    showHelp(cmd);
    return;
  }

  runCommand(cmd, args);
}

function saveHistory(cmd) {
  if (!cmd) return;

  state.history.push(cmd);
  state.historyIndex = state.history.length;
}

export function clearInput() {
  dom.input.value = "";
  updateCaret();
}

function parseCommand(raw) {
  const parts = raw.split(/\s+/);

  return {
    cmd: parts[0].toLowerCase(),
    args: parts.slice(1),
  };
}

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

    case "rmdir":
      preparePrompt();
      cmdRmdir(args[0]);
      break;

    case "rm":
      preparePrompt();
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

function preparePrompt() {
  dom.promptPath.textContent = ">:";
  updateCaret();
}
