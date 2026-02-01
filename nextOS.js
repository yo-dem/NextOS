/* ==================================================
   NEXTOS TERMINAL - YODEMA LABS 1984-2026
   VERSION 1.1.7
   ================================================== */

const version = "v1.1.7";

/* ==================================================
   USER SESSION
   ================================================== */

let currentUser = localStorage.getItem("currentUser")
  ? JSON.parse(localStorage.getItem("currentUser"))
  : {
      username: "guest",
      role: "guest",
    };

let isLoggingIn = false;
let loginStep = 0;
let loginUser = null;

/* ==================================================
   COMMAND HISTORY
   ================================================== */

const history = [];
let historyIndex = -1;

/* ==================================================
   FILESYSTEM STATE
   ================================================== */

let fs = null; // filesystem root
let cwd = []; // current working directory

/* ==================================================
   DOM REFERENCES
   ================================================== */

const input = document.getElementById("cmd");
const terminal = document.getElementById("terminal");
const caret = document.getElementById("caret");
const promptPath = document.getElementById("promptPath");

input.disabled = true;

/* ==================================================
   SYSTEM BOOT
   ================================================== */

async function startSystem() {
  await loadFS();
  bootSequence();
}

startSystem();

/* ==================================================
   FILESYSTEM LOADING & ACCESS
   ================================================== */

async function loadFS() {
  const res = await fetch("fs.json");
  fs = await res.json();
}

function getNode(pathArray) {
  let node = fs;

  for (const part of pathArray) {
    if (!node.children || !node.children[part]) return null;
    node = node.children[part];
  }

  return node;
}

/* ==================================================
   PROMPT MANAGEMENT
   ================================================== */

function getPrompt() {
  const base = `/${currentUser.username}`;

  if (cwd.length === 0) return base + "/>: ";

  return base + "/" + cwd.join("/") + "/>: ";
}

// Update prompt and caret
function updatePrompt() {
  promptPath.textContent = getPrompt();
  updateCaret();
}

/* ==================================================
   TERMINAL OUTPUT
   ================================================== */

function appendLine(text) {
  const div = document.createElement("div");
  div.className = "line";

  // Color rules
  if (text.startsWith(" [INFO]")) div.style.color = "#2eb2bb";
  // if (text.includes("   [dir]")) div.style.color = "#a4a7da";
  // if (text.includes("   [prg]")) div.style.color = "#f0c58c";

  div.textContent = text && text.trim() !== "" ? text : "\u00A0";

  terminal.insertBefore(div, terminal.querySelector(".prompt"));
  terminal.scrollTop = terminal.scrollHeight;
}

function print(text) {
  appendLine(text);
}

// Clear screen and print banner
function clearTerminal() {
  terminal.querySelectorAll(".line").forEach((l) => l.remove());

  print(new Date().toLocaleString());
  print("SYSTEM READY");
  print("");
}

/* ==================================================
   FILESYSTEM COMMANDS
   ================================================== */

function cmdLs() {
  const node = getNode(cwd);

  if (!node || !node.children) {
    print("ls: not a directory");
    return;
  }

  let fileCount = 0;
  let dirCount = 0;

  const COL_WIDTH = 40; // larghezza colonna nome

  print("");
  const parent1Padded = ".".padEnd(COL_WIDTH);
  print(`   ${parent1Padded}[*]`);
  const parent2Padded = "..".padEnd(COL_WIDTH);
  print(`   ${parent2Padded}[*]`);

  Object.entries(node.children).forEach(([name, item]) => {
    const size = item.size ?? 0;
    const icon = item.type === "dir" ? "[dir]" : "[prg]";

    const paddedName = name.padEnd(COL_WIDTH);

    if (item.type === "dir") {
      dirCount++;
      print(`   ${paddedName}${icon}`);
    } else {
      fileCount++;
      print(`   ${paddedName}${icon} ${size} KB`);
    }
  });
  print("");
  print(`   ${dirCount} directory(s), ${fileCount} file(s)`);
}

// Change directory
function cmdCd(arg) {
  if (!arg) return;

  if (arg === "..") {
    cwd.pop();
    updatePrompt();
    return;
  }

  const target = getNode([...cwd, arg]);

  if (!target || target.type !== "dir") {
    print("cd: no such directory");
    return;
  }

  cwd.push(arg);
  updatePrompt();
}

/* ==================================================
   SYSTEM COMMANDS
   ================================================== */

function cmdHelp() {
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

function tryRunApp(name) {
  const node = getNode([...cwd, name]);

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

function cmdReboot() {
  cmdLogout();

  const promptEl = terminal.querySelector(".prompt");
  if (promptEl) promptEl.classList.add("hidden");

  const shutdownMessages = [
    "Shutting down modules...",
    " [OK] NETWORK...",
    " [OK] IO...",
    " [OK] MEMORY...",
    "",
    " [INFO] Switching to user: " + currentUser.username,
    " [INFO] All temporary files cleared.",
    " [INFO] System state saved successfully.",
    "",
    " Saving system state...",
    "",
    " [INFO] System state saved [OK] Preparing for reboot...",
    "",
  ];

  let index = 0;

  clearTerminal();
  print("Rebooting system");
  print("");

  function printNextMessage() {
    if (index >= shutdownMessages.length) {
      print("");
      print("Press any key to start system...");
      waitForKeyPress(startSystem); // funzione che riavvia il boot
      return;
    }

    const msg = shutdownMessages[index];

    // Se è il messaggio di salvataggio sistema, facciamo progress dinamico
    if (msg === " Saving system state...") {
      print(msg);
      simulateProgress(() => {
        index++;
        printNextMessage();
      });
    } else {
      print(msg);
      index++;
      const delay = 400 + Math.random() * 800;
      setTimeout(printNextMessage, delay);
    }
  }

  printNextMessage();
}

/* ================================
   Funzione progress dinamico
================================ */

function simulateProgress(callback) {
  let percent = 0;

  function step() {
    if (percent > 100) {
      callback();
      return;
    }

    const progressLine = ` Saving system state... ${percent}%`;
    print(progressLine);
    percent += Math.floor(10 + Math.random() * 20); // incremento casuale

    const delay = 200 + Math.random() * 300;
    setTimeout(step, delay);
  }

  step();
}

/* ================================
   Funzione per rilevare un tasto
================================ */

function waitForKeyPress(callback) {
  function handler(e) {
    document.removeEventListener("keydown", handler);
    terminal.querySelectorAll(".line").forEach((l) => l.remove());
    callback();
  }
  document.addEventListener("keydown", handler);
}

/* ==================================================
   BOOT SEQUENCE
   ================================================== */

function bootSequence() {
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
    "",
    " [INFO] Establishing secure link...",
    " [INFO] Server authenticated.",
    " [INFO] Virtual filesystem mounted",
    "",
    "Finalizing boot sequence...",
    "",
  ];

  let index = 0;

  function nextLine() {
    if (index < bootLines.length) {
      print(bootLines[index++]);
      setTimeout(nextLine, 150 + Math.random() * 300);
    } else {
      setTimeout(() => {
        clearTerminal();

        const promptEl = terminal.querySelector(".prompt");
        if (promptEl) promptEl.classList.remove("hidden");

        isLoggingIn = false;
        input.disabled = false;
        input.focus();

        updatePrompt();
      }, 500);
    }
  }

  setTimeout(nextLine, 800);
}

/* ==================================================
   CARET MANAGEMENT
   ================================================== */

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

/* ==================================================
   COMMAND EXECUTION
   ================================================== */

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

function executeCommand() {
  const raw = input.value.trim();

  if (raw) {
    history.push(raw);
    historyIndex = history.length;
  }

  input.value = "";
  updateCaret();

  printPrompt(raw);

  if (!raw) return;

  const [cmd, arg] = raw.split(/\s+/);

  switch (cmd.toLowerCase()) {
    case "ls":
      cmdLs();
      print("");
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

    case "logout":
      cmdLogout();
      break;

    case "reboot":
      cmdReboot();
      break;

    case "time":
    case "clock":
      print(" " + new Date().toLocaleString());
      print("");
      break;

    case "version":
    case "ver":
      print(" " + "NEXTOS TERMINAL " + version + " - YODEMA LABS 1984-2026");
      print("");
      break;

    case "login":
      startLogin();
      break;

    default:
      tryRunApp(cmd);
  }
}

/* ==================================================
   LOGIN SYSTEM
   ================================================== */

function startLogin() {
  clearTerminal();

  isLoggingIn = true;
  loginStep = 0;
  loginUser = null;

  print("Insert username:");
  print("");
}

function handleLogin(value) {
  // USERNAME
  if (loginStep === 0) {
    const user = fs.users.find((u) => u.username === value);

    if (!user) {
      print("User not found.");
      print("login: please enter your username.");
      return;
    }

    loginUser = user;
    loginStep = 1;

    clearTerminal();
    print("Insert password:");
    print("");
    return;
  }

  // PASSWORD
  if (loginStep === 1) {
    if (value !== loginUser.password) {
      print("Access Denied.");
      resetLogin();
      return;
    }

    currentUser = {
      username: loginUser.username,
      role: loginUser.role,
    };

    localStorage.setItem("currentUser", JSON.stringify(currentUser));

    clearTerminal();

    print(`Access Granted. Welcome, ${currentUser.username}!`);
    print("");

    resetLogin();
    updatePrompt();
  }
}

function resetLogin() {
  isLoggingIn = false;
  loginStep = 0;
  loginUser = null;
}

function cmdLogout() {
  currentUser = {
    username: "guest",
    role: "guest",
  };

  localStorage.setItem("currentUser", JSON.stringify(currentUser));

  clearTerminal();
  print("Logged out. Welcome guest.");
  print("");

  cwd = [];
  updatePrompt();
}

/* ==================================================
   INPUT EVENTS
   ================================================== */

input.addEventListener("keydown", (e) => {
  /* LOGIN MODE */
  if (isLoggingIn) {
    if (e.key !== "Enter") return;

    e.preventDefault();

    const value = input.value.trim();
    input.value = "";

    handleLogin(value);
    return;
  }

  /* HISTORY NAVIGATION */
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

  /* COMMAND EXECUTION */
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

/* ==================================================
   CARET REFRESH LOOP
   ================================================== */

setInterval(updateCaret, 16);
