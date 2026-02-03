// src/login.js

import { state, saveUser } from "./state.js";
import { print, clearTerminal } from "./terminal.js";
import { updatePrompt } from "./prompt.js";

/* =========================
   LOGIN START
========================= */

export function startLogin() {
  clearTerminal();

  state.isLoggingIn = true;
  state.loginStep = 0;
  state.loginUser = null;

  print("Insert username:");
  print("");
}

/* =========================
   LOGIN HANDLER
========================= */

export function handleLogin(value) {
  // USERNAME
  if (state.loginStep === 0) {
    const user = state.fs.users.find((u) => u.username === value);

    if (!user) {
      print("User not found.");
      print("login: please enter your username.");
      return;
    }

    state.loginUser = user;
    state.loginStep = 1;

    clearTerminal();
    print("Insert password:");
    print("");
    return;
  }

  // PASSWORD
  if (state.loginStep === 1) {
    if (value !== state.loginUser.password) {
      print("Access Denied.");
      resetLogin();
      return;
    }

    state.currentUser = {
      username: state.loginUser.username,
      role: state.loginUser.role,
    };

    saveUser();

    clearTerminal();

    print(`Access Granted. Welcome, ${state.currentUser.username}!`);
    print("");

    resetLogin();
    updatePrompt();
  }
}

/* =========================
   RESET
========================= */

function resetLogin() {
  state.isLoggingIn = false;
  state.loginStep = 0;
  state.loginUser = null;
}

/* =========================
   LOGOUT
========================= */

export function cmdLogout() {
  state.currentUser = {
    username: "guest",
    role: "guest",
  };

  saveUser();

  clearTerminal();

  print("Logged out. Welcome guest.");
  print("");

  state.cwd = [];
  updatePrompt();
}
