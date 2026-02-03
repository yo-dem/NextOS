// src/commands.js

import { state } from "./state.js";
import { print } from "./terminal.js";
import { getNode } from "./fs.js";
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
  print(`   ${".".padEnd(W)}[*]`);
  print(`   ${"..".padEnd(W)}[*]`);

  for (const [n, i] of Object.entries(node.children)) {
    const icon = i.type === "dir" ? "[dir]" : "[prg]";

    const name = n.padEnd(W);

    if (i.type === "dir") {
      dirs++;
      print(`   ${name}${icon}`);
    } else {
      files++;
      print(`   ${name}${icon} ${i.size ?? 0} KB`);
    }
  }

  print("");
  print(`   ${dirs} dir, ${files} file`);
}

export function cmdCd(arg) {
  if (!arg) return;

  if (arg === "..") {
    state.cwd.pop();
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
