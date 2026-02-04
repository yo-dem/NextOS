// src/state.js

export const state = {
  currentUser: localStorage.getItem("currentUser")
    ? JSON.parse(localStorage.getItem("currentUser"))
    : { username: "guest", role: "guest" },

  isLoggingIn: false,
  loginStep: 0,
  loginUser: null,
  passwordBuffer: "",

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
    return saved || "classic";
  } catch (e) {
    return "classic";
  }
}
