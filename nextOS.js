/* ================================
   STORIA COMANDI
================================ */

const history = [];
let historyIndex = -1;

/* ================================
   CONFIGURAZIONE APPLICAZIONI
================================ */

const apps = {
  GLITCH: "http://nextos.altervista.org/Glitch/",
  BALL: "http://nextos.altervista.org/Ball/",
  BUBBLE: "http://nextos.altervista.org/Bubble/",
};

/* ================================
   RIFERIMENTI DOM
================================ */

const input = document.getElementById("cmd");
const terminal = document.getElementById("terminal");
const caret = document.getElementById("caret");

/* ================================
   VARIABILI DI STATO
================================ */

let blinkTimeout = null;

/* ================================
   FUNZIONI TERMINALE
================================ */

/**
 * Aggiunge una riga al terminale
 * prima del prompt
 */
function appendLine(text) {
  const div = document.createElement("div");
  div.className = "line";

  // Evita righe "vuote" che collassano
  div.textContent = text && text.trim() !== "" ? text : "\u00A0";

  terminal.insertBefore(div, terminal.querySelector(".prompt"));

  terminal.scrollTop = terminal.scrollHeight;
}

/**
 * Aggiorna la posizione del caret
 * in base al cursore reale
 */
function updateCaret() {
  const pos = input.selectionStart || 0;
  caret.style.marginLeft = pos * 0.6 + "em";
}

/* ================================
   GESTIONE BLINK CARET
================================ */

/**
 * Ferma temporaneamente il blink
 * e lo riattiva dopo inattività
 */
function pauseBlink() {
  caret.style.animation = "none";

  clearTimeout(blinkTimeout);

  blinkTimeout = setTimeout(() => {
    caret.style.animation = "blink 1s steps(1) infinite";
  }, 600);
}

/* ================================
   GESTIONE COMANDI
================================ */

/**
 * Esegue il comando inserito
 */
function executeCommand() {
  const raw = input.value.trim();
  // Aggiunge alla history solo se non vuoto
  if (raw !== "") {
    history.push(raw);
    historyIndex = history.length; // reset index
  }
  const cmd = raw.toUpperCase();

  input.value = "";
  updateCaret();

  // Echo del comando
  appendLine("> " + raw);

  // Avvio applicazione
  if (apps[cmd]) {
    appendLine("Launching " + raw + "...");
    window.open(apps[cmd], "_blank");
    appendLine("done");
    return;
  }

  // Comandi interni
  switch (cmd) {
    case "LS":
      appendLine(" ");
      appendLine("Applications available:");
      appendLine(" ");
      Object.keys(apps).forEach((app) => appendLine("> " + app));
      appendLine(" ");
      break;

    case "HELP":
      appendLine("");
      appendLine("Available commands:");
      appendLine("");
      appendLine("LS list applications");
      appendLine("HELP show this message");
      appendLine("<APP> launch application");
      appendLine("CLEAR clear screen");
      break;

    case "CLEAR":
      clearTerminal();
      break;

    default:
      appendLine("Command not found. Type HELP for list.");
      break;
  }
}

/**
 * Pulisce tutte le righe del terminale
 */
function clearTerminal() {
  terminal.querySelectorAll(".line").forEach((line) => line.remove());
}

/* ================================
   EVENT LISTENERS
================================ */

/**
 * Invio comando con ENTER
 */
input.addEventListener("keydown", (e) => {
  // Navigazione history
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

  if (e.key === "Enter") {
    executeCommand();
  }

  // Caret update and blink reset
  requestAnimationFrame(updateCaret);
  pauseBlink();
});

/**
 * Input testuale
 */
input.addEventListener("input", () => {
  updateCaret();
  pauseBlink();
});

/**
 * Click nel campo
 */
input.addEventListener("click", () => {
  updateCaret();
  pauseBlink();
});

/* ================================
   AGGIORNAMENTO CONTINUO CARET
================================ */

/**
 * Mantiene il caret sincronizzato
 * anche in casi edge (auto-repeat)
 */
setInterval(updateCaret, 16);
