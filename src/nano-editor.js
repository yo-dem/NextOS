// src/nano-editor.js

import { state } from "./state.js";
import { dom } from "./dom.js";
import { print } from "./terminal.js";
import { getNode, normalizePath, saveFS } from "./fs.js";
import { updatePrompt } from "./prompt.js";

let editorState = null;

// Editor themes matching NextOS terminal themes EXACTLY
const THEMES = {
  classic: {
    bg: "#0f0f0f",
    fg: "#00ff88be",
    cursor: "#3cff01",
    cursorBg: "#0f0f0f",
    lineNum: "#00aa66",
    header: "#003322",
    headerText: "#91c7b3",
    border: "#00aa66",
    status: "#003322",
    statusText: "#91c7b3",
  },
  amber: {
    bg: "#1a0f00",
    fg: "#ffb000",
    cursor: "#ffd700",
    cursorBg: "#1a0f00",
    lineNum: "#cc8800",
    header: "#332200",
    headerText: "#d4a574",
    border: "#cc8800",
    status: "#332200",
    statusText: "#d4a574",
  },
  dracula: {
    bg: "#282a36",
    fg: "#f6f2f8",
    cursor: "#50fa7b",
    cursorBg: "#282a36",
    lineNum: "#6272a4",
    header: "#44475a",
    headerText: "#ffae89",
    border: "#6272a4",
    status: "#44475a",
    statusText: "#ffae89",
  },
  terminal: {
    bg: "#300a24",
    fg: "#ffffff",
    cursor: "#00ff00",
    cursorBg: "#300a24",
    lineNum: "#aaaaaa",
    header: "#1a0614",
    headerText: "#eeeeee",
    border: "#aaaaaa",
    status: "#1a0614",
    statusText: "#eeeeee",
  },
};

/**
 * Nano-like Editor State
 */
class NanoEditor {
  constructor(filepath, content = "") {
    this.filepath = filepath;
    this.lines = content.split("\n");
    this.cursorRow = 0;
    this.cursorCol = 0;
    this.modified = false;
    this.clipboard = "";
    this.selection = null; // { startRow, startCol, endRow, endCol }
    this.selectionAnchor = null; // For Shift+Arrow selection
    this.scrollTop = 0;
    this.message = "";
    this.messageTimeout = null;
    this.theme = localStorage.getItem("terminal_theme") || "classic";
  }

  getCurrentLine() {
    return this.lines[this.cursorRow] || "";
  }

  setCurrentLine(text) {
    this.lines[this.cursorRow] = text;
    this.modified = true;
  }

  insertChar(char) {
    const line = this.getCurrentLine();
    const newLine =
      line.slice(0, this.cursorCol) + char + line.slice(this.cursorCol);
    this.setCurrentLine(newLine);
    this.cursorCol++;
  }

  deleteChar() {
    const line = this.getCurrentLine();
    if (this.cursorCol > 0) {
      const newLine =
        line.slice(0, this.cursorCol - 1) + line.slice(this.cursorCol);
      this.setCurrentLine(newLine);
      this.cursorCol--;
    } else if (this.cursorRow > 0) {
      // Merge with previous line
      const prevLine = this.lines[this.cursorRow - 1];
      this.cursorCol = prevLine.length;
      this.lines[this.cursorRow - 1] = prevLine + line;
      this.lines.splice(this.cursorRow, 1);
      this.cursorRow--;
      this.modified = true;
    }
  }

  deleteCharForward() {
    const line = this.getCurrentLine();
    if (this.cursorCol < line.length) {
      const newLine =
        line.slice(0, this.cursorCol) + line.slice(this.cursorCol + 1);
      this.setCurrentLine(newLine);
    } else if (this.cursorRow < this.lines.length - 1) {
      // Merge with next line
      const nextLine = this.lines[this.cursorRow + 1];
      this.setCurrentLine(line + nextLine);
      this.lines.splice(this.cursorRow + 1, 1);
    }
  }

  insertNewline() {
    const line = this.getCurrentLine();
    const before = line.slice(0, this.cursorCol);
    const after = line.slice(this.cursorCol);

    this.setCurrentLine(before);
    this.lines.splice(this.cursorRow + 1, 0, after);
    this.cursorRow++;
    this.cursorCol = 0;
  }

  moveCursor(direction, selecting = false) {
    const line = this.getCurrentLine();

    // Se inizia selezione, salva anchor
    if (selecting && !this.selectionAnchor) {
      this.selectionAnchor = {
        row: this.cursorRow,
        col: this.cursorCol,
      };
    }

    // Se non sta selezionando, cancella selezione
    if (!selecting) {
      this.selectionAnchor = null;
      this.selection = null;
    }

    switch (direction) {
      case "left":
        if (this.cursorCol > 0) {
          this.cursorCol--;
        } else if (this.cursorRow > 0) {
          this.cursorRow--;
          this.cursorCol = this.getCurrentLine().length;
        }
        break;

      case "right":
        if (this.cursorCol < line.length) {
          this.cursorCol++;
        } else if (this.cursorRow < this.lines.length - 1) {
          this.cursorRow++;
          this.cursorCol = 0;
        }
        break;

      case "up":
        if (this.cursorRow > 0) {
          this.cursorRow--;
          const newLine = this.getCurrentLine();
          this.cursorCol = Math.min(this.cursorCol, newLine.length);
        }
        break;

      case "down":
        if (this.cursorRow < this.lines.length - 1) {
          this.cursorRow++;
          const newLine = this.getCurrentLine();
          this.cursorCol = Math.min(this.cursorCol, newLine.length);
        }
        break;

      case "home":
        this.cursorCol = 0;
        break;

      case "end":
        this.cursorCol = line.length;
        break;

      case "pageup":
        this.cursorRow = Math.max(0, this.cursorRow - 20);
        this.cursorCol = Math.min(this.cursorCol, this.getCurrentLine().length);
        break;

      case "pagedown":
        this.cursorRow = Math.min(this.lines.length - 1, this.cursorRow + 20);
        this.cursorCol = Math.min(this.cursorCol, this.getCurrentLine().length);
        break;
    }

    // Aggiorna selezione se sta selezionando
    if (selecting && this.selectionAnchor) {
      this.selection = {
        startRow: this.selectionAnchor.row,
        startCol: this.selectionAnchor.col,
        endRow: this.cursorRow,
        endCol: this.cursorCol,
      };
    }
  }

  selectAll() {
    this.selection = {
      startRow: 0,
      startCol: 0,
      endRow: this.lines.length - 1,
      endCol: this.lines[this.lines.length - 1].length,
    };
  }

  getSelectedText() {
    if (!this.selection) return "";

    const { startRow, startCol, endRow, endCol } = this.normalizeSelection();

    if (startRow === endRow) {
      return this.lines[startRow].slice(startCol, endCol);
    }

    const result = [];
    for (let i = startRow; i <= endRow; i++) {
      if (i === startRow) {
        result.push(this.lines[i].slice(startCol));
      } else if (i === endRow) {
        result.push(this.lines[i].slice(0, endCol));
      } else {
        result.push(this.lines[i]);
      }
    }
    return result.join("\n");
  }

  normalizeSelection() {
    if (!this.selection) return null;

    const { startRow, startCol, endRow, endCol } = this.selection;

    if (startRow < endRow || (startRow === endRow && startCol <= endCol)) {
      return { startRow, startCol, endRow, endCol };
    } else {
      return {
        startRow: endRow,
        startCol: endCol,
        endRow: startRow,
        endCol: startCol,
      };
    }
  }

  deleteSelection() {
    if (!this.selection) return;

    const { startRow, startCol, endRow, endCol } = this.normalizeSelection();

    if (startRow === endRow) {
      const line = this.lines[startRow];
      this.lines[startRow] = line.slice(0, startCol) + line.slice(endCol);
    } else {
      const firstPart = this.lines[startRow].slice(0, startCol);
      const lastPart = this.lines[endRow].slice(endCol);
      this.lines[startRow] = firstPart + lastPart;
      this.lines.splice(startRow + 1, endRow - startRow);
    }

    this.cursorRow = startRow;
    this.cursorCol = startCol;
    this.selection = null;
    this.modified = true;
  }

  copy() {
    const text = this.getSelectedText();
    if (text) {
      this.clipboard = text;
      this.showMessage("Copied to clipboard");
    }
  }

  cut() {
    const text = this.getSelectedText();
    if (text) {
      this.clipboard = text;
      this.deleteSelection();
      this.showMessage("Cut to clipboard");
    }
  }

  paste() {
    if (!this.clipboard) {
      this.showMessage("Clipboard is empty");
      return;
    }

    if (this.selection) {
      this.deleteSelection();
    }

    const clipboardLines = this.clipboard.split("\n");

    if (clipboardLines.length === 1) {
      const line = this.getCurrentLine();
      const newLine =
        line.slice(0, this.cursorCol) +
        clipboardLines[0] +
        line.slice(this.cursorCol);
      this.setCurrentLine(newLine);
      this.cursorCol += clipboardLines[0].length;
    } else {
      const line = this.getCurrentLine();
      const before = line.slice(0, this.cursorCol);
      const after = line.slice(this.cursorCol);

      this.setCurrentLine(before + clipboardLines[0]);

      for (let i = 1; i < clipboardLines.length - 1; i++) {
        this.lines.splice(this.cursorRow + i, 0, clipboardLines[i]);
      }

      const lastLine = clipboardLines[clipboardLines.length - 1];
      this.lines.splice(
        this.cursorRow + clipboardLines.length - 1,
        0,
        lastLine + after,
      );

      this.cursorRow += clipboardLines.length - 1;
      this.cursorCol = lastLine.length;
    }

    this.showMessage("Pasted from clipboard");
  }

  showMessage(msg) {
    this.message = msg;
    if (this.messageTimeout) clearTimeout(this.messageTimeout);
    this.messageTimeout = setTimeout(() => {
      this.message = "";
      renderEditor();
    }, 2000);
  }

  save() {
    const content = this.lines.join("\n");

    // Get the file node
    const node = getNode(normalizePath([], this.filepath));

    if (node) {
      // Update existing file
      node.content = content;
      // Update size (approximate KB)
      node.size = Math.ceil(content.length / 1024);
    } else {
      // Create new file
      const pathParts = normalizePath([], this.filepath);
      const fileName = pathParts.pop();
      const parentPath = pathParts;
      const parentNode = getNode(parentPath);

      if (parentNode && parentNode.children) {
        parentNode.children[fileName] = {
          type: "txt",
          content: content,
          size: Math.ceil(content.length / 1024),
        };
      }
    }

    // Save filesystem to localStorage
    saveFS();

    this.modified = false;
    this.showMessage(`Saved ${this.filepath}`);
  }

  getContent() {
    return this.lines.join("\n");
  }
}

/**
 * Open file in nano editor
 */
export function openNano(filepath) {
  if (!filepath) {
    print("nano: missing filename");
    print("Usage: nano <filename>");
    print("");
    return;
  }

  const fullPath = normalizePath(state.cwd, filepath);
  const node = getNode(fullPath);

  let content = "";
  let isNewFile = false;

  if (node) {
    if (node.type !== "txt") {
      print(`nano: '${filepath}': Not a text file`);
      print("");
      return;
    }
    content = node.content || "";
  } else {
    isNewFile = true;
  }

  // Hide terminal
  dom.terminal.style.display = "none";
  dom.input.style.display = "none";

  // Create editor
  editorState = new NanoEditor("/" + fullPath.join("/"), content);
  state.editorMode = "nano";

  // Create editor UI
  createEditorUI();
  renderEditor();

  if (isNewFile) {
    editorState.showMessage(`New file: ${filepath}`);
  }
}

/**
 * Create Editor UI
 */
function createEditorUI() {
  // Remove old editor if exists
  const oldEditor = document.getElementById("nano-editor");
  if (oldEditor) oldEditor.remove();

  const theme = THEMES[editorState.theme] || THEMES.classic;

  const editorContainer = document.createElement("div");
  editorContainer.id = "nano-editor";
  editorContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: ${theme.bg};
    color: ${theme.fg};
    font-family: 'Courier New', monospace;
    font-size: 14px;
    display: flex;
    flex-direction: column;
    z-index: 1000;
  `;

  // Header
  const header = document.createElement("div");
  header.id = "nano-header";
  header.style.cssText = `
    background: ${theme.header};
    color: ${theme.headerText};
    padding: 8px 12px;
    font-weight: bold;
    border-bottom: 2px solid ${theme.border};
  `;
  editorContainer.appendChild(header);

  // Content area
  const content = document.createElement("div");
  content.id = "nano-content";
  content.style.cssText = `
    flex: 1;
    overflow-y: auto;
    overflow-x: auto;
    padding: 12px;
    white-space: pre;
    position: relative;
  `;

  // Scrollbar styling (retro style)
  const style = document.createElement("style");
  style.textContent = `
    #nano-content::-webkit-scrollbar {
      width: 12px;
      height: 12px;
    }
    #nano-content::-webkit-scrollbar-track {
      background: ${theme.bg};
      border-left: 1px solid ${theme.border};
    }
    #nano-content::-webkit-scrollbar-thumb {
      background: ${theme.lineNum};
      border: 1px solid ${theme.border};
    }
    #nano-content::-webkit-scrollbar-thumb:hover {
      background: ${theme.fg};
    }
    #nano-content::-webkit-scrollbar-corner {
      background: ${theme.bg};
    }
    /* Firefox scrollbar */
    #nano-content {
      scrollbar-width: thin;
      scrollbar-color: ${theme.lineNum} ${theme.bg};
    }
  `;
  document.head.appendChild(style);

  content.tabIndex = 0; // Make it focusable
  editorContainer.appendChild(content);

  // Status bar
  const statusBar = document.createElement("div");
  statusBar.id = "nano-status";
  statusBar.style.cssText = `
    background: ${theme.status};
    color: ${theme.statusText};
    padding: 8px 12px;
    border-top: 2px solid ${theme.border};
    display: flex;
    justify-content: space-between;
  `;
  editorContainer.appendChild(statusBar);

  document.body.appendChild(editorContainer);

  // Focus on content
  content.focus();

  // Event listeners
  content.addEventListener("keydown", handleEditorKeydown);
}

/**
 * Render editor content
 */
function renderEditor() {
  if (!editorState) return;

  const theme = THEMES[editorState.theme] || THEMES.classic;
  const header = document.getElementById("nano-header");
  const content = document.getElementById("nano-content");
  const statusBar = document.getElementById("nano-status");

  // Update header
  const modifiedIndicator = editorState.modified ? " [Modified]" : "";
  header.textContent = `Nano Editor - ${editorState.filepath}${modifiedIndicator}`;

  // Get normalized selection for highlighting
  const selection = editorState.normalizeSelection();

  // Render ALL lines (not just visible window)
  let html = "";

  for (let i = 0; i < editorState.lines.length; i++) {
    const line = editorState.lines[i] || "";
    const lineNum = (i + 1).toString().padStart(4, " ");

    // Check if this line has selection
    let lineHtml = "";

    if (selection && i >= selection.startRow && i <= selection.endRow) {
      // This line has selection
      const selStart = i === selection.startRow ? selection.startCol : 0;
      const selEnd = i === selection.endRow ? selection.endCol : line.length;

      const before = line.slice(0, selStart);
      const selected = line.slice(selStart, selEnd);
      const after = line.slice(selEnd);

      if (i === editorState.cursorRow) {
        // Current line with cursor and selection
        const cursorPos = editorState.cursorCol;

        if (cursorPos < selStart) {
          const beforeCursor = before.slice(0, cursorPos);
          const cursorChar = before[cursorPos] || " ";
          const afterCursor = before.slice(cursorPos + 1);
          lineHtml = `${escapeHtml(beforeCursor)}<span style="background: ${theme.cursor}; color: ${theme.cursorBg}">${escapeHtml(cursorChar)}</span>${escapeHtml(afterCursor)}<span style="background: rgba(255,255,255,0.2)">${escapeHtml(selected)}</span>${escapeHtml(after)}`;
        } else if (cursorPos >= selStart && cursorPos < selEnd) {
          const selectedBefore = selected.slice(0, cursorPos - selStart);
          const cursorChar = selected[cursorPos - selStart] || " ";
          const selectedAfter = selected.slice(cursorPos - selStart + 1);
          lineHtml = `${escapeHtml(before)}<span style="background: rgba(255,255,255,0.2)">${escapeHtml(selectedBefore)}</span><span style="background: ${theme.cursor}; color: ${theme.cursorBg}">${escapeHtml(cursorChar)}</span><span style="background: rgba(255,255,255,0.2)">${escapeHtml(selectedAfter)}</span>${escapeHtml(after)}`;
        } else {
          const afterCursorPos = cursorPos - selEnd;
          const beforeCursor = after.slice(0, afterCursorPos);
          const cursorChar = after[afterCursorPos] || " ";
          const afterCursor = after.slice(afterCursorPos + 1);
          lineHtml = `${escapeHtml(before)}<span style="background: rgba(255,255,255,0.2)">${escapeHtml(selected)}</span>${escapeHtml(beforeCursor)}<span style="background: ${theme.cursor}; color: ${theme.cursorBg}">${escapeHtml(cursorChar)}</span>${escapeHtml(afterCursor)}`;
        }
      } else {
        // Selected line but not current
        lineHtml = `${escapeHtml(before)}<span style="background: rgba(255,255,255,0.2)">${escapeHtml(selected)}</span>${escapeHtml(after)}`;
      }
    } else if (i === editorState.cursorRow) {
      // Current line with cursor, no selection
      const before = line.slice(0, editorState.cursorCol);
      const cursorChar = line[editorState.cursorCol] || " ";
      const after = line.slice(editorState.cursorCol + 1);

      lineHtml = `${escapeHtml(before)}<span style="background: ${theme.cursor}; color: ${theme.cursorBg}">${escapeHtml(cursorChar)}</span>${escapeHtml(after)}`;
    } else {
      // Regular line
      lineHtml = escapeHtml(line);
    }

    // Add id to current line for scrolling
    const lineId = i === editorState.cursorRow ? ' id="nano-current-line"' : "";
    html += `<div${lineId}><span style="color: ${theme.lineNum}">${lineNum} │ </span>${lineHtml}</div>`;
  }

  content.innerHTML = html;

  // Scroll to current line (instant, no smooth animation)
  const currentLine = document.getElementById("nano-current-line");
  if (currentLine) {
    currentLine.scrollIntoView({ block: "center", behavior: "auto" });
  }

  // Update status bar
  const posInfo = `Line ${editorState.cursorRow + 1}/${editorState.lines.length}, Col ${editorState.cursorCol + 1}`;
  const message =
    editorState.message ||
    "^S Save  ^X Exit  ^C Copy  ^V Paste  ^K Cut  ^A Select All";

  statusBar.innerHTML = `
    <span>${posInfo}</span>
    <span>${message}</span>
  `;
}

/**
 * Handle keyboard input
 */
function handleEditorKeydown(e) {
  if (!editorState) return;

  const isShiftPressed = e.shiftKey;

  // Ctrl key combinations
  if (e.ctrlKey && !e.shiftKey) {
    switch (e.key.toLowerCase()) {
      case "s": // Save
        e.preventDefault();
        editorState.save();
        renderEditor();
        return;

      case "x": // Exit
        e.preventDefault();
        exitEditor();
        return;

      case "c": // Copy
        e.preventDefault();
        editorState.copy();
        renderEditor();
        return;

      case "v": // Paste
        e.preventDefault();
        editorState.paste();
        renderEditor();
        return;

      case "k": // Cut
        e.preventDefault();
        editorState.cut();
        renderEditor();
        return;

      case "a": // Select All
        e.preventDefault();
        editorState.selectAll();
        editorState.showMessage("Selected all text");
        renderEditor();
        return;

      case "z": // Undo (future feature)
        e.preventDefault();
        editorState.showMessage("Undo not yet implemented");
        renderEditor();
        return;
    }
  }

  // Navigation keys (with Shift for selection)
  switch (e.key) {
    case "ArrowLeft":
      e.preventDefault();
      editorState.moveCursor("left", isShiftPressed);
      renderEditor();
      return;

    case "ArrowRight":
      e.preventDefault();
      editorState.moveCursor("right", isShiftPressed);
      renderEditor();
      return;

    case "ArrowUp":
      e.preventDefault();
      editorState.moveCursor("up", isShiftPressed);
      renderEditor();
      return;

    case "ArrowDown":
      e.preventDefault();
      editorState.moveCursor("down", isShiftPressed);
      renderEditor();
      return;

    case "Home":
      e.preventDefault();
      editorState.moveCursor("home", isShiftPressed);
      renderEditor();
      return;

    case "End":
      e.preventDefault();
      editorState.moveCursor("end", isShiftPressed);
      renderEditor();
      return;

    case "PageUp":
      e.preventDefault();
      editorState.moveCursor("pageup", isShiftPressed);
      renderEditor();
      return;

    case "PageDown":
      e.preventDefault();
      editorState.moveCursor("pagedown", isShiftPressed);
      renderEditor();
      return;

    case "Backspace":
      e.preventDefault();
      if (editorState.selection) {
        editorState.deleteSelection();
      } else {
        editorState.deleteChar();
      }
      renderEditor();
      return;

    case "Delete":
      e.preventDefault();
      if (editorState.selection) {
        editorState.deleteSelection();
      } else {
        editorState.deleteCharForward();
      }
      renderEditor();
      return;

    case "Enter":
      e.preventDefault();
      if (editorState.selection) {
        editorState.deleteSelection();
      }
      editorState.insertNewline();
      renderEditor();
      return;

    case "Tab":
      e.preventDefault();
      if (editorState.selection) {
        editorState.deleteSelection();
      }
      editorState.insertChar("    "); // 4 spaces
      renderEditor();
      return;

    case "Escape":
      e.preventDefault();
      // Deselect
      editorState.selection = null;
      editorState.selectionAnchor = null;
      renderEditor();
      return;
  }

  // Regular character input
  if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
    e.preventDefault();
    if (editorState.selection) {
      editorState.deleteSelection();
    }
    editorState.insertChar(e.key);
    renderEditor();
  }
}

/**
 * Exit editor
 */
function exitEditor() {
  if (editorState.modified) {
    const save = confirm(`Save changes to ${editorState.filepath}?`);
    if (save) {
      editorState.save();
    }
  }

  // Remove editor UI
  const editor = document.getElementById("nano-editor");
  if (editor) editor.remove();

  // Remove scrollbar style
  const styles = document.querySelectorAll("style");
  styles.forEach((style) => {
    if (style.textContent.includes("#nano-content::-webkit-scrollbar")) {
      style.remove();
    }
  });

  // Restore terminal
  dom.terminal.style.display = "block";
  dom.input.style.display = "block";
  dom.input.focus();

  state.editorMode = null;
  editorState = null;

  updatePrompt();
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Check if editor is active
 */
export function isNanoActive() {
  return state.editorMode === "nano" && editorState !== null;
}

/**
 * Get editor state (for debugging)
 */
export function getNanoState() {
  return editorState;
}

/**
 * Change editor theme
 */
export function setNanoTheme(themeName) {
  if (editorState && THEMES[themeName]) {
    editorState.theme = themeName;

    // Update UI colors immediately
    const editor = document.getElementById("nano-editor");
    if (editor) {
      const theme = THEMES[themeName];
      editor.style.background = theme.bg;
      editor.style.color = theme.fg;

      const header = document.getElementById("nano-header");
      if (header) {
        header.style.background = theme.header;
        header.style.color = theme.headerText;
        header.style.borderBottom = `2px solid ${theme.border}`;
      }

      const statusBar = document.getElementById("nano-status");
      if (statusBar) {
        statusBar.style.background = theme.status;
        statusBar.style.color = theme.statusText;
        statusBar.style.borderTop = `2px solid ${theme.border}`;
      }

      renderEditor();
    }
  }
}

/**
 * Get available themes
 */
export function getNanoThemes() {
  return Object.keys(THEMES);
}
