// src/help.js

import { print } from "./terminal.js";

/* =========================
   HELP DATABASE
========================= */

export const helpTexts = {
  ls: [
    "Usage: ls",
    "",
    "Description:",
    "  List directory contents.",
    "",
    "Examples:",
    "  ls",
    "  ls --help",
  ],

  cd: [
    "Usage: cd <dir>",
    "",
    "Description:",
    "  Change directory.",
    "",
    "Arguments:",
    "  dir   Path (.. /)",
    "",
    "Examples:",
    "  cd docs",
    "  cd ..",
  ],

  mv: [
    "Usage: mv <src> <dst>",
    "",
    "Description:",
    "  Move or rename files.",
    "",
    "Arguments:",
    "  src   Source path",
    "  dst   Destination",
    "",
    "Examples:",
    "  mv a b",
  ],

  mkdir: [
    "Usage: mkdir <dir>",
    "",
    "Description:",
    "  Create directory.",
    "",
    "Arguments:",
    "  dir   Name",
    "",
    "Example:",
    "  mkdir test",
  ],

  rmdir: [
    "Usage: rmdir <dir>",
    "",
    "Description:",
    "  Remove empty directory.",
    "",
    "Arguments:",
    "  dir   Name",
    "",
    "Example:",
    "  rmdir test",
  ],

  rm: [
    "Usage: rm [-r] <path>",
    "",
    "Description:",
    "  Remove files or folders.",
    "",
    "Options:",
    "  -r   Recursive",
    "",
    "Examples:",
    "  rm file",
    "  rm -r dir",
  ],

  clear: [
    "Usage: clear",
    "",
    "Description:",
    "  Clear screen.",
    "",
    "Alias:",
    "  cls",
    "",
    "Example:",
    "  clear",
  ],

  cls: [
    "Usage: cls",
    "",
    "Description:",
    "  Clear screen.",
    "",
    "Alias:",
    "  clear",
    "",
    "Example:",
    "  cls",
  ],

  reboot: [
    "Usage: reboot",
    "",
    "Description:",
    "  Restart session.",
    "",
    "Warning:",
    "  Logs out user.",
    "",
    "Example:",
    "  reboot",
  ],

  time: [
    "Usage: time",
    "",
    "Description:",
    "  Show date/time.",
    "",
    "Alias:",
    "  clock",
    "",
    "Example:",
    "  time",
  ],

  clock: [
    "Usage: clock",
    "",
    "Description:",
    "  Show date/time.",
    "",
    "Alias:",
    "  time",
    "",
    "Example:",
    "  clock",
  ],

  version: [
    "Usage: version",
    "",
    "Description:",
    "  Show version.",
    "",
    "Alias:",
    "  ver",
    "",
    "Example:",
    "  version",
  ],

  ver: [
    "Usage: ver",
    "",
    "Description:",
    "  Show version.",
    "",
    "Alias:",
    "  version",
    "",
    "Example:",
    "  ver",
  ],

  login: [
    "Usage: login",
    "",
    "Description:",
    "  Start login.",
    "",
    "Process:",
    "  user → pass",
    "",
    "Example:",
    "  login",
  ],

  logout: [
    "Usage: logout",
    "",
    "Description:",
    "  Return to guest.",
    "",
    "Example:",
    "  logout",
  ],

  vi: [
    "Usage: vi <file>",
    "",
    "Description:",
    "  Text editor.",
    "",
    "Commands:",
    "  i ESC :w :q",
    "",
    "Example:",
    "  vi notes.txt",
  ],

  theme: [
    "Usage: theme [name]",
    "",
    "Description:",
    "  Change theme.",
    "",
    "Available:",
    "  matrix ocean retro",
    "",
    "Example:",
    "  theme matrix",
  ],

  help: [
    "Usage: help [cmd]",
    "",
    "Description:",
    "  Show help.",
    "",
    "Arguments:",
    "  cmd   Command",
    "",
    "Examples:",
    "  help",
    "  help ls",
  ],
};

/* =========================
   HELP ENGINE
========================= */

export function showHelp(command) {
  const helpLines = helpTexts[command];

  if (!helpLines) {
    print(`No help available for: ${command}`);
    print("");
    return;
  }

  print("");

  for (const line of helpLines) {
    print(line);
  }

  print("");
}

export function hasHelpFlag(args) {
  return args.includes("--help") || args.includes("-h");
}
