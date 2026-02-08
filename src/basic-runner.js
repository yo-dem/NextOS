// src/basic-runner.js

import { state } from "./state.js";
import { print } from "./terminal.js";
import { getNode, normalizePath } from "./fs.js";
import { updatePrompt } from "./prompt.js";
import { dom } from "./dom.js";

let runnerInterpreter = null;
let runnerInputCallback = null;

/**
 * BASIC Interpreter Class (for terminal execution)
 */
class BasicInterpreter {
  constructor() {
    this.program = [];
    this.variables = {};
    this.running = false;
    this.currentLine = 0;
    this.returnStack = [];
    this.forLoops = {};
  }

  load(lines) {
    this.program = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const match = trimmed.match(/^(\d+)\s+(.+)$/);
      if (match) {
        this.program.push({
          num: parseInt(match[1]),
          code: match[2].trim(),
        });
      }
    }

    this.program.sort((a, b) => a.num - b.num);
  }

  async run(outputFn, inputFn) {
    this.running = true;
    this.variables = {};
    this.returnStack = [];
    this.forLoops = {};
    this.currentLine = 0;
    this.breakRequested = false; // <-- nuova variabile

    while (this.currentLine < this.program.length && this.running) {
      if (this.breakRequested) {
        outputFn("[BREAK]");
        break;
      }

      const line = this.program[this.currentLine];

      try {
        const result = await this.executeLine(line, outputFn, inputFn);

        // Delay per simulare terminale lento
        await new Promise((r) => setTimeout(r, 200));

        if (result === "END") break;
        if (typeof result === "number") {
          const idx = this.program.findIndex((l) => l.num === result);
          if (idx !== -1) {
            this.currentLine = idx;
            continue;
          }
        }

        this.currentLine++;
      } catch (err) {
        outputFn(`Error at line ${line.num}: ${err.message}`, "error");
        break;
      }
    }

    this.running = false;
  }

  async executeLine(line, outputFn, inputFn) {
    const code = line.code;
    const tokens = code.split(/\s+/);
    const cmd = tokens[0].toUpperCase();

    switch (cmd) {
      case "PRINT": {
        const expr = code.substring(5).trim();

        // Supporta separazione con virgole
        const parts = expr.split(/\s*,\s*/);
        const values = parts.map((p) => {
          return this.evaluate(p);
        });

        // Stampa concatenando senza aggiungere righe vuote extra
        outputFn(values.join(" "));
        break;
      }

      case "LET": {
        const match = code.match(/LET\s+(\w+)\s*=\s*(.+)/i);
        if (match) {
          const varName = match[1].toUpperCase();
          const value = this.evaluate(match[2]);
          this.variables[varName] = value;
        }
        break;
      }

      case "INPUT": {
        const match = code.match(/INPUT\s+(?:"([^"]+)";\s*)?(\w+)/i);
        if (match) {
          const prompt = match[1] || "";
          const varName = match[2].toUpperCase();
          const value = await inputFn(prompt);
          const num = parseFloat(value);
          this.variables[varName] = !isNaN(num) ? num : value;
        }
        break;
      }

      case "GOTO": {
        return parseInt(tokens[1]);
      }

      case "GOSUB": {
        this.returnStack.push(this.currentLine);
        return parseInt(tokens[1]);
      }

      case "RETURN": {
        if (this.returnStack.length === 0) {
          throw new Error("RETURN without GOSUB");
        }
        this.currentLine = this.returnStack.pop();
        break;
      }

      case "IF": {
        const match = code.match(/IF\s+(.+?)\s+THEN\s+(.+)/i);
        if (match) {
          const cond = this.evaluateCondition(match[1]);
          if (cond) {
            const thenPart = match[2].trim();
            if (/^\d+$/.test(thenPart)) {
              return parseInt(thenPart);
            } else {
              await this.executeLine(
                { num: line.num, code: thenPart },
                outputFn,
                inputFn,
              );
            }
          }
        }
        break;
      }

      case "FOR": {
        const match = code.match(
          /FOR\s+(\w+)\s*=\s*(.+?)\s+TO\s+(.+?)(?:\s+STEP\s+(.+))?$/i,
        );
        if (match) {
          const varName = match[1].toUpperCase();
          const start = this.evaluate(match[2]);
          const end = this.evaluate(match[3]);
          const step = match[4] ? this.evaluate(match[4]) : 1;

          this.variables[varName] = start;
          this.forLoops[varName] = {
            end,
            step,
            line: this.currentLine,
          };
        }
        break;
      }

      case "NEXT": {
        const varName = tokens[1].toUpperCase();
        const loop = this.forLoops[varName];
        if (loop) {
          this.variables[varName] += loop.step;
          const current = this.variables[varName];

          if (
            (loop.step > 0 && current <= loop.end) ||
            (loop.step < 0 && current >= loop.end)
          ) {
            this.currentLine = loop.line;
          }
        }
        break;
      }

      case "END": {
        return "END";
      }

      case "REM": {
        break;
      }

      default: {
        if (code.includes("=")) {
          const match = code.match(/(\w+)\s*=\s*(.+)/);
          if (match) {
            const varName = match[1].toUpperCase();
            const value = this.evaluate(match[2]);
            this.variables[varName] = value;
          }
        }
      }
    }
  }

  evaluate(expr) {
    expr = expr.trim();

    // stringa letterale
    if (/^".*"$/.test(expr)) return expr.slice(1, -1);

    // numero letterale
    if (!isNaN(expr)) return parseFloat(expr);

    // prova a valutare come espressione
    try {
      // sostituisci le variabili conosciute con il loro valore
      let evalExpr = expr.replace(/\b[A-Z]\w*\b/gi, (match) => {
        const varName = match.toUpperCase();
        const val = this.variables[varName];
        if (val === undefined) return 0;
        if (typeof val === "string") return `"${val}"`;
        return val;
      });

      const result = new Function(`return ${evalExpr}`)();
      return result;
    } catch {
      return 0;
    }
  }

  evaluateCondition(cond) {
    cond = cond.replace(/=/g, "==");

    for (const [name, val] of Object.entries(this.variables)) {
      const regex = new RegExp(`\\b${name}\\b`, "g");
      const valStr = typeof val === "string" ? `"${val}"` : val;
      cond = cond.replace(regex, valStr);
    }

    try {
      return new Function(`return ${cond}`)();
    } catch {
      return false;
    }
  }

  stop() {
    this.running = false;
  }
}

/**
 * Get Input from User (Terminal version)
 */
function getInput(prompt) {
  return new Promise((resolve) => {
    // Save terminal state
    state.waitingBasicInput = true;

    // Print prompt
    if (prompt) print(prompt);

    // Setup callback
    runnerInputCallback = (value) => {
      state.waitingBasicInput = false;
      runnerInputCallback = null;
      resolve(value);
    };
  });
}

/**
 * Handle input when BASIC is waiting
 */
export function handleBasicInput(value) {
  if (runnerInputCallback) {
    runnerInputCallback(value);
    return true;
  }
  return false;
}

/**
 * Run BASIC program from terminal
 */
export async function runBasicFile(filepath) {
  const fullPath = normalizePath(state.cwd, filepath);
  const node = getNode(fullPath);

  if (!node) {
    print(`run: '${filepath}': No such file`);
    print("");
    return;
  }

  if (node.type !== "txt") {
    print(`run: '${filepath}': Not a text file`);
    print("");
    return;
  }

  print(`Running ${filepath}...`);
  print("");

  // Load program
  const lines = node.content.split("\n");

  runnerInterpreter = new BasicInterpreter();
  runnerInterpreter.load(lines);

  // Run with output to terminal
  await runnerInterpreter.run((text) => print(text), getInput);

  print("");
  print("Program ended.");
  print("");
  updatePrompt();
  dom.input.style.display = "block";
  dom.input.focus();
  runnerInterpreter = null;
}

/**
 * Stop running program
 */
export function stopBasicProgram() {
  if (runnerInterpreter) {
    runnerInterpreter.stop();
    print("");
    print("[Program stopped]");
    print("");
  }
}

/**
 * Request a break (CTRL+C)
 */
export function requestBreak() {
  if (runnerInterpreter) {
    runnerInterpreter.breakRequested = true;
  }
}
