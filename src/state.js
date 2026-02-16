// src/state.js

export const VERSION_NUMBER = "v1.1.7";
export const VERSION =
  "NextOS Terminal [" + VERSION_NUMBER + "] NextBasic 0.7.1 - 1984-2026 -";

export const state = {
  currentUser: localStorage.getItem("currentUser")
    ? JSON.parse(localStorage.getItem("currentUser"))
    : { username: "guest", role: "guest" },

  isLoggingIn: false,
  loginStep: 0,
  loginUser: null,
  passwordBuffer: "",
  editorActive: false,

  history: [],
  historyIndex: -1,

  fs: null,
  cwd: [],
};

export function saveUser() {
  localStorage.setItem("currentUser", JSON.stringify(state.currentUser));
}

export function loadTheme() {
  try {
    const saved = localStorage.getItem("terminal_theme");
    return saved || "dracula";
  } catch (e) {
    return "dracula";
  }
}
