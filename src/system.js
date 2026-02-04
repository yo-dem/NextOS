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
  clearTerminal(true);
  print("HELP - AVAILABLE COMMANDS");
  print("------------------------------------------------------");
  print("");
  print("  ls                      List directory contents");
  print("  cd <dir>                Change current directory");
  print("");
  print("  clear, cls              Clear terminal screen");
  print("  reboot                  Restart terminal session");
  print("  time, clock             Show current date and time");
  print("  version, ver            Show system version");
  print("");
  print("  login                   Authenticate as user");
  print("  logout                  Return to guest account");
  print("");
  print("  theme [name]            View or change color theme");
  print("");
  print("  <app>                   Launch application by name");
  print("");
  print("  help                    Show this help");
  print("");
  print("Type '<command> --help' for detailed command information");
  print("");
}

/* =========================
   RUN APP
========================= */

export function tryRunApp(name) {
  const node = getNode([...state.cwd, name]);

  if (!node || node.type !== "app") {
    print(`Command not found: ${name}`);
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

export function cmdClear(silently = false) {
  terminal.querySelectorAll(".line").forEach((l) => l.remove());
  if (!silently) {
    print(new Date().toLocaleString());
    print("SYSTEM READY");
  }
  print("");
}

/* =========================
   PRINT DATE TIME
========================= */

export function cmdPrintDateTime() {
  print(new Date().toLocaleString());
  print("");
}
