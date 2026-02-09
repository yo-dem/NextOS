// src/fs.js
import { state } from "./state.js";

export function saveFS() {
  localStorage.setItem("nextos_fs", JSON.stringify(state.fs));
}

export async function loadFS() {
  // Prima prova a caricare da localStorage
  const saved = localStorage.getItem("nextos_fs");
  if (saved) {
    state.fs = JSON.parse(saved);
    console.log("Filesystem loaded from localStorage");
    return;
  }
  // Se non c'è niente salvato, carica da fs.json
  const res = await fetch("fs.json");
  state.fs = await res.json();
  console.log("Filesystem loaded from fs.json");
}

export function getNode(path) {
  let node = state.fs;
  for (const part of path) {
    if (!node.children || !node.children[part]) return null;
    node = node.children[part];
  }
  return node;
}

export function resolvePath(cwd, rel) {
  if (!rel) return cwd;
  if (rel.startsWith("/")) return rel;
  const full = (cwd + "/" + rel).replace(/\/+/g, "/");
  return full.endsWith("/") ? full.slice(0, -1) : full;
}

export function autocomplete(input, cwd) {
  // NON fare trim qui!
  const parts = input.split(/\s+/).filter((p) => p !== "");
  const command = parts[0] || "";

  // Converti cwd in stringa se è un array
  const cwdStr = Array.isArray(cwd) ? "/" + cwd.join("/") : cwd;

  // Controlla se c'è l'opzione -r per rm
  const hasRecursiveFlag = parts.includes("-r") || parts.includes("-rf");
  const isCD = command === "cd";
  const isRmRecursive = command === "rm" && hasRecursiveFlag;

  // Se l'input finisce con spazio, vogliamo completare una nuova parola
  const hasTrailingSpace = input.endsWith(" ");
  let pathToComplete;
  let isFirstWord = false;

  if (hasTrailingSpace) {
    // "cd " -> completa tutto
    pathToComplete = "";
  } else if (parts.length === 1) {
    // "p" -> completa con "p"
    pathToComplete = command;
    isFirstWord = true;
  } else {
    // "cat pro" -> completa con "pro"
    pathToComplete = parts[parts.length - 1];
    // Salta le opzioni che iniziano con -
    if (pathToComplete.startsWith("-")) {
      return {
        matches: [],
        basePath: "",
        parts: parts.slice(0, -1),
        isDirectory: [],
      };
    }
  }

  let basePath = "";

  // Determina il percorso base
  if (pathToComplete.includes("/")) {
    const lastSlash = pathToComplete.lastIndexOf("/");
    basePath = pathToComplete.substring(0, lastSlash + 1);
    pathToComplete = pathToComplete.substring(lastSlash + 1);
  }

  // Risolvi il path target
  const targetPath = basePath ? resolvePath(cwdStr, basePath) : cwdStr;

  // Converti il path in array per getNode
  const pathParts =
    targetPath === "/" ? [] : targetPath.split("/").filter(Boolean);

  const node = getNode(pathParts);

  if (!node || !node.children) {
    return {
      matches: [],
      basePath,
      parts: parts.slice(0, -1),
      isDirectory: [],
    };
  }

  // Filtra in base al comando
  const matches = Object.keys(node.children)
    .filter((name) => {
      if (!name.startsWith(pathToComplete)) return false;

      const entry = node.children[name];
      const isDirectory = entry.type === "dir";

      // Se stiamo completando la prima parola (nessun comando), mostra tutto
      if (isFirstWord) return true;

      // cd → solo directory
      if (isCD) return isDirectory;

      // rm -r → solo directory
      if (isRmRecursive) return isDirectory;

      // Tutti gli altri comandi → solo file
      return !isDirectory;
    })
    .sort();

  // Aggiungi info se i match sono directory
  const isDirectory = matches.map((name) => node.children[name].type === "dir");

  // Calcola correttamente parts per il ritorno
  let returnParts;
  if (parts.length === 1 && !hasTrailingSpace) {
    returnParts = [];
  } else if (hasTrailingSpace) {
    returnParts = parts;
  } else {
    returnParts = parts.slice(0, -1);
  }

  return {
    matches,
    basePath,
    parts: returnParts,
    isDirectory,
  };
}

export function normalizePath(cwd, path) {
  let parts = [];
  // Path assoluto
  if (path.startsWith("/")) {
    parts = path.split("/");
  }
  // Path relativo
  else {
    parts = [...cwd, ...path.split("/")];
  }

  const stack = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") {
      stack.pop();
    } else {
      stack.push(part);
    }
  }
  return stack;
}

export function isValidName(name) {
  if (!name) return false;
  // Niente . o ..
  if (name === "." || name === "..") return false;
  // Deve iniziare con lettera
  if (!/^[a-zA-Z]/.test(name)) return false;
  // Solo caratteri ammessi
  if (!/^[a-zA-Z][a-zA-Z0-9._-]*$/.test(name)) return false;
  return true;
}
