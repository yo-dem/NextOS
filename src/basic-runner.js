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
      } else if (trimmed && !/^\d+$/.test(trimmed)) {
        // Riga senza numero di linea valido (ignorando linee che sono solo numeri)
        throw new Error(
          `Invalid line format: "${trimmed}" - lines must start with a line number`,
        );
      }
    }

    // Verifica duplicati
    const lineNumbers = this.program.map((l) => l.num);
    const duplicates = lineNumbers.filter(
      (num, idx) => lineNumbers.indexOf(num) !== idx,
    );
    if (duplicates.length > 0) {
      throw new Error(
        `Duplicate line number(s): ${[...new Set(duplicates)].join(", ")}`,
      );
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
          } else {
            throw new Error(`GOTO/GOSUB target line ${result} does not exist`);
          }
        }

        this.currentLine++;
      } catch (err) {
        outputFn(`Error at line ${line.num}: ${err.message}`);
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
        if (!expr) {
          outputFn(""); // PRINT senza argomenti stampa riga vuota
        } else {
          execPrint(expr, outputFn, this);
        }
        break;
      }

      case "LET": {
        const match = code.match(/LET\s+(\w+)\s*=\s*(.+)/i);
        if (!match) {
          throw new Error(`Invalid LET syntax. Use: LET variable = expression`);
        }
        const varName = match[1].toUpperCase();
        if (!/^[A-Z][A-Z0-9]*$/i.test(varName)) {
          throw new Error(
            `Invalid variable name "${varName}". Variables must start with a letter`,
          );
        }
        const value = this.evaluate(match[2]);
        this.variables[varName] = value;
        break;
      }

      case "INPUT": {
        const match = code.match(/INPUT\s+(?:"([^"]+)";\s*)?(\w+)/i);
        if (!match) {
          throw new Error(
            `Invalid INPUT syntax. Use: INPUT variable or INPUT "prompt"; variable`,
          );
        }
        const prompt = match[1] || "";
        const varName = match[2].toUpperCase();
        if (!/^[A-Z][A-Z0-9]*$/i.test(varName)) {
          throw new Error(
            `Invalid variable name "${varName}". Variables must start with a letter`,
          );
        }
        const value = (await inputFn(prompt)).trim(); // TRIM whitespace!
        const num = parseFloat(value);
        this.variables[varName] = !isNaN(num) ? num : value;
        break;
      }

      case "GOTO": {
        if (!tokens[1] || !/^\d+$/.test(tokens[1])) {
          throw new Error(`Invalid GOTO syntax. Use: GOTO line_number`);
        }
        return parseInt(tokens[1]);
      }

      case "GOSUB": {
        if (!tokens[1] || !/^\d+$/.test(tokens[1])) {
          throw new Error(`Invalid GOSUB syntax. Use: GOSUB line_number`);
        }
        // Salva l'indice SUCCESSIVO (quello a cui torneremo dopo RETURN)
        this.returnStack.push(this.currentLine + 1);
        return parseInt(tokens[1]);
      }

      case "RETURN": {
        if (this.returnStack.length === 0) {
          throw new Error("RETURN without GOSUB");
        }
        // Ripristina l'indice e decrementa perché il loop principale incrementerà
        this.currentLine = this.returnStack.pop() - 1;
        break;
      }

      case "IF": {
        const match = code.match(/IF\s+(.+?)\s+THEN\s+(.+)/i);
        if (!match) {
          throw new Error(
            `Invalid IF syntax. Use: IF condition THEN statement`,
          );
        }
        console.log("IF statement - condition part:", match[1]);
        console.log("IF statement - then part:", match[2]);
        const cond = this.evaluateCondition(match[1]);
        console.log("IF condition result:", cond);
        if (cond) {
          const thenPart = match[2].trim();
          console.log("Executing THEN part:", thenPart);

          // Check if it's just a line number
          if (/^\d+$/.test(thenPart)) {
            console.log(
              "THEN part is line number, returning:",
              parseInt(thenPart),
            );
            return parseInt(thenPart);
          }

          // Check if it's GOTO <number>
          const gotoMatch = thenPart.match(/^GOTO\s+(\d+)$/i);
          if (gotoMatch) {
            console.log(
              "THEN part is GOTO, returning:",
              parseInt(gotoMatch[1]),
            );
            return parseInt(gotoMatch[1]);
          }

          // Otherwise execute as statement
          console.log("THEN part is statement, executing");
          await this.executeLine(
            { num: line.num, code: thenPart },
            outputFn,
            inputFn,
          );
        } else {
          console.log("IF condition was false, skipping THEN part");
        }
        break;
      }

      case "FOR": {
        const match = code.match(
          /FOR\s+(\w+)\s*=\s*(.+?)\s+TO\s+(.+?)(?:\s+STEP\s+(.+))?$/i,
        );
        if (!match) {
          throw new Error(
            `Invalid FOR syntax. Use: FOR variable = start TO end [STEP increment]`,
          );
        }
        const varName = match[1].toUpperCase();
        if (!/^[A-Z][A-Z0-9]*$/i.test(varName)) {
          throw new Error(
            `Invalid variable name "${varName}". Variables must start with a letter`,
          );
        }
        const start = this.evaluate(match[2]);
        const end = this.evaluate(match[3]);
        const step = match[4] ? this.evaluate(match[4]) : 1;

        if (
          typeof start !== "number" ||
          typeof end !== "number" ||
          typeof step !== "number"
        ) {
          throw new Error(`FOR loop requires numeric values`);
        }

        if (step === 0) {
          throw new Error(`FOR loop STEP cannot be zero`);
        }

        this.variables[varName] = start;
        this.forLoops[varName] = {
          end,
          step,
          line: this.currentLine,
        };
        break;
      }

      case "NEXT": {
        if (!tokens[1]) {
          throw new Error(`Invalid NEXT syntax. Use: NEXT variable`);
        }
        const varName = tokens[1].toUpperCase();
        const loop = this.forLoops[varName];
        if (!loop) {
          throw new Error(`NEXT ${varName} without matching FOR`);
        }
        this.variables[varName] += loop.step;
        const current = this.variables[varName];

        if (
          (loop.step > 0 && current <= loop.end) ||
          (loop.step < 0 && current >= loop.end)
        ) {
          this.currentLine = loop.line;
        } else {
          // Pulisce il loop quando finisce
          delete this.forLoops[varName];
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
        // Assegnamento implicito (senza LET)
        if (code.includes("=")) {
          const match = code.match(/(\w+)\s*=\s*(.+)/);
          if (match) {
            const varName = match[1].toUpperCase();
            if (!/^[A-Z][A-Z0-9]*$/i.test(varName)) {
              throw new Error(
                `Invalid variable name "${varName}". Variables must start with a letter`,
              );
            }
            const value = this.evaluate(match[2]);
            this.variables[varName] = value;
          } else {
            throw new Error(`Invalid assignment syntax`);
          }
        } else {
          throw new Error(
            `Unknown command: ${cmd}. Valid commands: PRINT, LET, INPUT, GOTO, GOSUB, RETURN, IF, FOR, NEXT, END, REM`,
          );
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
      // sostituisci RND con Math.random()
      let evalExpr = expr.replace(/\bRND\b/gi, "Math.random()");

      evalExpr = evalExpr.replace(/\bINT\s*\(([^)]+)\)/gi, "Math.floor($1)");

      // sostituisci le variabili conosciute con il loro valore
      // BUG FIX: usa evalExpr invece di expr!
      // BUG FIX: escludi 'Math' e 'random' dalla sostituzione delle variabili
      evalExpr = evalExpr.replace(/\b[A-Z]\w*\b/gi, (match) => {
        const upper = match.toUpperCase();
        // Non sostituire 'Math' o 'random' - sono parte di JavaScript
        if (upper === "MATH" || upper === "RANDOM" || upper === "FLOOR") {
          return match;
        }

        const val = this.variables[upper];
        if (val === undefined) {
          throw new Error(`Undefined variable: ${upper}`);
        }
        if (typeof val === "string") return `"${val}"`;
        return val;
      });

      // Pass Math object to the function context
      const result = new Function("Math", `return ${evalExpr}`)(Math);
      return result;
    } catch (err) {
      if (err.message.includes("Undefined variable")) {
        throw err;
      }
      throw new Error(`Cannot evaluate expression: ${expr}`);
    }
  }

  evaluateCondition(cond) {
    console.log("=== EVALUATING CONDITION ===");
    console.log("Original condition:", JSON.stringify(cond));

    cond = cond.trim();
    console.log("After trim:", JSON.stringify(cond));

    // Rimuovi parentesi esterne se presenti
    if (cond.startsWith("(") && cond.endsWith(")")) {
      cond = cond.slice(1, -1).trim();
      console.log("After removing parentheses:", JSON.stringify(cond));
    }

    console.log("Variables:", this.variables);

    // Prima sostituisci le variabili con i loro valori (CASE-INSENSITIVE)
    for (const [name, val] of Object.entries(this.variables)) {
      const regex = new RegExp(`\\b${name}\\b`, "gi"); // Added 'i' flag for case-insensitive
      const valStr = typeof val === "string" ? `"${val}"` : val;
      console.log(`Replacing ${name} with ${valStr} (type: ${typeof val})`);
      cond = cond.replace(regex, valStr);
      console.log("After replacement:", JSON.stringify(cond));
    }

    // Sostituisci operatori logici BASIC con JavaScript
    cond = cond.replace(/\bAND\b/gi, "&&");
    cond = cond.replace(/\bOR\b/gi, "||");
    cond = cond.replace(/\bNOT\b/gi, "!");
    console.log("After logical operators:", JSON.stringify(cond));

    // Poi sostituisci = con === SOLO fuori dalle stringhe
    let result = "";
    let inString = false;
    let i = 0;

    while (i < cond.length) {
      const char = cond[i];

      if (char === '"') {
        inString = !inString;
        result += char;
        i++;
      } else if (
        !inString &&
        char === "=" &&
        cond[i - 1] !== "<" &&
        cond[i - 1] !== ">" &&
        cond[i - 1] !== "!" &&
        cond[i + 1] !== "="
      ) {
        result += "===";
        i++;
      } else {
        result += char;
        i++;
      }
    }

    console.log("Final JS code:", JSON.stringify(result));

    try {
      const evalResult = new Function(`return ${result}`)();
      console.log(
        "Evaluation result:",
        evalResult,
        "(type:",
        typeof evalResult,
        ")",
      );
      console.log("=== END CONDITION ===\n");
      return evalResult;
    } catch (err) {
      console.error("Evaluation error:", err);
      throw new Error(
        `Cannot evaluate condition: ${cond} (evaluated as: ${result})`,
      );
    }
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

  print("");

  // Disabilita l'input mentre il programma gira
  dom.input.disabled = true;
  dom.input.style.opacity = "0.5";

  try {
    // Load program
    const lines = node.content.split("\n");

    runnerInterpreter = new BasicInterpreter();
    runnerInterpreter.load(lines);

    // Run with output to terminal
    await runnerInterpreter.run((text) => print(text), getInput);

    print("");
  } catch (err) {
    print(`Program error: ${err.message}`);
    print("");
  } finally {
    // Riabilita l'input quando il programma finisce
    dom.input.disabled = false;
    dom.input.style.opacity = "1";
    dom.input.focus();

    updatePrompt();
    runnerInterpreter = null;
  }
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
      if (current.trim()) {
        tokens.push({ value: current.trim(), sep: c });
      }
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

  // stringa letterale pura
  if (/^".*"$/.test(expr)) return expr.slice(1, -1);

  // RND speciale - gestiscilo subito
  if (/^\s*RND\s*$/i.test(expr)) {
    return Math.random();
  }

  // variabile semplice (senza operatori)
  if (/^[A-Z]\w*$/i.test(expr)) {
    const val = interpreter.variables[expr.toUpperCase()];
    return val !== undefined ? val : "";
  }

  // Se contiene stringhe letterali, gestisci come concatenazione
  if (expr.includes('"')) {
    return expr.replace(/"([^"]*)"|([A-Z]\w*)/gi, (_, str, v) => {
      if (str !== undefined) return str;
      if (v !== undefined) {
        const val = interpreter.variables[v.toUpperCase()];
        return val !== undefined ? val : "";
      }
      return "";
    });
  }

  // Altrimenti è un'espressione matematica (A * B, tab * i, ecc.)
  // BUG FIX: supporta anche RND nelle espressioni PRINT
  try {
    let evalExpr = expr.replace(/\bRND\b/gi, "Math.random()");
    evalExpr = evalExpr.replace(/\b[A-Z]\w*\b/gi, (match) => {
      const upper = match.toUpperCase();
      // Non sostituire 'Math' o 'random' - sono parte di JavaScript
      if (upper === "MATH" || upper === "RANDOM") return match;

      const val = interpreter.variables[upper];
      if (val === undefined) return 0;
      return val;
    });

    // Pass Math object to the function context
    const result = new Function("Math", `return ${evalExpr}`)(Math);
    return result;
  } catch {
    return expr; // Fallback: restituisce l'espressione originale
  }
}
