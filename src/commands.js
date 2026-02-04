// src/commands.js

import { state } from "./state.js";
import { print } from "./terminal.js";
import { getNode, saveFS } from "./fs.js"; // ← Importa saveFS
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
    const icon = i.type === "dir" ? "[dir]" : "[prg]";
    const name = n.padEnd(W);

    if (i.type === "dir") {
      dirs++;
      print(`${name}${icon}`);
    } else {
      files++;
      print(`${name}${icon} ${i.size ?? 0} KB`);
    }
  }

  print("");
  print(`${dirs} dir, ${files} file`);
  print("");
}

export function cmdCd(arg) {
  if (!arg) return;

  if (arg === "..") {
    state.cwd.pop();
    updatePrompt();
    return;
  }

  if (arg == "/") {
    state.cwd = [];
    updatePrompt();
    return;
  }

  const target = getNode([...state.cwd, arg]);

  if (!target || target.type !== "dir") {
    print("cd: no such directory");
    return;
  }

  state.cwd.push(arg);
  updatePrompt();
}

export function cmdMkdir(dirName) {
  if (!dirName) {
    print("mkdir: missing directory name");
    print("");
    return;
  }

  if (state.currentUser.role === "guest") {
    print("mkdir: permission denied");
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

  // Crea la directory
  currentNode.children[dirName] = {
    type: "dir",
    children: {},
  };

  saveFS();

  print(`Created: ${dirName}/`);
  print("");
}

export function cmdRmdir(dirName) {
  if (!dirName) {
    print("rmdir: missing directory name");
    print("");
    return;
  }

  if (state.currentUser.role === "guest") {
    print("rmdir: permission denied");
    print("");
    return;
  }

  const currentNode = getNode(state.cwd);

  if (!currentNode || !currentNode.children) {
    print("rmdir: current directory error");
    print("");
    return;
  }

  if (!currentNode.children[dirName]) {
    print(`rmdir: '${dirName}': No such directory`);
    print("");
    return;
  }

  const target = currentNode.children[dirName];

  if (target.type !== "dir") {
    print(`rmdir: '${dirName}': Not a directory`);
    print("");
    return;
  }

  // Controlla se la directory è vuota
  if (Object.keys(target.children).length > 0) {
    print(`rmdir: '${dirName}': Directory not empty`);
    print("");
    return;
  }

  delete currentNode.children[dirName];
  saveFS();

  print(`Removed: ${dirName}/`);
  print("");
}

export function cmdRm(args) {
  if (!args || args.length === 0) {
    print("rm: missing operand");
    print("Usage: rm [-r] <file|directory>");
    print("");
    return;
  }

  if (state.currentUser.role === "guest") {
    print("rm: permission denied");
    print("");
    return;
  }

  let recursive = false;
  let targetName = args[0];

  // Controlla se c'è il flag -r
  if (args[0] === "-r" || args[0] === "-R") {
    recursive = true;
    targetName = args[1];

    if (!targetName) {
      print("rm: missing operand after '-r'");
      print("");
      return;
    }
  }

  const currentNode = getNode(state.cwd);

  if (!currentNode || !currentNode.children) {
    print("rm: current directory error");
    print("");
    return;
  }

  if (!currentNode.children[targetName]) {
    print(`rm: cannot remove '${targetName}': No such file or directory`);
    print("");
    return;
  }

  const target = currentNode.children[targetName];

  // Se è una directory
  if (target.type === "dir") {
    if (!recursive) {
      print(`rm: cannot remove '${targetName}': Is a directory`);
      print("Use 'rm -r' to remove directories");
      print("");
      return;
    }
    // Con -r può rimuovere anche directory piene
  }

  // Rimuovi
  delete currentNode.children[targetName];
  saveFS();

  print(`Removed: ${targetName}`);
  print("");
}
