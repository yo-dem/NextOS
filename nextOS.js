let currentUser = localStorage.getItem("currentUser")
  ? JSON.parse(localStorage.getItem("currentUser"))
  : {
      username: "guest",
      role: "guest",
    };

let isLoggingIn = false;
let loginStep = 0;
let loginUser = null;

/* ================================
   STORIA COMANDI
================================ */
const history = [];
let historyIndex = -1;

/* ================================
   FILESYSTEM VIRTUALE
================================ */
let fs = null; // filesystem completo
let cwd = []; // directory corrente

// Carica filesystem da JSON
async function loadFS() {
  const res = await fetch("fs.json");
  fs = await res.json();
}

/* ================================
   DOM ELEMENTS
================================ */
const input = document.getElementById("cmd");
const terminal = document.getElementById("terminal");
const caret = document.getElementById("caret");
const promptPath = document.getElementById("promptPath");

input.disabled = true;

/* ================================
   AVVIO SISTEMA
================================ */
async function startSystem() {
  await loadFS();
  bootSequence();
}

startSystem();

/* ================================
   FILESYSTEM LOGIC
================================ */
// Recupera nodo filesystem dato un path array
function getNode(pathArray) {
  let node = fs;
  for (let part of pathArray) {
    if (!node.children || !node.children[part]) return null;
    node = node.children[part];
  }
  return node;
}

/* ================================
   PROMPT LOGIC
================================ */
function getPrompt() {
  if (cwd.length === 0) return "/" + currentUser.username + "/>: ";
  return "/" + currentUser.username + "/" + cwd.join("/") + "/>: ";
}

// Aggiorna prompt e caret
function updatePrompt() {
  promptPath.textContent = getPrompt();
  updateCaret();
}

/* ================================
   COMANDI
================================ */
// Mostra contenuto directory
function cmdLs() {
  const node = getNode(cwd);
  if (!node || !node.children) {
    print("ls: not a directory");
    return;
  }

  Object.keys(node.children).forEach((name) => {
    const item = node.children[name];
    const size = item.size ?? 0;
    const icon = item.type === "dir" ? "[dir]" : "[prg]";

    if (item.type === "app") {
      print(`   ${name}  \t\t\t ${icon} ${size} KB`);
    } else {
      print(`   ${name}  \t\t\t ${icon}`);
    }
  });
}

// Cambia directory
function cmdCd(arg) {
  if (!arg) return;

  if (arg === "..") {
    cwd.pop();
    updatePrompt();
    return;
  }

  const test = getNode([...cwd, arg]);
  if (!test || test.type !== "dir") {
    print("cd: no such directory");
    return;
  }

  cwd.push(arg);
  updatePrompt();
}

// Mostra lista comandi disponibili
function cmdHelp() {
  print("");
  print("AVAILABLE COMMANDS:");
  print("");
  print(" <app>           launch app");
  print(" cd <dir>        change directory");
  print(" clear, cls      clear screen");
  print(" clock, time     show date and time");
  print(" login           switch user");
  print(" ls              list directory");
  print(" version, ver    show system version");
  print(" help            show help");
  print("");
}

// Prova a eseguire un'app se esiste nella directory corrente
function tryRunApp(name) {
  const node = getNode([...cwd, name]);
  if (!node || node.type !== "app") {
    print(`Command not found: ${name}`);
    return;
  }

  print("Launching " + name + "...");
  window.open(node.url, "_blank");
  print("done");
}

/* ================================
   BOOT SEQUENCE + LOGIN EMULATO
================================ */

async function bootSequence() {
  const bootLines = [
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
    "Mounting file system...",
    " [OK]",
    "",
    " [INFO] Establishing secure link...",
    " [INFO] SERVER AUTHENTICATED",
    "",
    "Finalizing boot sequence...",
    "",
  ];

  let index = 0;
  // let loginStep = 0; // 0=username, 1=password
  // let loginUser = null;

  function nextLine() {
    if (index < bootLines.length) {
      print(bootLines[index++]);
      setTimeout(nextLine, 150 + Math.random() * 300);
    } else {
      input.disabled = false;
      input.focus();

      setTimeout(() => {
        clearTerminal();
        const promptEl = terminal.querySelector(".prompt");
        if (promptEl) promptEl.classList.remove("hidden");

        input.focus();

        // ----------------------
        // LOGIN EMULATO
        // ----------------------
        isLoggingIn = false;

        updatePrompt();
      }, 500);
    }
  }

  setTimeout(nextLine, 800);
}

/* ================================
   TERMINALE
================================ */
function appendLine(text) {
  const div = document.createElement("div");
  div.className = "line";

  // Colori per info e tipo
  if (text.startsWith(" [INFO]")) div.style.color = "#2eb2bb";
  if (text.startsWith("   [dir]")) div.style.color = "#2eb2bb";
  if (text.startsWith("   [prg]")) div.style.color = "#bb982e";
  if (text.startsWith("NEXTOS v0.9.7 - Copyrights 1984-2026 Yodema Labs"))
    div.style.color = "#2eb2bb";

  div.textContent = text && text.trim() !== "" ? text : "\u00A0";

  terminal.insertBefore(div, terminal.querySelector(".prompt"));
  terminal.scrollTop = terminal.scrollHeight;
}

function print(text) {
  appendLine(text);
}

function clearTerminal() {
  terminal.querySelectorAll(".line").forEach((line) => line.remove());
  print(new Date().toLocaleString());
  print("SYSTEM READY");
  print("");
}

/* ================================
   CARET LOGIC
================================ */
let blinkTimeout = null;

function updateCaret() {
  const pos = input.selectionStart || 0;
  const promptLen = promptPath.textContent.length;
  caret.style.marginLeft = (promptLen + pos) * 0.6 + "em";
}

function pauseBlink() {
  caret.style.animation = "none";
  clearTimeout(blinkTimeout);

  blinkTimeout = setTimeout(() => {
    caret.style.animation = "blink 1s steps(1) infinite";
  }, 600);
}

/* ================================
   COMMAND PARSER
================================ */
function executeCommand() {
  const raw = input.value.trim();

  if (raw !== "") {
    history.push(raw);
    historyIndex = history.length;
  }

  // Stampa la riga del comando nel terminale
  function printPrompt(command) {
    const line = document.createElement("div");
    line.className = "line";

    const pathSpan = document.createElement("span");
    pathSpan.className = "prompt-path";
    pathSpan.textContent = getPrompt();

    const cmdSpan = document.createElement("span");
    cmdSpan.textContent = command;

    line.appendChild(pathSpan);
    line.appendChild(cmdSpan);

    terminal.insertBefore(line, terminal.querySelector(".prompt"));
    terminal.scrollTop = terminal.scrollHeight;
  }

  input.value = "";
  updateCaret();

  if (!raw) {
    printPrompt("");
    return;
  }

  const parts = raw.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const arg = parts[1];

  printPrompt(raw);

  switch (cmd) {
    case "ls":
      cmdLs();
      break;

    case "cd":
      cmdCd(arg);
      break;

    case "help":
      cmdHelp();
      break;

    case "clear":
    case "cls":
      clearTerminal();
      break;

    case "reboot":
      points = ".";
      print("Rebooting system");
      const promptEl = terminal.querySelector(".prompt");
      if (promptEl) promptEl.classList.add("hidden");
      setInterval(() => {
        points += ".";
        terminal.querySelectorAll(".line").forEach((line) => {
          if (line.textContent.startsWith("Rebooting system")) {
            line.textContent = "Rebooting system" + points;
          }
        });
      }, 100);
      setTimeout(() => {
        window.location.reload();
      }, 5000);

      break;

    case "time":
    case "clock":
      print(new Date().toLocaleString());
      break;

    case "version":
    case "ver":
      print("NEXTOS v1.1.7 - Copyrights 1984-2026 Yodema Labs");
      break;

    case "login":
      clearTerminal();

      isLoggingIn = true;
      loginStep = 0;
      loginUser = null;

      print("Insert username:");
      print("");

      updatePrompt();
      break;

    default:
      tryRunApp(cmd);
  }
}

/* ================================
   EVENTI INPUT
================================ */
input.addEventListener("keydown", (e) => {
  // =====================
  // LOGIN MODE
  // =====================
  if (isLoggingIn) {
    if (e.key !== "Enter") return;

    e.preventDefault();

    const value = input.value.trim();
    input.value = "";

    // STEP 0: USERNAME
    if (loginStep === 0) {
      const user = fs.users.find((u) => u.username === value);

      if (user) {
        loginUser = user;
        loginStep = 1;
        clearTerminal();
        print("Insert password: ");
        print("");
      } else {
        print("User not found.");
        print("login: please enter your username.");
      }

      return;
    }

    // STEP 1: PASSWORD
    if (loginStep === 1) {
      if (value === loginUser.password) {
        currentUser = {
          username: loginUser.username,
          role: loginUser.role,
        };

        localStorage.setItem("currentUser", JSON.stringify(currentUser));

        clearTerminal();
        print("");
        print(`Access Granted. Welcome, ${currentUser.username}!`);
        print("");

        isLoggingIn = false;
        loginStep = 0;
        loginUser = null;

        updatePrompt();
      } else {
        print("Access Denied.");
        loginStep = 0;
        loginUser = null;
        print("login: please enter your username.");
      }

      return;
    }
  }

  // =====================
  // NORMAL COMMAND MODE
  // =====================

  if (e.key === "ArrowUp") {
    if (historyIndex > 0) {
      historyIndex--;
      input.value = history[historyIndex];
      updateCaret();
    }
    e.preventDefault();
    return;
  }

  if (e.key === "ArrowDown") {
    if (historyIndex < history.length - 1) {
      historyIndex++;
      input.value = history[historyIndex];
    } else {
      historyIndex = history.length;
      input.value = "";
    }
    updateCaret();
    e.preventDefault();
    return;
  }

  if (e.key === "Enter") executeCommand();

  requestAnimationFrame(updateCaret);
  pauseBlink();
});

input.addEventListener("input", () => {
  updateCaret();
  pauseBlink();
});

input.addEventListener("click", () => {
  updateCaret();
  pauseBlink();
});

// Aggiornamento continuo caret
setInterval(updateCaret, 16);
