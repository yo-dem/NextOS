// src/fs.js

import { state } from "./state.js";

export async function loadFS() {
  const res = await fetch("fs.json");
  state.fs = await res.json();
}

export function getNode(path) {
  let node = state.fs;

  for (const part of path) {
    if (!node.children || !node.children[part]) return null;
    node = node.children[part];
  }

  return node;
}
