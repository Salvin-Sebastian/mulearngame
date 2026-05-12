import * as firebaseAppModule from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js";
import "https://www.gstatic.com/firebasejs/10.8.0/firebase-database-compat.js";

const firebase = window.firebase || firebaseAppModule.default || firebaseAppModule;

// ============================================================
//  CYBER HEIST — Firebase Configuration
// ============================================================
export const FIREBASE_CONFIG = {
    apiKey: "AIzaSyBTpBsj1Do6GzPYqZBblxOwoewXms86wUo",
    authDomain: "cyber-heist-game.firebaseapp.com",
    databaseURL: "https://cyber-heist-game-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "cyber-heist-game",
    storageBucket: "cyber-heist-game.firebasestorage.app",
    messagingSenderId: "357535498395",
    appId: "1:357535498395:web:ea3c3fdd1471547772c63e"
};

// Detect if config has been filled in
export const FIREBASE_READY = !FIREBASE_CONFIG.apiKey.startsWith("PASTE") && !FIREBASE_CONFIG.apiKey.startsWith("AIzaSyDEMO");

// Initialize Firebase
let app = null;
let db = null;

if (FIREBASE_READY) {
    try {
        app = firebase.initializeApp(FIREBASE_CONFIG);
        db = firebase.database();
        console.log("[CyberHeist] Firebase connected ✅");
    } catch (e) {
        console.error("[CyberHeist] Firebase init failed:", e);
    }
} else {
    console.warn("[CyberHeist] Firebase not configured — using local mode (single device only).");
}

export { app, db };
