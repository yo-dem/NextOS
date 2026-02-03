// src/terminal.js

import { dom } from "./dom.js";

export function print(text = "") {
  const div = document.createElement("div");
  div.className = "line";

  if (text.startsWith(" [INFO]")) div.style.color = "#2eb2bb";

  div.textContent = text.trim() || "\u00A0";

  dom.terminal.insertBefore(div, dom.terminal.querySelector(".prompt"));

  dom.terminal.scrollTop = dom.terminal.scrollHeight;
}

export function clearTerminal() {
  dom.terminal.querySelectorAll(".line").forEach((l) => l.remove());

  print(new Date().toLocaleString());
  print("SYSTEM READY");
  print("");
}
