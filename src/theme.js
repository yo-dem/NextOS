// src/theme.js

import { print } from "./terminal.js";

export const themes = {
  classic: {
    name: "Classic Green",
    colors: {
      bg: "#0f0f0f",
      text: "#00ff88be",
      prompt: "#3cff01",
      caret: "#00ff8894",
      header: "#91c7b3",
      footer: "#00aa66",
      dir: "#00ff88",
      lnk: "#bbff00bd",
      txt: "#c1ffe2",
    },
  },
  amber: {
    name: "Amber",
    colors: {
      bg: "#1a0f00",
      text: "#ffb000",
      prompt: "#ffd700",
      caret: "#ffb000cc",
      header: "#d4a574",
      footer: "#cc8800",
      dir: "#ffd885",
      lnk: "#ffb000",
      txt: "#fce1a7",
    },
  },
  dracula: {
    name: "Dracula",
    colors: {
      bg: "#282a36",
      text: "#f6f2f8",
      prompt: "#50fa7b",
      caret: "#f8f8f265",
      header: "#ffae89",
      footer: "#6272a4",
      dir: "#fcfcb2",
      lnk: "#a0f2f8",
      txt: "#ffffff",
    },
  },
  terminal: {
    name: "Ubuntu Terminal",
    colors: {
      bg: "#300a24",
      text: "#ffffff",
      prompt: "#00ff00",
      caret: "#ffffffdd",
      header: "#eeeeee",
      footer: "#aaaaaa",
      dir: "#fcfcb2",
      lnk: "#a0f2f8",
      txt: "#ffffff",
    },
  },
};

export function applyTheme(themeName) {
  const theme = themes[themeName];
  if (!theme) {
    return false;
  }

  const root = document.documentElement;
  root.style.setProperty("--bg-color", theme.colors.bg);
  root.style.setProperty("--text-color", theme.colors.text);
  root.style.setProperty("--prompt-color", theme.colors.prompt);
  root.style.setProperty("--caret-color", theme.colors.caret);
  root.style.setProperty("--header-color", theme.colors.header);
  root.style.setProperty("--dir-color", theme.colors.dir);
  root.style.setProperty("--lnk-color", theme.colors.lnk);
  root.style.setProperty("--txt-color", theme.colors.txt);
  root.style.setProperty("--footer-color", theme.colors.footer);

  return true;
}

export function getAvailableThemes() {
  return Object.keys(themes).map((key) => ({
    id: key,
    name: themes[key].name,
  }));
}

export function cmdTheme(args) {
  // Nessun argomento: mostra info sui temi
  if (!args || args.length === 0) {
    const currentTheme = localStorage.getItem("terminal_theme") || "dracula";

    print("");
    print("Current theme: " + themes[currentTheme].name);
    print("");

    // Organizza per categorie
    const categories = {
      "Classic Terminals": ["classic", "amber"],
      "Retro Computers": ["terminal"],
      "Modern Themes": ["dracula"],
    };

    Object.entries(categories).forEach(([category, themeIds]) => {
      print(category + ":");
      themeIds.forEach((id) => {
        if (themes[id]) {
          print("  " + id.padEnd(12) + " - " + themes[id].name);
        }
      });
      print("");
    });

    print("Usage: theme <name>");
    print("");
    return;
  }

  // Cambia tema
  const themeName = args[0].toLowerCase();

  if (applyTheme(themeName)) {
    try {
      localStorage.setItem("terminal_theme", themeName);
      print("");
      print(`Theme changed to: ${themes[themeName].name}`);
      print("");
    } catch (e) {
      console.warn("Could not save theme");
      print("");
      print("Theme applied but could not be saved.");
      print("");
    }
  } else {
    print("");
    print(`Theme '${themeName}' not found.`);
    print("Use 'theme' to see available themes.");
    print("");
  }
}
