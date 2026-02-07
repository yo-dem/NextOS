// src/system.js

import { state } from "./state.js";
import { print, clearTerminal } from "./terminal.js";
import { getNode, normalizePath } from "./fs.js";
import { updatePrompt } from "./prompt.js";
import { cmdLogout } from "./login.js";
import { VERSION } from "./config.js";

/* =========================
   HELP
========================= */

export function cmdHelp() {
  print("");
  print("NEXTOS TERMINAL - Quick Reference");
  print("");
  print("Files:     ls, cd, mv, mkdir, rmdir, rm [-r]");
  print("System:    clear, reboot, time, version");
  print("User:      login, logout");
  print("Other:     vi, theme, help");
  print("");
  print("Use '<command> --help' for detailed info");
  print("Example: ls --help, cd --help, rm --help");
  print("");
}

/* =========================
   RUN APP
========================= */

export function tryRunApp(inputPath) {
  const parts = normalizePath(state.cwd, inputPath);

  const node = getNode(parts);

  if (!node || node.type !== "lnk") {
    print(`Command not found: ${inputPath}`);
    print("");
    return;
  }

  // Get current theme from localStorage or default to classic
  const currentTheme = localStorage.getItem("terminal_theme") || "classic";

  // Build URL with theme parameter
  let appUrl = node.url;
  const separator = appUrl.includes("?") ? "&" : "?";
  appUrl += `${separator}theme=${currentTheme}`;

  print("Launching " + inputPath + "...");
  window.open(appUrl, "_blank");
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

/* =========================
   PRINT VERSION
========================= */

export function cmdPrintVersion() {
  print("" + VERSION);
  print("");
}
