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

function findMatches(prefix, cwd) {
  const node = getNode(cwd);
  if (!node || !node.children) return [];

  return Object.keys(node.children).filter((name) => name.startsWith(prefix));
}

export function resolvePath(cwd, rel) {
  if (!rel) return cwd;

  if (rel.startsWith("/")) return rel;

  const full = (cwd + "/" + rel).replace(/\/+/g, "/");

  return full.endsWith("/") ? full.slice(0, -1) : full;
}

export function autocomplete(input, cwd) {
  const cursor = input.length;

  const before = input.slice(0, cursor);
  const parts = before.split(/\s+/);

  const last = parts.pop() || "";

  const lastSlash = last.lastIndexOf("/");

  let basePath = "";
  let prefix = last;

  if (lastSlash !== -1) {
    basePath = last.slice(0, lastSlash + 1);
    prefix = last.slice(lastSlash + 1);
  }

  const searchPath = resolvePath(cwd, basePath);

  const matches = findMatches(prefix, searchPath);

  return {
    parts,
    basePath,
    prefix,
    matches,
  };
}
