// src/login.js

import { state, saveUser } from "./state.js";
import { print, clearTerminal } from "./terminal.js";
import { updatePrompt } from "./prompt.js";
import { dom } from "./dom.js";

/* =========================
   LOGIN START
========================= */

// export function startLogin() {
//   clearTerminal();

//   state.isLoggingIn = true;
//   state.loginStep = 0;
//   state.loginUser = null;
//   state.passwordBuffer = "";

//   updatePrompt();

//   print("Insert username:");
//   print("");
// }

/* =========================
   LOGIN HANDLER
========================= */

// export function handleLogin(value) {
//   // USERNAME
//   if (state.loginStep === 0) {
//     const user = state.fs.users.find((u) => u.username === value);

//     if (!user) {
//       print("User not found.");
//       print("");
//       resetLogin();
//       updatePrompt();
//       return;
//     }

//     state.loginUser = user;
//     state.loginStep = 1;

//     clearTerminal();
//     print("Insert password:");
//     print("");
//     return;
//   }

//   // PASSWORD
//   if (state.loginStep === 1) {
//     if (state.passwordBuffer !== state.loginUser.password) {
//       print("Access Denied.");
//       print("");
//       resetLogin();
//       updatePrompt();
//       return;
//     }

//     state.currentUser = {
//       username: state.loginUser.username,
//       role: state.loginUser.role,
//     };

//     saveUser();

//     clearTerminal();

//     print(`Access Granted. Welcome, ${state.currentUser.username}!`);
//     print("");

//     resetLogin();
//     updatePrompt();
//   }
// }

// /* =========================
//    RESET
// ========================= */

// function resetLogin() {
//   state.isLoggingIn = false;
//   state.loginStep = 0;
//   state.loginUser = null;
//   dom.input.type = "text";
// }

/* =========================
   LOGOUT
========================= */

// export function cmdLogout(silently = false) {
//   state.currentUser = {
//     username: "guest",
//     role: "guest",
//   };

//   saveUser();

//   clearTerminal();

//   if (!silently) {
//     print("Logged out. Welcome guest.");
//     print("");
//   }

//   state.cwd = [];
//   updatePrompt();
// }
