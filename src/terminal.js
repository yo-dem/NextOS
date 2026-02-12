// src/terminal.js

import { dom } from "./dom.js";

export function print(text = "") {
  const div = document.createElement("div");
  div.className = "line";

  if (text.startsWith(" [INFO]")) {
    div.style.color = "var(--header-color)";
  }
  if (text.startsWith("NextOS Terminal")) {
    div.style.color = "var(--header-color)";
    div.style.fontWeight = "bold";
  }
  if (text.includes("[dir]")) {
    div.classList.add("dir");
  }
  if (text.includes("[lnk]")) {
    div.classList.add("lnk");
  }
  if (text.includes("[txt]")) {
    div.classList.add("txt");
  }

  div.textContent = text || "\u00A0";

  dom.terminal.insertBefore(div, dom.terminal.querySelector(".prompt"));

  dom.terminal.scrollTop = dom.terminal.scrollHeight;
}

export function clearTerminal() {
  dom.terminal.querySelectorAll(".line").forEach((l) => l.remove());
}
