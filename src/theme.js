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
      header: "#afc2bb",
      footer: "#00aa66",
      dir: "#00ff88be",
      lnk: "#00ff88be",
      txt: "#00ff88be",
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
      dir: "#ffb000",
      lnk: "#ffb000",
      txt: "#ffb000",
    },
  },
  apple2: {
    name: "Apple II",
    colors: {
      bg: "#000000",
      text: "#00ff00",
      prompt: "#00ff00",
      caret: "#00ff00",
      header: "#33ff33",
      footer: "#00cc00",
      dir: "#00ff00",
      lnk: "#00ff00",
      txt: "#00ff00",
    },
  },
  ibm: {
    name: "IBM DOS",
    colors: {
      bg: "#000000",
      text: "#aaaaaa",
      prompt: "#55ffff",
      caret: "#aaaaaae0",
      header: "#ffffff",
      footer: "#888888",
      dir: "#aaaaaa",
      lnk: "#aaaaaa",
      txt: "#aaaaaa",
    },
  },
  vt100: {
    name: "VT100 Amber",
    colors: {
      bg: "#1e1410",
      text: "#ffa600",
      prompt: "#ffcc00",
      caret: "#ffa600dd",
      header: "#ffbb44",
      footer: "#cc8800",
      dir: "#ffa600",
      lnk: "#ffa600",
      txt: "#ffa600",
    },
  },
  monochrome: {
    name: "Monochrome White",
    colors: {
      bg: "#1a1a1a",
      text: "#e0e0e0",
      prompt: "#ffffff",
      caret: "#e0e0e0dd",
      header: "#f5f5f5",
      footer: "#c0c0c0",
      dir: "#e0e0e0",
      lnk: "#e0e0e0",
      txt: "#e0e0e0",
    },
  },
  zenburn: {
    name: "Zenburn",
    colors: {
      bg: "#3f3f3f",
      text: "#dcdccc",
      prompt: "#7f9f7f",
      caret: "#dcdcccdd",
      header: "#8cd0d3",
      footer: "#5f7f5f",
      dir: "#dcdccc",
      lnk: "#dcdccc",
      txt: "#dcdccc",
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
  atari: {
    name: "Atari ST",
    colors: {
      bg: "#222222",
      text: "#00ff00",
      prompt: "#ffff00",
      caret: "#00ff00dd",
      header: "#ffffff",
      footer: "#00cc00",
      dir: "#00ff00",
      lnk: "#00ff00",
      txt: "#00ff00",
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
      dir: "#ffffff",
      lnk: "#ffffff",
      txt: "#ffffff",
    },
  },
  ocean: {
    name: "Ocean Blue",
    colors: {
      bg: "#001b2e",
      text: "#7dd3fc",
      prompt: "#38bdf8",
      caret: "#7dd3fcdd",
      header: "#bae6fd",
      footer: "#0284c7",
      dir: "#7dd3fc",
      lnk: "#7dd3fc",
      txt: "#7dd3fc",
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
    const currentTheme = localStorage.getItem("terminal_theme") || "classic";

    print("");
    print("Current theme: " + themes[currentTheme].name);
    print("");

    // Organizza per categorie
    const categories = {
      "Classic Terminals": ["classic", "amber", "monochrome", "ibm"],
      "Retro Computers": ["atari", "terminal", "apple2", "vt100"],
      "Modern Themes": ["dracula", "zenburn", "ocean"],
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
