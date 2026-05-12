# 🎮 Cyber Heist: Team Breach

A real-time multiplayer hacking team game. 3–4 players take on unique roles to breach a simulated secure system across 4 timed missions.

## 🚀 Quick Start

### 1. Set Up Firebase (Required for Multiplayer)

1. Go to [Firebase Console](https://console.firebase.google.com/) → **Add project**
2. Enable **Realtime Database** (Start in test mode for development)
3. Go to **Project Settings** → **Your apps** → **Add app** → Web
4. Copy your config and replace the values in `js/firebase-config.js`:

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 2. Run the Game

**Local (with a simple server):**
```bash
cd "red team medium"
npx serve .
# Open http://localhost:3000
```

**GitHub Pages:**
1. Push to GitHub repo
2. Settings → Pages → Deploy from `main` branch

---

## 🎭 Roles & Gameplay

| Role | Icon | Responsibility |
|------|------|----------------|
| **Recon** | 🔭 | Gather intel, report open ports/hashes |
| **Cryptographer** | 🔐 | Decode Base64/Hex, crack password hashes |
| **Exploiter** | ⚔️ | Choose attack methods, submit payloads |
| **Defender** | 🛡️ | Manage IDS/WAF detection, deploy decoys |

**Key rule**: Each player sees only *partial* clues — you MUST communicate via the intel chat (or voice) to solve each mission!

---

## 🧩 Missions

| # | Name | Concept |
|---|------|---------|
| 1 | Shadow Vault | Password hash cracking (SHA-1) |
| 2 | Dead Drop | Multi-channel encoded message (Base64 + Hex + ROT13 + Binary) |
| 3 | Database Breach | SQL injection payload assembly |
| 4 | Final Breach | Port scan + CVE identification + exploit selection |

---

## 🏆 Scoring

- **Base points** per mission (300–450)
- **Time bonus**: +2 pts per second remaining when solved
- **Penalty**: -50 pts for wrong answers
- **Defender bonus**: 30% of mission points for successful defensive actions
- **Win threshold**: 500+ team points = Heist Complete!

---

## 📁 File Structure

```
red team medium/
├── index.html          # Landing page, create/join room, lobby
├── game.html           # Main game screen
├── css/
│   └── style.css       # Full styling (dark terminal theme)
└── js/
    ├── firebase-config.js   # Firebase config (EDIT THIS)
    ├── lobby.js             # Room management, Firebase sync
    ├── puzzles.js           # All 4 puzzle definitions
    └── game.js              # Game engine, timer, scoring
```

---

## ⚠️ Firebase Security Rules (Production)

For a public deployment, update Realtime Database rules:

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

> For full security, add Firebase Authentication and restrict writes to authenticated users.
