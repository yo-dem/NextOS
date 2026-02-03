// src/system.js

import { state } from "./state.js";
import { print, clearTerminal } from "./terminal.js";
import { getNode } from "./fs.js";
import { updatePrompt } from "./prompt.js";
import { cmdLogout } from "./login.js";

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
  print("   ls              list directory");
  print("   reboot          reboot system");
  print("   theme           list or set terminal theme");
  print("   version, ver    show system version");
  print("");
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

  const lines = [
    "",
    "Shutting down modules...",
    " [OK] NETWORK...",
    " [OK] IO...",
    " [OK] MEMORY...",
    "",
    " [INFO] All temporary files cleared.",
    " [INFO] System state saved successfully.",
    "",
    " Saving system state...",
    "",
    " [INFO] System state saved [OK] Preparing for reboot...",
    "",
  ];

  let index = 0;

  const promptEl = terminal.querySelector(".prompt");
  if (promptEl) promptEl.classList.add("hidden");

  cmdLogout(true);

  function nextLine() {
    if (index < lines.length) {
      print(lines[index++]);
      setTimeout(nextLine, 150 + Math.random() * 300);
    } else {
      setTimeout(() => {
        clearTerminal();

        const promptEl = terminal.querySelector(".prompt");
        if (promptEl) promptEl.classList.remove("hidden");
        document.getElementById("cmd").focus();
      }, 500);
    }
  }

  setTimeout(nextLine, 800);
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
  print(new Date().toLocaleString());
  print("");
}
