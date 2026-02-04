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
