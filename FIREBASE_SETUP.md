# 🔥 Firebase Setup — Cross-Device Multiplayer

Follow these steps **one time** to enable real multiplayer across different devices.
It takes about 5 minutes and it's completely free.

---

## Step 1 — Create a Firebase Project

1. Go to **https://console.firebase.google.com/**
2. Click **"Add project"**
3. Name it anything (e.g. `cyberheist-game`) → Continue → Create Project

---

## Step 2 — Enable Realtime Database

1. In the left sidebar → **Build → Realtime Database**
2. Click **"Create Database"**
3. Choose a region (any) → Next
4. Select **"Start in test mode"** → Enable

---

## Step 3 — Get Your Config

1. Click the ⚙️ gear icon (top left) → **Project Settings**
2. Scroll down to **"Your apps"** section
3. Click **`</>`** (Web) icon
4. Register app (give it a nickname) → Continue
5. You'll see a `firebaseConfig` object — copy it

---

## Step 4 — Paste Into the Game

Open `js/lobby.js` and find this block near the top:

```js
const FIREBASE_CONFIG = {
  apiKey:            "PASTE_YOUR_apiKey_HERE",
  authDomain:        "PASTE_YOUR_authDomain_HERE",
  databaseURL:       "PASTE_YOUR_databaseURL_HERE",
  ...
```

Replace each `"PASTE_YOUR_..._HERE"` with your real values.

> **Important:** Make sure `databaseURL` is filled in — it's the one that looks like
> `https://your-project-default-rtdb.firebaseio.com`

---

## Step 5 — Push to GitHub Pages

```bash
git init
git add .
git commit -m "Cyber Heist: Team Breach"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

GitHub → **Settings → Pages → Deploy from `main` branch → Save**

Your game will be live at `https://YOUR_USERNAME.github.io/YOUR_REPO/`

---

## ✅ How to Play (cross-device)

1. Open the GitHub Pages link on **any device**
2. One player: **CREATE ROOM** → share the 4-letter code
3. Others: open same URL → **JOIN ROOM** → enter code → pick role
4. Host clicks **LAUNCH HEIST**

> Navbar shows **ONLINE** 🟢 when Firebase is connected, **LOCAL ONLY** 🟡 if not configured.
