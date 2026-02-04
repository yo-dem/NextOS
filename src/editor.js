// src/editor.js

import { state } from "./state.js";
import { print } from "./terminal.js";
import { getNode, saveFS } from "./fs.js";
import { dom } from "./dom.js";

let editorActive = false;
let editorFilename = "";
let editorContent = [];
let editorCursorLine = 0;
let editorMode = "NORMAL"; // NORMAL, INSERT, COMMAND
let editorOverlay = null;
let editorDisplay = null;
let editorStatusBar = null;
let commandBuffer = "";

export function openEditor(filename) {
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
    const cursor = index === editorCursorLine ? ">" : " ";
    display += `${cursor}${lineNumber} | ${line}\n`;
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

  if (editorMode === "NORMAL") {
    handleNormalMode(e);
  } else if (editorMode === "INSERT") {
    handleInsertMode(e);
  } else if (editorMode === "COMMAND") {
    handleCommandMode(e);
  }
}

function handleNormalMode(e) {
  switch (e.key) {
    case "i": // Insert mode
      editorMode = "INSERT";
      updateStatusBar();
      break;

    case "j": // Down
      if (editorCursorLine < editorContent.length - 1) {
        editorCursorLine++;
        updateEditorDisplay();
      }
      break;

    case "k": // Up
      if (editorCursorLine > 0) {
        editorCursorLine--;
        updateEditorDisplay();
      }
      break;

    case "o": // Open new line below
      editorContent.splice(editorCursorLine + 1, 0, "");
      editorCursorLine++;
      editorMode = "INSERT";
      updateEditorDisplay();
      break;

    case "O": // Open new line above
      editorContent.splice(editorCursorLine, 0, "");
      editorMode = "INSERT";
      updateEditorDisplay();
      break;

    case "d": // Delete line (aspetta secondo 'd')
      waitForSecondKey("d", () => {
        editorContent.splice(editorCursorLine, 1);
        if (editorContent.length === 0) editorContent = [""];
        if (editorCursorLine >= editorContent.length) {
          editorCursorLine = editorContent.length - 1;
        }
        updateEditorDisplay();
      });
      break;

    case ":": // Command mode
      editorMode = "COMMAND";
      commandBuffer = "";
      updateStatusBar();
      break;
  }
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
    const currentLine = editorContent[editorCursorLine];
    editorContent.splice(editorCursorLine + 1, 0, "");
    editorCursorLine++;
    updateEditorDisplay();
    return;
  }

  if (e.key === "Backspace") {
    if (editorContent[editorCursorLine].length > 0) {
      editorContent[editorCursorLine] = editorContent[editorCursorLine].slice(
        0,
        -1,
      );
      updateEditorDisplay();
    } else if (editorCursorLine > 0) {
      editorContent.splice(editorCursorLine, 1);
      editorCursorLine--;
      updateEditorDisplay();
    }
    return;
  }

  if (e.key.length === 1) {
    editorContent[editorCursorLine] += e.key;
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
    executeCommand(commandBuffer);
    commandBuffer = "";
    editorMode = "NORMAL";
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
    closeEditor();
  } else if (cmd === "q") {
    closeEditor();
  } else if (cmd === "q!") {
    closeEditor();
  } else {
    // Comando non riconosciuto, torna in normal mode
    editorMode = "NORMAL";
  }
}

function saveFile() {
  const currentNode = getNode(state.cwd);
  const content = editorContent.join("\n");

  currentNode.children[editorFilename] = {
    type: "file",
    content: content,
    size: Math.ceil(content.length / 1024),
  };

  saveFS();
}

function closeEditor() {
  editorActive = false;
  document.removeEventListener("keydown", editorKeyHandler);

  if (editorOverlay) {
    document.body.removeChild(editorOverlay);
    editorOverlay = null;
  }

  // Ripristina il prompt
  dom.terminal.querySelector(".prompt").style.display = "flex";
  dom.input.focus();

  print(`"${editorFilename}" saved`);
  print("");

  editorContent = [];
  editorCursorLine = 0;
  editorFilename = "";
  commandBuffer = "";
}

export function isEditorActive() {
  return editorActive;
}
