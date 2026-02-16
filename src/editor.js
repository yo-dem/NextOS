// src/editor.js

import { state } from "./state.js";
import { print } from "./terminal.js";
import { getNode, saveFS, isValidName, normalizePath } from "./fs.js";
import { dom } from "./dom.js";

let editorFilename = "";
let editorContent = [];
let editorCursorLine = 0;
let editorCursorCol = 0;
let editorMode = "NORMAL"; // NORMAL, INSERT, COMMAND
let editorOverlay = null;
let editorDisplay = null;
let editorStatusBar = null;
let commandBuffer = "";
let normalBuffer = "";
let editorDir = null;
let isNumberOfLineVisible = true;
let yankBuffer = ""; // Buffer per yank/paste
let undoHistory = []; // Stack per undo
let redoHistory = []; // Stack per redo
let maxUndoSteps = 100;
let isFileModified = false;
let originalContent = "";

export function openEditor(path) {
  editorCursorCol = 0;
  if (!path) {
    print("vi: missing filename");
    print("Usage: vi <file|path>");
    print("");
    return;
  }

  // Risolvi path completo
  const fullPath = normalizePath(state.cwd, path);

  // Separiamo directory e file
  const dirPath = fullPath.slice(0, -1);
  const fileName = fullPath[fullPath.length - 1];
  const dirNode = getNode(dirPath);

  // Controlla nome file
  if (!isValidName(fileName)) {
    print(`vi: invalid file name: '${fileName}'`);
    print("");
    return;
  }

  if (!dirNode || dirNode.type !== "dir") {
    print(`vi: cannot access '${path}'`);
    print("");
    return;
  }

  if (!dirNode || !dirNode.children) {
    print("vi: current directory error");
    print("");
    return;
  }

  editorDir = dirNode;
  editorFilename = fileName;
  state.editorActive = true;
  editorMode = "NORMAL";
  editorCursorLine = 0;
  commandBuffer = "";
  normalBuffer = "";
  yankBuffer = "";
  undoHistory = [];
  redoHistory = [];

  // Carica contenuto se il file esiste
  if (dirNode.children[fileName]) {
    const fileNode = dirNode.children[fileName];

    if (fileNode.type === "dir") {
      print(`vi: '${fileName}' is a directory`);
      print("");
      return;
    }

    editorContent = (fileNode.content || "").split("\n");
  } else {
    // Nuovo file
    editorContent = [""];
  }

  // Salva contenuto originale per confronto
  originalContent = editorContent.join("\n");
  isFileModified = false;

  // Salva stato iniziale per undo
  saveUndoState();

  createEditorUI();
}

function createEditorUI() {
  // Nascondi il prompt
  dom.terminal.querySelector(".prompt").style.display = "none";

  // Crea overlay
  editorOverlay = document.createElement("div");
  editorOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: var(--bg-color);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    padding: 20px;
    box-sizing: border-box;
  `;

  // Display area
  editorDisplay = document.createElement("pre");
  editorDisplay.style.cssText = `
    flex: 1;
    color: var(--text-color);
    font-family: "Courier New", Courier, monospace;
    margin: 0;
    overflow-y: auto;
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow-wrap: break-word;
  `;

  // Status bar
  editorStatusBar = document.createElement("div");
  editorStatusBar.style.cssText = `
    color: var(--prompt-color);
    font-family: "Courier New", Courier, monospace;
    padding: 10px 0;
    border-top: 1px solid var(--prompt-color);
  `;

  editorOverlay.appendChild(editorDisplay);
  editorOverlay.appendChild(editorStatusBar);
  document.body.appendChild(editorOverlay);

  updateEditorDisplay();
  attachEditorKeyHandlers();
}

function updateEditorDisplay() {
  let display = "";

  editorContent.forEach((line, index) => {
    const lineNumber = String(index + 1).padStart(4, " ");
    const isCursorLine = index === editorCursorLine;

    let renderedLine = line;

    if (isCursorLine) {
      const col = Math.min(editorCursorCol, line.length);

      const before = line.slice(0, col);
      const char = line[col] || " ";
      const after = line.slice(col + 1);

      // caret visivo
      renderedLine =
        before +
        "▌" + // cursore
        char +
        after;
    }

    const cursor = isCursorLine ? ">" : " ";

    if (isNumberOfLineVisible) {
      display += `${cursor}${lineNumber} | ${renderedLine}\n`;
    } else {
      display += `${renderedLine}\n`;
    }
  });

  editorDisplay.textContent = display;
  scrollToCursor();
  updateStatusBar();
}

function scrollToCursor() {
  const lines = editorDisplay.textContent.split("\n");

  // Altezza approssimativa riga
  const lineHeight = 18;

  const visibleHeight = editorDisplay.clientHeight;
  const scrollTop = editorDisplay.scrollTop;

  const cursorY = editorCursorLine * lineHeight;

  if (cursorY < scrollTop) {
    editorDisplay.scrollTop = cursorY;
  }

  if (cursorY > scrollTop + visibleHeight - lineHeight * 2) {
    editorDisplay.scrollTop = cursorY - visibleHeight + lineHeight * 3;
  }
}

function updateStatusBar() {
  let statusText = "";

  if (editorMode === "COMMAND") {
    statusText = `:${commandBuffer}`;
  } else {
    const modeText = editorMode === "INSERT" ? "-- INSERT --" : "-- NORMAL --";
    const position = `Line ${editorCursorLine + 1}/${editorContent.length}`;
    const modified = isFileModified ? " [+]" : "";
    statusText = `${modeText}  |  ${editorFilename}${modified}  |  ${position}`;
  }

  editorStatusBar.textContent = statusText;
}

function attachEditorKeyHandlers() {
  document.addEventListener("keydown", editorKeyHandler);
}

function editorKeyHandler(e) {
  if (!state.editorActive) return;

  e.preventDefault();

  // Frecce sempre attive
  if (handleArrowKeys(e)) return;

  if (editorMode === "NORMAL") {
    handleNormalMode(e);
  } else if (editorMode === "INSERT") {
    handleInsertMode(e);
  } else if (editorMode === "COMMAND") {
    handleCommandMode(e);
  }
}

function clampCursorCol() {
  const line = editorContent[editorCursorLine];
  editorCursorCol = Math.min(editorCursorCol, line.length);
}

function saveUndoState() {
  // Salva lo stato corrente
  const state = {
    content: editorContent.map((line) => line),
    cursorLine: editorCursorLine,
    cursorCol: editorCursorCol,
  };

  undoHistory.push(state);

  // Limita dimensione history
  if (undoHistory.length > maxUndoSteps) {
    undoHistory.shift();
  }

  // Pulisce redo quando si fa una nuova modifica
  redoHistory = [];

  // Marca come modificato (solo se non è il primo salvataggio)
  if (undoHistory.length > 1) {
    checkIfModified();
  }
}

// Funzione per verificare se il contenuto è stato modificato
function checkIfModified() {
  const currentContent = editorContent.join("\n");
  isFileModified = currentContent !== originalContent;
}

function undo() {
  if (undoHistory.length <= 1) return;

  redoHistory.push({
    content: editorContent.map((line) => line),
    cursorLine: editorCursorLine,
    cursorCol: editorCursorCol,
  });

  undoHistory.pop();

  const prevState = undoHistory[undoHistory.length - 1];
  editorContent = prevState.content.map((line) => line);
  editorCursorLine = Math.min(prevState.cursorLine, editorContent.length - 1);
  editorCursorCol = prevState.cursorCol;

  clampCursorCol();
  checkIfModified(); // Verifica se ancora modificato
  updateEditorDisplay();
}

function redo() {
  if (redoHistory.length === 0) return;

  const nextState = redoHistory.pop();

  undoHistory.push({
    content: editorContent.map((line) => line),
    cursorLine: editorCursorLine,
    cursorCol: editorCursorCol,
  });

  editorContent = nextState.content.map((line) => line);
  editorCursorLine = Math.min(nextState.cursorLine, editorContent.length - 1);
  editorCursorCol = nextState.cursorCol;

  clampCursorCol();
  checkIfModified(); // Verifica se ancora modificato
  updateEditorDisplay();
}

function handleInsertMode(e) {
  if (e.key === "Escape") {
    editorMode = "NORMAL";
    // Sposta cursore indietro di 1 se non a inizio riga (comportamento Vi)
    if (editorCursorCol > 0) {
      editorCursorCol--;
    }
    updateEditorDisplay();
    return;
  }

  if (e.key === "Enter") {
    saveUndoState();

    const line = editorContent[editorCursorLine];

    const before = line.slice(0, editorCursorCol);
    const after = line.slice(editorCursorCol);

    editorContent[editorCursorLine] = before;
    editorContent.splice(editorCursorLine + 1, 0, after);

    editorCursorLine++;
    editorCursorCol = 0;

    updateEditorDisplay();
    return;
  }

  if (e.key === "Backspace") {
    saveUndoState();

    const line = editorContent[editorCursorLine];

    if (editorCursorCol > 0) {
      const before = line.slice(0, editorCursorCol - 1);
      const after = line.slice(editorCursorCol);

      editorContent[editorCursorLine] = before + after;
      editorCursorCol--;
    } else if (editorCursorLine > 0) {
      const prevLine = editorContent[editorCursorLine - 1];

      editorCursorCol = prevLine.length;
      editorContent[editorCursorLine - 1] += line;
      editorContent.splice(editorCursorLine, 1);

      editorCursorLine--;
    }

    updateEditorDisplay();
    return;
  }

  if (e.key.length === 1) {
    saveUndoState();

    const line = editorContent[editorCursorLine];

    const before = line.slice(0, editorCursorCol);
    const after = line.slice(editorCursorCol);

    editorContent[editorCursorLine] = before + e.key + after;
    editorCursorCol++;

    updateEditorDisplay();
  }
}

function handleNormalMode(e) {
  // Gestione Ctrl+r per redo
  if (e.ctrlKey && e.key === "r") {
    redo();
    return;
  }

  normalBuffer += e.key;

  // Comando dd - cancella riga
  if (normalBuffer === "dd") {
    saveUndoState();

    yankBuffer = editorContent[editorCursorLine]; // Salva in yank buffer
    editorContent.splice(editorCursorLine, 1);

    if (editorCursorLine >= editorContent.length) {
      editorCursorLine--;
    }

    if (editorContent.length === 0) {
      editorContent.push("");
      editorCursorLine = 0;
    }

    editorCursorCol = 0;
    normalBuffer = "";
    updateEditorDisplay();
    return;
  }

  // Comando yy - yank (copia) riga
  if (normalBuffer === "yy") {
    yankBuffer = editorContent[editorCursorLine];
    normalBuffer = "";
    updateEditorDisplay();
    return;
  }

  // Comando gg - vai a prima riga
  if (normalBuffer === "gg") {
    editorCursorLine = 0;
    editorCursorCol = 0;
    normalBuffer = "";
    updateEditorDisplay();
    return;
  }

  // Comando dw - cancella parola
  if (normalBuffer === "dw") {
    saveUndoState();

    const line = editorContent[editorCursorLine];
    const remaining = line.slice(editorCursorCol);

    // Trova fine parola (primo spazio o fine riga)
    const match = remaining.match(/^\S+\s*/);
    if (match) {
      yankBuffer = match[0];
      editorContent[editorCursorLine] =
        line.slice(0, editorCursorCol) + remaining.slice(match[0].length);
    }

    normalBuffer = "";
    updateEditorDisplay();
    return;
  }

  setTimeout(() => (normalBuffer = ""), 300);

  switch (e.key) {
    case "i":
      editorMode = "INSERT";
      updateStatusBar();
      return;

    case "I":
      // Insert a inizio riga
      editorCursorCol = 0;
      editorMode = "INSERT";
      updateEditorDisplay();
      return;

    case "A":
      // Append a fine riga
      editorCursorCol = editorContent[editorCursorLine].length;
      editorMode = "INSERT";
      updateEditorDisplay();
      return;

    case ":":
      editorMode = "COMMAND";
      commandBuffer = "";
      updateStatusBar();
      return;

    case "n":
      isNumberOfLineVisible = !isNumberOfLineVisible;
      updateEditorDisplay();
      return;

    case "a":
      // Append dopo cursore
      if (editorCursorCol < editorContent[editorCursorLine].length) {
        editorCursorCol++;
      }
      editorMode = "INSERT";
      updateEditorDisplay();
      return;

    case "o":
      // Open line below
      saveUndoState();
      editorContent.splice(editorCursorLine + 1, 0, "");
      editorCursorLine++;
      editorCursorCol = 0;
      editorMode = "INSERT";
      updateEditorDisplay();
      return;

    case "O":
      // Open line above
      saveUndoState();
      editorContent.splice(editorCursorLine, 0, "");
      editorCursorCol = 0;
      editorMode = "INSERT";
      updateEditorDisplay();
      return;

    case "h":
      if (editorCursorCol > 0) editorCursorCol--;
      updateEditorDisplay();
      return;

    case "l":
      // Fix: non permettere di andare oltre la fine della riga in NORMAL mode
      const maxCol = Math.max(0, editorContent[editorCursorLine].length - 1);
      if (editorCursorCol < maxCol) editorCursorCol++;
      updateEditorDisplay();
      return;

    case "k":
      if (editorCursorLine > 0) {
        editorCursorLine--;
        clampCursorCol();
      }
      updateEditorDisplay();
      return;

    case "j":
      if (editorCursorLine < editorContent.length - 1) {
        editorCursorLine++;
        clampCursorCol();
      }
      updateEditorDisplay();
      return;

    case "x":
      // Delete char under cursor
      saveUndoState();
      const line = editorContent[editorCursorLine];

      if (editorCursorCol < line.length) {
        yankBuffer = line[editorCursorCol];
        editorContent[editorCursorLine] =
          line.slice(0, editorCursorCol) + line.slice(editorCursorCol + 1);
      }

      updateEditorDisplay();
      return;

    case "p":
      // Paste dopo cursore/riga
      if (yankBuffer) {
        saveUndoState();

        // Se yankBuffer contiene una riga intera, incolla sotto
        if (yankBuffer.indexOf("\n") === -1 && yankBuffer.length > 0) {
          // Probabilmente è una riga intera da dd/yy
          // Verifica se sembra una riga (lunga più di qualche char)
          if (normalBuffer === "" && yankBuffer.length > 2) {
            editorContent.splice(editorCursorLine + 1, 0, yankBuffer);
            editorCursorLine++;
            editorCursorCol = 0;
          } else {
            // Incolla caratteri nella posizione corrente
            const line = editorContent[editorCursorLine];
            editorContent[editorCursorLine] =
              line.slice(0, editorCursorCol + 1) +
              yankBuffer +
              line.slice(editorCursorCol + 1);
            editorCursorCol += yankBuffer.length;
          }
        }

        updateEditorDisplay();
      }
      return;

    case "P":
      // Paste prima cursore/riga
      if (yankBuffer) {
        saveUndoState();

        if (normalBuffer === "" && yankBuffer.length > 2) {
          editorContent.splice(editorCursorLine, 0, yankBuffer);
          editorCursorCol = 0;
        } else {
          const line = editorContent[editorCursorLine];
          editorContent[editorCursorLine] =
            line.slice(0, editorCursorCol) +
            yankBuffer +
            line.slice(editorCursorCol);
          editorCursorCol += yankBuffer.length - 1;
        }

        updateEditorDisplay();
      }
      return;

    case "u":
      // Undo
      undo();
      return;

    case "0":
      // Vai a inizio riga
      editorCursorCol = 0;
      updateEditorDisplay();
      return;

    case "$":
      // Vai a fine riga
      editorCursorCol = Math.max(0, editorContent[editorCursorLine].length - 1);
      updateEditorDisplay();
      return;

    case "G":
      // Vai a ultima riga
      editorCursorLine = editorContent.length - 1;
      editorCursorCol = 0;
      updateEditorDisplay();
      return;

    case "r":
      // Replace mode - aspetta prossimo carattere
      normalBuffer = "r";
      return;
  }

  // Gestione replace
  if (normalBuffer.startsWith("r") && normalBuffer.length === 2) {
    saveUndoState();
    const newChar = normalBuffer[1];
    const line = editorContent[editorCursorLine];

    if (editorCursorCol < line.length) {
      editorContent[editorCursorLine] =
        line.slice(0, editorCursorCol) +
        newChar +
        line.slice(editorCursorCol + 1);
    }

    normalBuffer = "";
    updateEditorDisplay();
  }
}

function handleCommandMode(e) {
  if (e.key === "Escape") {
    editorMode = "NORMAL";
    commandBuffer = "";
    updateStatusBar();
    return;
  }

  if (e.key === "Enter") {
    const result = executeCommand(commandBuffer);

    // Solo se executeCommand non ha gestito l'errore
    commandBuffer = "";

    // Non chiamare updateStatusBar() qui - lo fa executeCommand quando necessario
    return;
  }

  if (e.key === "Backspace") {
    commandBuffer = commandBuffer.slice(0, -1);
    updateStatusBar();
    return;
  }

  if (e.key.length === 1) {
    commandBuffer += e.key;
    updateStatusBar();
  }
}

// Modifica executeCommand per mostrare il messaggio di errore
function executeCommand(cmd) {
  if (cmd === "w") {
    saveFile();
    return; // IMPORTANTE: esci qui
  } else if (cmd === "wq" || cmd === "x") {
    saveFile();
    closeEditor(true);
    return;
  } else if (cmd === "q") {
    if (isFileModified) {
      editorStatusBar.textContent =
        "E37: No write since last change (add ! to override)";
      editorMode = "NORMAL";
      setTimeout(() => {
        if (state.editorActive) {
          updateStatusBar();
        }
      }, 2000);
      return;
    }
    closeEditor(false);
    return;
  } else if (cmd === "q!") {
    closeEditor(false, true);
    return;
  } else if (cmd.match(/^\d+$/)) {
    const lineNum = parseInt(cmd, 10) - 1;
    if (lineNum >= 0 && lineNum < editorContent.length) {
      editorCursorLine = lineNum;
      editorCursorCol = 0;
      updateEditorDisplay();
    }
    return;
  } else if (cmd.startsWith("w ")) {
    const newName = cmd.substring(2).trim();
    if (isValidName(newName)) {
      editorFilename = newName;
      saveFile();
    } else {
      editorStatusBar.textContent = `E32: Invalid file name: ${newName}`;
      editorMode = "NORMAL";
      setTimeout(() => {
        if (state.editorActive) {
          updateStatusBar();
        }
      }, 2000);
    }
    return;
  } else {
    editorStatusBar.textContent = `E492: Not an editor command: ${cmd}`;
    editorMode = "NORMAL";
    setTimeout(() => {
      if (state.editorActive) {
        updateStatusBar();
      }
    }, 2000);
    return;
  }
}

function saveFile() {
  const currentNode = editorDir;
  const content = editorContent.join("\n");

  const size = getFileSize(content);
  let sizeFile = 0;
  if (size.kb <= 1) {
    sizeFile = size.bytes + " bytes";
  } else {
    sizeFile = size.kb + " KB";
  }

  currentNode.children[editorFilename] = {
    type: "txt",
    content: content,
    size: sizeFile,
  };

  saveFS();

  // Aggiorna contenuto originale e resetta flag
  originalContent = content;
  isFileModified = false;

  // Passa in NORMAL mode
  editorMode = "NORMAL";

  // Mostra messaggio di salvataggio
  editorStatusBar.textContent = `"${editorFilename}" ${editorContent.length}L, ${size.bytes}B written`;
  setTimeout(() => {
    if (state.editorActive) {
      updateStatusBar(); // Questo mostrerà la status bar normale con -- NORMAL --
    }
  }, 1500);
}

function closeEditor(saved = false, forced = false) {
  state.editorActive = false;
  document.removeEventListener("keydown", editorKeyHandler);

  if (editorOverlay) {
    document.body.removeChild(editorOverlay);
    editorOverlay = null;
  }

  // Ripristina il prompt
  dom.terminal.querySelector(".prompt").style.display = "flex";
  dom.input.focus();

  if (saved) {
    print(`"${editorFilename}" saved`);
  } else if (forced && isFileModified) {
    print(`"${editorFilename}" closed without saving`);
  }
  print("");

  // Reset variabili
  editorContent = [];
  editorCursorLine = 0;
  editorCursorCol = 0;
  editorFilename = "";
  commandBuffer = "";
  normalBuffer = "";
  yankBuffer = "";
  undoHistory = [];
  redoHistory = [];
  isFileModified = false;
  originalContent = "";
}

function handleArrowKeys(e) {
  switch (e.key) {
    case "ArrowLeft":
      if (editorCursorCol > 0) {
        editorCursorCol--;
      } else if (editorCursorLine > 0) {
        editorCursorLine--;
        editorCursorCol = editorContent[editorCursorLine].length;
      }
      updateEditorDisplay();
      return true;

    case "ArrowRight": {
      const line = editorContent[editorCursorLine];
      const maxCol =
        editorMode === "INSERT" ? line.length : Math.max(0, line.length - 1);

      if (editorCursorCol < maxCol) {
        editorCursorCol++;
      } else if (
        editorCursorLine < editorContent.length - 1 &&
        editorMode === "INSERT"
      ) {
        editorCursorLine++;
        editorCursorCol = 0;
      }
      updateEditorDisplay();
      return true;
    }

    case "ArrowUp":
      if (editorCursorLine > 0) {
        editorCursorLine--;
        clampCursorCol();
        updateEditorDisplay();
      }
      return true;

    case "ArrowDown":
      if (editorCursorLine < editorContent.length - 1) {
        editorCursorLine++;
        clampCursorCol();
        updateEditorDisplay();
      }
      return true;

    case "Home":
      editorCursorCol = 0;
      updateEditorDisplay();
      return true;

    case "End":
      const maxEndCol =
        editorMode === "INSERT"
          ? editorContent[editorCursorLine].length
          : Math.max(0, editorContent[editorCursorLine].length - 1);
      editorCursorCol = maxEndCol;
      updateEditorDisplay();
      return true;
  }

  return false;
}

function getFileSize(content) {
  const bytes = new TextEncoder().encode(content).length;

  return {
    bytes,
    kb: Math.ceil(bytes / 1024),
  };
}
