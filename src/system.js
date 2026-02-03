// src/system.js

import { state } from "./state.js";
import { print, clearTerminal } from "./terminal.js";
import { getNode } from "./fs.js";
import { updatePrompt } from "./prompt.js";

/* =========================
   HELP
========================= */

export function cmdHelp() {
  print(" AVAILABLE COMMANDS:");
  print("   <app>           launch app");
  print("   cd <dir>        change directory");
  print("   clear, cls      clear screen");
  print("   clock, time     show date and time");
  print("   login           switch user");
  print("   logout          logout current user");
  print("   reboot          reboot system");
  print("   ls              list directory");
  print("   version, ver    show system version");
  print("   help            show help");
  print("");
}

/* =========================
   RUN APP
========================= */

export function tryRunApp(name) {
  const node = getNode([...state.cwd, name]);

  if (!node || node.type !== "app") {
    print(` Command not found: ${name}`);
    print("");
    return;
  }

  print("Launching " + name + "...");
  window.open(node.url, "_blank");
  print("done");
  print("");
}

/* =========================
   REBOOT
========================= */

export function cmdReboot() {
  cmdSoftReset();

  clearTerminal();

  print("Rebooting system...");
  print("");

  const lines = [
    "Booting NextOS kernel...",
    " [OK]",
    "",
    "Loading core modules:",
    " [OK] MEMORY...",
    " [OK] IO...",
    " [OK] NETWORK...",
    "",
    "Checking devices...",
    " [OK]",
    "",
    "",
    " [INFO] Establishing secure link...",
    " [INFO] Server authenticated.",
    " [INFO] Virtual filesystem mounted",
    "",
    "Finalizing boot sequence...",
    "",
  ];

  let i = 0;

  function next() {
    if (i < lines.length) {
      print(lines[i++]);
      setTimeout(next, 200);
    } else {
      setTimeout(finish, 500);
    }
  }

  setTimeout(() => {
    location.reload();
  }, 1500);
}

/* =========================
   SOFT RESET
========================= */

function cmdSoftReset() {
  state.cwd = [];
  updatePrompt();
}

/* =========================
   CLEAR SCREEN
========================= */

export function cmdClear() {
  terminal.querySelectorAll(".line").forEach((l) => l.remove());

  print(new Date().toLocaleString());
  print("SYSTEM READY");
  print("");
}

/* =========================
   PRINT DATE TIME
========================= */

export function cmdPrintDateTime() {
  print(" " + new Date().toLocaleString());
  print("");
}
