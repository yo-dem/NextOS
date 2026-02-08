// src/commands.js

import { state, saveUser, VERSION } from "./state.js";
import { dom } from "./dom.js";
import { getNode, isValidName, normalizePath, saveFS, loadFS } from "./fs.js";
import { updatePrompt, updateCaret } from "./prompt.js";
import { clearTerminal, print } from "./terminal.js";
import { applyTheme } from "./theme.js";
import { openEditor } from "./editor.js";
import { runBasicFile } from "./basic-runner.js";

export function cmdLs() {
  const node = getNode(state.cwd);

  if (!node || !node.children) {
    print("ls: not a directory");
    return;
  }

  let files = 0;
  let links = 0;
  let dirs = 0;

  const W = 50;

  const entries = Object.entries(node.children);

  const directories = entries
    .filter(([_, i]) => i.type === "dir")
    .sort((a, b) => a[0].localeCompare(b[0]));
  const linkFiles = entries
    .filter(([_, i]) => i.type === "lnk")
    .sort((a, b) => a[0].localeCompare(b[0]));
  const textFiles = entries
    .filter(([_, i]) => i.type === "txt")
    .sort((a, b) => a[0].localeCompare(b[0]));

  print("");

  // 1. Mostra directory
  for (const [n, i] of directories) {
    dirs++;
    let name = "▸ " + n.padEnd(W - 2);
    print(`${name}[dir]`);
  }

  // 2. Mostra links
  for (const [n, i] of linkFiles) {
    links++;
    let name = "  " + n.padEnd(W - 2);
    print(`${name}[lnk]`);
  }

  // 3. Mostra file
  for (const [n, i] of textFiles) {
    files++;
    let size = i.size ?? 0;

    if (typeof size === "number") {
      size = `${size} KB`;
    }

    let name = "  " + n.padEnd(W - 2);
    print(`${name}[txt] size: ${size}`);
  }

  print("");
  print(`${dirs} dir, ${files} file, ${links} link`);
  print("");
}

export function cmdCd(path) {
  if (!path) {
    print("cd: missing directory name");
    print("Usage: cd <directory>");
    print("");
    return;
  }

  const newPath = normalizePath(state.cwd, path);

  const node = getNode(newPath);

  if (!node || node.type !== "dir") {
    print(`cd: ${path}: No such directory`);
    return;
  }

  state.cwd = newPath;
  updatePrompt();
}

export function cmdMkdir(dirName) {
  if (!dirName) {
    print("mkdir: missing directory name");
    print("");
    return;
  }

  // if (state.currentUser.role === "guest") {
  //   print("mkdir: permission denied");
  //   print("");
  //   return;
  // }

  if (!isValidName(dirName)) {
    print(`mkdir: invalid directory name: '${dirName}'`);
    print("");
    return;
  }

  const currentNode = getNode(state.cwd);

  if (!currentNode || !currentNode.children) {
    print("mkdir: current directory error");
    print("");
    return;
  }

  if (currentNode.children[dirName]) {
    print(`mkdir: '${dirName}' already exists`);
    print("");
    return;
  }

  currentNode.children[dirName] = {
    type: "dir",
    children: {},
  };

  saveFS();

  print(`Created: ${dirName}/`);
  print("");
}

export function cmdRmdir(path) {
  if (!path) {
    print("rmdir: missing directory name");
    print("");
    updatePrompt();
    return;
  }

  // if (state.currentUser.role === "guest") {
  //   print("rmdir: permission denied");
  //   print("");
  //   return;
  // }

  path = path.replace(/\/+$/, "");

  const fullPath = normalizePath(state.cwd, path);

  if (fullPath.length === 0) {
    print("rmdir: cannot remove root");
    print("");
    updatePrompt();
    return;
  }

  const name = fullPath.pop();
  const parentPath = fullPath;

  const parentNode = getNode(parentPath);

  if (!parentNode || !parentNode.children) {
    print(`rmdir: '${path}': No such directory`);
    print("");
    updatePrompt();
    return;
  }

  const target = parentNode.children[name];

  if (!target) {
    print(`rmdir: '${path}': No such directory`);
    print("");
    updatePrompt();
    return;
  }

  if (target.type !== "dir") {
    print(`rmdir: '${path}': Not a directory`);
    print("");
    updatePrompt();
    return;
  }

  if (Object.keys(target.children).length > 0) {
    print(`rmdir: '${path}': Directory not empty`);
    print("");
    updatePrompt();
    return;
  }

  print(`Remove directory '${path}'?`);
  print("y/N:");
  print("");

  state.waitingConfirm = {
    type: "rmdir",
    parentNode,
    name,
    path,
  };

  return;
}

export function cmdRm(args) {
  if (!args || args.length === 0) {
    print("rm: missing operand");
    print("Usage: rm [-r] <file|directory>");
    print("");
    updatePrompt();
    return;
  }

  // if (state.currentUser.role === "guest") {
  //   print("rm: permission denied");
  //   print("");
  //   return;
  // }

  let recursive = false;
  let targetPath = args[0];

  if (args[0] === "-r" || args[0] === "-R") {
    recursive = true;
    targetPath = args[1];

    if (!targetPath) {
      print("rm: missing operand after '-r'");
      print("");
      updatePrompt();
      return;
    }
  }

  targetPath = targetPath.replace(/\/+$/, "");
  const fullPath = normalizePath(state.cwd, targetPath);

  if (fullPath.length === 0) {
    print("rm: cannot remove root");
    print("");
    updatePrompt();
    return;
  }

  const name = fullPath.pop();
  const parentPath = fullPath;

  const parentNode = getNode(parentPath);

  if (!parentNode || !parentNode.children) {
    print(`rm: '${targetPath}': No such file or directory`);
    print("");
    updatePrompt();
    return;
  }

  const target = parentNode.children[name];

  if (!target) {
    print(`rm: '${targetPath}': No such file or directory`);
    print("");
    updatePrompt();
    return;
  }

  let msg = "";

  if (target.type === "dir") {
    msg = recursive
      ? `Remove recursively '${targetPath}'?\ny/N:`
      : `rm: '${targetPath}': is a directory`;
  } else {
    msg = `Remove '${targetPath}'?\ny/N:`;
  }

  if (target.type === "dir" && !recursive) {
    print(msg);
    print("Use rm -r to remove directories");
    print("");
    updatePrompt();
    return;
  }

  print(msg);
  print("");

  state.waitingConfirm = {
    type: "rm",
    parentNode,
    name,
    path: targetPath,
    isDir: target.type === "dir",
    recursive,
  };

  return;
}

export function cmdMkLink(args) {
  if (!args || args.length !== 2) {
    print("ln: missing operand");
    print("Usage: mklink <url> <name>");
    print("");
    return;
  }

  const [url, name] = args;

  // Controllo nome valido
  if (!isValidName(name)) {
    print(`mklink: invalid name: '${name}'`);
    print("");
    return;
  }

  // Controllo URL minimo
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    print("mklink: invalid url");
    print("");
    return;
  }

  // Directory corrente
  const currentNode = getNode(state.cwd);

  if (!currentNode || !currentNode.children) {
    print("mklink: current directory error");
    print("");
    return;
  }

  // Nome già esistente
  if (currentNode.children[name]) {
    print(`mklink: '${name}' already exists`);
    print("");
    return;
  }

  // Crea link
  currentNode.children[name] = {
    type: "lnk",
    url: url,
  };

  saveFS();

  print(`Link created: ${name} -> ${url}`);
  print("");
}

export function cmdRmLink(path) {
  if (!path) {
    print("rmlink: missing link name");
    print("");
    updatePrompt();
    return;
  }

  path = path.replace(/\/+$/, "");

  const fullPath = normalizePath(state.cwd, path);

  if (fullPath.length === 0) {
    print("rmlink: cannot remove link");
    print("");
    updatePrompt();
    return;
  }

  const name = fullPath.pop();
  const parentPath = fullPath;

  const parentNode = getNode(parentPath);

  if (!parentNode || !parentNode.children) {
    print(`rmlink: '${path}': No such link`);
    print("");
    updatePrompt();
    return;
  }

  const target = parentNode.children[name];

  if (!target) {
    print(`rmlink: '${path}': No such link`);
    print("");
    updatePrompt();
    return;
  }

  if (target.type !== "lnk") {
    print(`rmlink: '${path}': Not a link`);
    print("");
    updatePrompt();
    return;
  }

  print(`Remove link '${name}'?`);
  print("y/N:");
  print("");

  state.waitingConfirm = {
    type: "rmlink",
    parentNode,
    name,
    path,
  };

  return;
}

export function cmdMv(args) {
  if (args.length !== 2) {
    print("mv: missing operand");
    print("Usage: mv SOURCE DEST");
    print("");
    return;
  }

  const [source, dest] = args;

  const sourcePath = normalizePath(state.cwd, source);

  const sourceNode = getNode(sourcePath);
  if (!sourceNode) {
    print(`mv: cannot move or rename '${source}': No such file or directory`);
    print("");
    return;
  }

  if (sourcePath.length === 0) {
    print("mv: cannot move root directory");
    print("");
    return;
  }

  const sourceParentPath = sourcePath.slice(0, -1);
  const sourceParentNode = getNode(sourceParentPath);
  const sourceName = sourcePath[sourcePath.length - 1];

  if (!sourceParentNode || !sourceParentNode.children) {
    print("mv: source parent directory error");
    print("");
    return;
  }

  const destPath = normalizePath(state.cwd, dest);
  const destNode = getNode(destPath);

  let finalDestPath;
  let finalDestParentPath;
  let finalDestName;

  if (destNode && destNode.type === "dir") {
    finalDestPath = [...destPath, sourceName];
    finalDestParentPath = destPath;
    finalDestName = sourceName;
  } else {
    finalDestPath = destPath;
    finalDestParentPath = destPath.slice(0, -1);
    finalDestName = destPath[destPath.length - 1];
  }

  const destParentNode = getNode(finalDestParentPath);

  if (!destParentNode || !destParentNode.children) {
    print(
      `mv: cannot move '${source}' to '${dest}': No such file or directory`,
    );
    print("");
    return;
  }

  if (destParentNode.children[finalDestName]) {
    print(`mv: cannot move '${source}' to '${dest}': File exists`);
    print("");
    return;
  }

  if (sourceNode.type === "dir") {
    const sourcePathStr = "/" + sourcePath.join("/");
    const finalDestPathStr = "/" + finalDestPath.join("/");

    if (finalDestPathStr.startsWith(sourcePathStr + "/")) {
      print(
        `mv: cannot move '${source}' to a subdirectory of itself, '${dest}'`,
      );
      print("");
      return;
    }
  }

  // Esegui lo spostamento
  // 1. Aggiungi alla destinazione
  destParentNode.children[finalDestName] = sourceNode;

  // 2. Rimuovi dalla sorgente
  delete sourceParentNode.children[sourceName];

  // 3. Salva il filesystem
  saveFS();

  print("");
}

export function cmdCp(args) {
  if (!args || args.length < 2) {
    print("cp: missing operand");
    print("Usage: cp [-r] SOURCE DEST");
    print("");
    return;
  }

  let recursive = false;
  let sourcePathStr, destPathStr;

  if (args[0] === "-r") {
    recursive = true;
    sourcePathStr = args[1];
    destPathStr = args[2];
    if (!sourcePathStr || !destPathStr) {
      print("cp: missing operand for recursive copy");
      return;
    }
  } else {
    sourcePathStr = args[0];
    destPathStr = args[1];
  }

  const sourcePath = normalizePath(state.cwd, sourcePathStr);
  const destPath = normalizePath(state.cwd, destPathStr);

  const sourceNode = getNode(sourcePath);
  if (!sourceNode) {
    print(`cp: '${sourcePathStr}': No such file or directory`);
    return;
  }

  const sourceName = sourcePath[sourcePath.length - 1];
  const sourceParent = getNode(sourcePath.slice(0, -1));

  const destNode = getNode(destPath);
  let destParent, destName;

  if (destNode && destNode.type === "dir") {
    // Copia dentro la directory
    destParent = destNode;
    destName = sourceName;
  } else {
    // Copia con nuovo nome
    destParent = getNode(destPath.slice(0, -1));
    destName = destPath[destPath.length - 1];
  }

  if (!destParent || !destParent.children) {
    print(`cp: destination path invalid: '${destPathStr}'`);
    return;
  }

  // Controllo per directory senza -r
  if (sourceNode.type === "dir" && !recursive) {
    print(`cp: -r not specified; omitting directory '${sourcePathStr}'`);
    return;
  }

  // Evita copia di directory dentro se stessa
  if (sourceNode.type === "dir") {
    const sourceFull = "/" + sourcePath.join("/");
    const destFull = "/" + [...destPath, sourceName].join("/");
    if (destFull.startsWith(sourceFull + "/")) {
      print(`cp: cannot copy '${sourcePathStr}' into a subdirectory of itself`);
      return;
    }
  }

  // Funzione di copia profonda
  function deepCopy(node) {
    if (node.type === "txt") {
      return { ...node }; // copia superficiale va bene
    } else if (node.type === "dir") {
      const newDir = { type: "dir", children: {} };
      for (const [k, v] of Object.entries(node.children)) {
        newDir.children[k] = deepCopy(v);
      }
      return newDir;
    } else if (node.type === "lnk") {
      return { ...node };
    }
  }

  destParent.children[destName] = deepCopy(sourceNode);

  saveFS();
  print(`Copied '${sourcePathStr}' -> '${destPathStr}'`);
  print("");
}

export function cmdClear(silently = false) {
  terminal.querySelectorAll(".line").forEach((l) => l.remove());
  if (!silently) {
    print(new Date().toLocaleString());
    print("SYSTEM READY");
  }
  print("");
}

export function cmdReset() {
  print(`All personal file or directory will be lost.`);
  print("y/N:");
  print("");

  state.waitingConfirm = {
    type: "reset",
  };

  return;
}

export function cmdPrintDateTime() {
  print(new Date().toLocaleString());
  print("");
}

export function cmdPrintVersion() {
  print("" + VERSION);
  print("");
}

export function cmdLogin() {
  clearTerminal();

  state.isLoggingIn = true;
  state.loginStep = 0;
  state.loginUser = null;
  state.passwordBuffer = "";

  updatePrompt();

  print("Insert username:");
  print("");
}

export function cmdLogout(silently = false) {
  state.currentUser = {
    username: "guest",
    role: "guest",
  };

  saveUser();

  dom.input.value = "";
  updateCaret();

  if (!silently) {
    print("Logged out. Welcome guest.");
    print("");
  }

  state.cwd = [];
  updatePrompt();
}

export function cmdOpenEditor(path) {
  openEditor(path);
}

export function cmdRun(args) {
  if (!args || args.length === 0) {
    print("");
    print("Usage: run <file.bas>");
    print("");
    print("Execute a BASIC program from the terminal.");
    print("");
    updatePrompt();
    dom.input.style.display = "block";
    dom.input.focus();
    return;
  }

  const filepath = args[0];

  // Check extension
  if (!filepath.endsWith(".bas")) {
    print("");
    print("Warning: File should have .bas extension");
    print("");
    updatePrompt();
    dom.input.style.display = "block";
    dom.input.focus();
  }

  runBasicFile(filepath);
}

export function cmdHelp() {
  print("");
  print("NEXTOS TERMINAL - Quick Reference");
  print("");
  print("Directories:     ls, cd,  mkdir, rmdir, rm [-r]");
  print("Files:           mklink, rmlink, mv, cp, rm");
  print("System:          clear, reset, time, version");
  print("User:            login, logout");
  print("Other:           vi, run, theme, help");
  print("");
  print("Use '<command> --help' for detailed info");
  print("Example: ls --help, cd --help, rm --help");
  print("");
}

export function cmdRunApp(inputPath) {
  const parts = normalizePath(state.cwd, inputPath);

  const node = getNode(parts);

  if (!node || node.type !== "lnk") {
    print(`Command not found: ${inputPath}`);
    print("");
    return;
  }

  // Get current theme from localStorage or default to classic
  const currentTheme = localStorage.getItem("terminal_theme") || "dracula";

  // Build URL with theme parameter
  let appUrl = node.url;
  const separator = appUrl.includes("?") ? "&" : "?";
  appUrl += `${separator}theme=${currentTheme}`;

  print("Launching " + inputPath + "...");
  window.open(appUrl, "_blank");
  print("done");
  print("");
}

export async function handleConfirm(value) {
  const confirm = state.waitingConfirm;
  state.waitingConfirm = null;

  if (value.toLowerCase() !== "y" || value == "") {
    print("Action cancelled.");
    print("");
    updatePrompt();
    return;
  }

  // RESET
  if (confirm.type === "reset") {
    applyTheme("dracula");
    cmdLogout(true);
    clearTerminal(true);
    state.history = [];
    state.historyIndex = -1;
    localStorage.clear();
    await loadFS();

    updatePrompt();
    return;
  }

  // RMDIR
  if (confirm.type === "rmdir") {
    delete confirm.parentNode.children[confirm.name];
    saveFS();

    print(`Removed: ${confirm.path}/`);
    print("");
    updatePrompt();
    return;
  }

  // RMLINK
  if (confirm.type === "rmlink") {
    delete confirm.parentNode.children[confirm.name];

    saveFS();

    print(`Removed: ${confirm.path}/`);
    print("");
    updatePrompt();
    return;
  }

  // RM
  if (confirm.type === "rm") {
    delete confirm.parentNode.children[confirm.name];
    saveFS();

    if (confirm.isDir) {
      print(`Removed recursively: ${confirm.path}/`);
    } else {
      print(`Removed: ${confirm.path}`);
    }

    print("");
    updatePrompt();
    return;
  }
}
