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
    this.breakRequested = false;

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
        execPrint(expr, outputFn, this);
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

  evalPrintPart(expr) {
    expr = expr.trim();

    if (/^".*"$/.test(expr)) return expr.slice(1, -1);

    if (/^[A-Z]\w*$/i.test(expr)) {
      const v = this.variables[expr.toUpperCase()];
      return v ?? "";
    }

    if (expr.includes('"')) {
      return expr.replace(/"([^"]*)"|([A-Z]\w*)/gi, (_, str, v) => {
        if (str !== undefined) return str;
        const val = this.variables[v.toUpperCase()];
        return val ?? "";
      });
    }

    return this.evaluate(expr);
  }

  stop() {
    this.running = false;
  }
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

  //print(`Running ${filepath}...`);
  print("");

  // Disabilita l'input mentre il programma gira
  dom.input.disabled = true;
  dom.input.style.opacity = "0.5";

  // Load program
  const lines = node.content.split("\n");

  runnerInterpreter = new BasicInterpreter();
  runnerInterpreter.load(lines);

  // Run with output to terminal
  await runnerInterpreter.run((text) => print(text), getInput);

  print("");
  //print("Program ended.");
  //print("");

  // Riabilita l'input quando il programma finisce
  dom.input.disabled = false;
  dom.input.style.opacity = "1";
  dom.input.focus();

  updatePrompt();
  runnerInterpreter = null;
}

/**
 * Get Input from User (Terminal version)
 */
function getInput(prompt) {
  return new Promise((resolve) => {
    // Print prompt
    if (prompt) print(prompt);

    // Riabilita l'input per INPUT statement
    dom.input.disabled = false;
    dom.input.style.opacity = "1";

    // Focus sull'input dopo un breve delay
    setTimeout(() => {
      dom.input.focus();
    }, 50);

    // Save terminal state
    state.waitingBasicInput = true;

    // Setup callback
    runnerInputCallback = (value) => {
      state.waitingBasicInput = false;
      runnerInputCallback = null;

      // Disabilita di nuovo l'input dopo aver ricevuto il valore
      dom.input.disabled = true;
      dom.input.style.opacity = "0.5";

      resolve(value);
    };
  });
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

    // Riabilita l'input
    dom.input.disabled = false;
    dom.input.style.opacity = "1";
    dom.input.focus();
  }
}

/**
 * Request a break (CTRL+C)
 */
export function requestBreak() {
  if (runnerInterpreter) {
    runnerInterpreter.breakRequested = true;

    // Riabilita l'input dopo il break
    setTimeout(() => {
      dom.input.disabled = false;
      dom.input.style.opacity = "1";
      dom.input.focus();
    }, 100);
  }
}

function execPrint(str, outputFn, interpreter) {
  const parts = parsePrintArgs(str);
  let out = "";
  let lastSep = null;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    let val = evalPrintPart(part.value, interpreter);

    // aggiunge spazio solo se separatore è ','
    if (i > 0) {
      if (lastSep === ",") out += " ";
      // se lastSep === ';' o null → niente spazio
    }

    out += val;
    lastSep = part.sep;
  }

  outputFn(out);
}

function parsePrintArgs(str) {
  const tokens = [];
  let current = "";
  let inString = false;

  for (let c of str) {
    if (c === '"') inString = !inString;

    if (!inString && (c === "," || c === ";")) {
      tokens.push({ value: current.trim(), sep: c });
      current = "";
    } else {
      current += c;
    }
  }

  if (current.trim()) tokens.push({ value: current.trim(), sep: null });

  return tokens;
}

function evalPrintPart(expr, interpreter) {
  expr = expr.trim();

  // stringa letterale
  if (/^".*"$/.test(expr)) return expr.slice(1, -1);

  // variabile semplice
  if (/^[A-Z]\w*$/i.test(expr)) {
    return interpreter.variables[expr.toUpperCase()] ?? "";
  }

  // espressione con stringhe e variabili (es: "Ciao " A)
  return expr.replace(/"([^"]*)"|([A-Z]\w*)/gi, (_, str, v) => {
    if (str !== undefined) return str;
    if (v !== undefined) return interpreter.variables[v.toUpperCase()] ?? "";
    return "";
  });
}
