// src/commands.js

import { state } from "./state.js";
import { print } from "./terminal.js";
import { getNode, isValidName, normalizePath, saveFS } from "./fs.js"; // ← Importa saveFS
import { updatePrompt } from "./prompt.js";

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

  // Organizza gli elementi per tipo
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

export function CmdMv(args) {
  // Validazione argomenti
  if (args.length !== 2) {
    print("mv: missing operand");
    print("Usage: mv SOURCE DEST");
    print("");
    return;
  }

  // Controlla permessi
  // if (state.currentUser.role === "guest") {
  //   print("mv: permission denied");
  //   print("");
  //   return;
  // }

  const [source, dest] = args;

  // Risolvi i percorsi usando le tue funzioni
  const sourcePath = normalizePath(state.cwd, source);
  const sourcePathStr = "/" + sourcePath.join("/");

  // Ottieni il nodo sorgente
  const sourceNode = getNode(sourcePath);
  if (!sourceNode) {
    print(`mv: cannot stat '${source}': No such file or directory`);
    print("");
    return;
  }

  // Non permettere di muovere la root
  if (sourcePath.length === 0) {
    print("mv: cannot move root directory");
    print("");
    return;
  }

  // Ottieni il parent della sorgente
  const sourceParentPath = sourcePath.slice(0, -1);
  const sourceParentNode = getNode(sourceParentPath);
  const sourceName = sourcePath[sourcePath.length - 1];

  if (!sourceParentNode || !sourceParentNode.children) {
    print("mv: source parent directory error");
    print("");
    return;
  }

  // Risolvi la destinazione
  const destPath = normalizePath(state.cwd, dest);
  const destNode = getNode(destPath);

  let finalDestPath;
  let finalDestParentPath;
  let finalDestName;

  // Se dest è una directory esistente, sposta dentro
  if (destNode && destNode.type === "dir") {
    finalDestPath = [...destPath, sourceName];
    finalDestParentPath = destPath;
    finalDestName = sourceName;
  } else {
    // Altrimenti usa dest come nuovo nome/percorso
    finalDestPath = destPath;
    finalDestParentPath = destPath.slice(0, -1);
    finalDestName = destPath[destPath.length - 1];
  }

  // Ottieni il parent di destinazione
  const destParentNode = getNode(finalDestParentPath);

  if (!destParentNode || !destParentNode.children) {
    print(
      `mv: cannot move '${source}' to '${dest}': No such file or directory`,
    );
    print("");
    return;
  }

  // Controlla se la destinazione esiste già
  if (destParentNode.children[finalDestName]) {
    print(`mv: cannot move '${source}' to '${dest}': File exists`);
    print("");
    return;
  }

  // Previeni loop: non si può muovere una directory dentro se stessa
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
