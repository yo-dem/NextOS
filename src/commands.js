// src/commands.js

import { state } from "./state.js";
import { print } from "./terminal.js";
import { getNode, saveFS, normalizePath } from "./fs.js"; // ← Importa saveFS
import { updatePrompt } from "./prompt.js";

export function cmdLs() {
  const node = getNode(state.cwd);

  if (!node || !node.children) {
    print("ls: not a directory");
    return;
  }

  let files = 0;
  let dirs = 0;

  const W = 40;

  print("");
  print(`${".".padEnd(W)}[*]`);
  print(`${"..".padEnd(W)}[*]`);

  for (const [n, i] of Object.entries(node.children)) {
    let icon;
    if (i.type === "dir") icon = "[dir]";
    if (i.type === "app") icon = "[prg]";
    if (i.type === "txt") icon = "[txt]";
    const name = n.padEnd(W);

    if (i.type === "dir") {
      dirs++;
      print(`${name}${icon}`);
    } else {
      files++;

      let size = i.size ?? 0;

      if (typeof size === "number") {
        size = `${size} KB`;
      }

      print(`${name}${icon} ${size}`);
    }
  }

  print("");
  print(`${dirs} dir, ${files} file`);
  print("");
}

export function cmdCd(path) {
  if (!path) return;

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

  // Crea la directory
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
    return;
  }

  // if (state.currentUser.role === "guest") {
  //   print("rmdir: permission denied");
  //   print("");
  //   return;
  // }

  // Rimuove eventuale /
  path = path.replace(/\/+$/, "");

  // Risolve path completo
  const fullPath = normalizePath(state.cwd, path);

  if (fullPath.length === 0) {
    print("rmdir: cannot remove root");
    print("");
    return;
  }

  // Separiamo parent / nome
  const name = fullPath.pop();
  const parentPath = fullPath;

  const parentNode = getNode(parentPath);

  if (!parentNode || !parentNode.children) {
    print(`rmdir: '${path}': No such directory`);
    print("");
    return;
  }

  const target = parentNode.children[name];

  if (!target) {
    print(`rmdir: '${path}': No such directory`);
    print("");
    return;
  }

  if (target.type !== "dir") {
    print(`rmdir: '${path}': Not a directory`);
    print("");
    return;
  }

  if (Object.keys(target.children).length > 0) {
    print(`rmdir: '${path}': Directory not empty`);
    print("");
    return;
  }

  delete parentNode.children[name];
  saveFS();

  print(`Removed: ${path}/`);
  print("");
}

export function cmdRm(args) {
  if (!args || args.length === 0) {
    print("rm: missing operand");
    print("Usage: rm [-r] <file|directory>");
    print("");
    return;
  }

  // if (state.currentUser.role === "guest") {
  //   print("rm: permission denied");
  //   print("");
  //   return;
  // }

  let recursive = false;
  let targetPath = args[0];

  // Flag -r
  if (args[0] === "-r" || args[0] === "-R") {
    recursive = true;
    targetPath = args[1];

    if (!targetPath) {
      print("rm: missing operand after '-r'");
      print("");
      return;
    }
  }

  // Rimuove / finale
  targetPath = targetPath.replace(/\/+$/, "");

  // Normalizza path
  const fullPath = normalizePath(state.cwd, targetPath);

  if (fullPath.length === 0) {
    print("rm: cannot remove root");
    print("");
    return;
  }

  // Parent + nome
  const name = fullPath.pop();
  const parentPath = fullPath;

  const parentNode = getNode(parentPath);

  if (!parentNode || !parentNode.children) {
    print(`rm: '${targetPath}': No such file or directory`);
    print("");
    return;
  }

  const target = parentNode.children[name];

  if (!target) {
    print(`rm: '${targetPath}': No such file or directory`);
    print("");
    return;
  }

  // Se directory
  if (target.type === "dir") {
    if (!recursive) {
      print(`rm: '${targetPath}': is a directory`);
      print("Use rm -r to remove directories");
      print("");
      return;
    }

    // Ricorsione: elimina tutto
    delete parentNode.children[name];
    saveFS();

    print(`Removed recursively: ${targetPath}/`);
    print("");
    return;
  }

  // Se file
  delete parentNode.children[name];
  saveFS();

  print(`Removed: ${targetPath}`);
  print("");
}
