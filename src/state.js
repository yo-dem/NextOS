// src/state.js

export const state = {
  currentUser: localStorage.getItem("currentUser")
    ? JSON.parse(localStorage.getItem("currentUser"))
    : { username: "guest", role: "guest" },

  isLoggingIn: false,
  loginStep: 0,
  loginUser: null,

  history: [],
  historyIndex: -1,

  fs: null,
  cwd: [],
};

export function saveUser() {
  localStorage.setItem("currentUser", JSON.stringify(state.currentUser));
}
