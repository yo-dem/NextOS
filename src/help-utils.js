// src/help-utils.js

import { helpTexts } from "./help-texts.js";
import { print } from "./terminal.js";

export function showHelp(command) {
  const helpLines = helpTexts[command];

  if (!helpLines) {
    print(`No help available for: ${command}`);
    print("");
    return;
  }

  // Stampa ogni riga dell'array
  helpLines.forEach((line) => print(line));
  print("");
}

export function hasHelpFlag(args) {
  return args.includes("--help") || args.includes("-h");
}
