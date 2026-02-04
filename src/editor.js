// src/editor.js

import { state } from "./state.js";
import { print } from "./terminal.js";
import { getNode, saveFS } from "./fs.js";
import { dom } from "./dom.js";

let editorActive = false;
let editorFilename = "";
let editorContent = [];
let editorCursorLine = 0;
let editorCursorCol = 0;
let editorMode = "NORMAL"; // NORMAL, INSERT, COMMAND
let editorOverlay = null;
let editorDisplay = null;
let editorStatusBar = null;
let commandBuffer = "";

export function openEditor(filename) {
  editorCursorCol = 0;
  if (!filename) {
    print("vi: missing filename");
    print("Usage: vi <filename>");
    print("");
    return;
  }

  if (state.currentUser.role === "guest") {
    print("vi: permission denied");
    print("");
    return;
  }

  const currentNode = getNode(state.cwd);

  if (!currentNode || !currentNode.children) {
    print("vi: current directory error");
    print("");
    return;
  }

  editorFilename = filename;
  editorActive = true;
  editorMode = "NORMAL";
  editorCursorLine = 0;
  commandBuffer = "";

  // Carica contenuto se il file esiste
  if (currentNode.children[filename]) {
    const fileNode = currentNode.children[filename];

    if (fileNode.type === "dir") {
      print(`vi: '${filename}' is a directory`);
      print("");
      return;
    }

    editorContent = (fileNode.content || "").split("\n");
  } else {
    // Nuovo file
    editorContent = [""];
  }

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
    white-space: pre;
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

    display += `${cursor}${lineNumber} | ${renderedLine}\n`;
  });

  editorDisplay.textContent = display;
  updateStatusBar();
}

function updateStatusBar() {
  let statusText = "";

  if (editorMode === "COMMAND") {
    statusText = `:${commandBuffer}`;
  } else {
    const modeText = editorMode === "INSERT" ? "-- INSERT --" : "-- NORMAL --";
    const position = `Line ${editorCursorLine + 1}/${editorContent.length}`;
    statusText = `${modeText}  |  ${editorFilename}  |  ${position}`;
  }

  editorStatusBar.textContent = statusText;
}

function attachEditorKeyHandlers() {
  document.addEventListener("keydown", editorKeyHandler);
}

function editorKeyHandler(e) {
  if (!editorActive) return;

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

let waitingForKey = null;
let waitingCallback = null;

function waitForSecondKey(key, callback) {
  waitingForKey = key;
  waitingCallback = callback;

  const timeout = setTimeout(() => {
    waitingForKey = null;
    waitingCallback = null;
  }, 1000);

  const handler = (e) => {
    clearTimeout(timeout);
    document.removeEventListener("keydown", handler);

    if (e.key === key && waitingCallback) {
      e.preventDefault();
      waitingCallback();
    }

    waitingForKey = null;
    waitingCallback = null;
  };

  document.addEventListener("keydown", handler);
}

function handleInsertMode(e) {
  if (e.key === "Escape") {
    editorMode = "NORMAL";
    updateStatusBar();
    return;
  }

  if (e.key === "Enter") {
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
    const line = editorContent[editorCursorLine];

    const before = line.slice(0, editorCursorCol);
    const after = line.slice(editorCursorCol);

    editorContent[editorCursorLine] = before + e.key + after;
    editorCursorCol++;

    updateEditorDisplay();
  }
}

function handleNormalMode(e) {
  switch (e.key) {
    case "i":
      editorMode = "INSERT";
      updateStatusBar();
      return;

    case ":":
      editorMode = "COMMAND";
      commandBuffer = "";
      updateStatusBar();
      return;

    case "h": // sinistra (stile vim)
      if (editorCursorCol > 0) editorCursorCol--;
      updateEditorDisplay();
      return;

    case "l": // destra
      if (editorCursorCol < editorContent[editorCursorLine].length)
        editorCursorCol++;
      updateEditorDisplay();
      return;

    case "k": // su
      if (editorCursorLine > 0) {
        editorCursorLine--;
        clampCursorCol();
      }
      updateEditorDisplay();
      return;

    case "j": // giù
      if (editorCursorLine < editorContent.length - 1) {
        editorCursorLine++;
        clampCursorCol();
      }
      updateEditorDisplay();
      return;
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
    executeCommand(commandBuffer);

    commandBuffer = "";
    editorMode = "NORMAL";

    updateEditorDisplay();
    updateStatusBar();
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

function executeCommand(cmd) {
  if (cmd === "w") {
    saveFile();
  } else if (cmd === "wq") {
    saveFile();
    closeEditor(true);
  } else if (cmd === "q") {
    closeEditor(true);
  } else if (cmd === "q!") {
    closeEditor(false);
  } else {
    // Comando non riconosciuto, torna in normal mode
    editorMode = "NORMAL";
  }
}

function saveFile() {
  const currentNode = getNode(state.cwd);
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
}

function closeEditor(saved = true) {
  editorActive = false;
  document.removeEventListener("keydown", editorKeyHandler);

  if (editorOverlay) {
    document.body.removeChild(editorOverlay);
    editorOverlay = null;
  }

  // Ripristina il prompt
  dom.terminal.querySelector(".prompt").style.display = "flex";
  dom.input.focus();

  if (saved) print(`"${editorFilename}" saved`);
  print("");

  editorContent = [];
  editorCursorLine = 0;
  editorFilename = "";
  commandBuffer = "";
}

export function isEditorActive() {
  return editorActive;
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

      if (editorCursorCol < line.length) {
        editorCursorCol++;
      } else if (editorCursorLine < editorContent.length - 1) {
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
