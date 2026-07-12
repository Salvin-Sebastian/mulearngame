/**
 * OPERATION SHADOW GRID — Firebase Realtime Database Backend
 * Full cross-device multiplayer & local fallback synchronization.
 */

import { FIREBASE_READY, db } from "./firebase-config.js";

// ── Role Definitions ────────────────────────────────────────────
const ROLES = {
    recon: { name: "RECON", icon: "🔭", desc: "Scouting & hidden paths" },
    cryptographer: { name: "CRYPTOGRAPHER", icon: "🔐", desc: "Logic-based cyber puzzles" },
    exploiter: { name: "EXPLOITER", icon: "⚔️", desc: "Vulnerabilities & breach" },
    defender: { name: "DEFENDER", icon: "🛡️", desc: "Protection & server defense" }
};

let currentRoom = null;
let currentPlayer = null;

// ── Utility ──────────────────────────────────────────────────────
function genRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
function genPlayerId() {
    return 'p_' + Math.random().toString(36).substr(2, 9);
}
function roomRef(code) { return db.ref(`rooms/${code}`); }

// ─────────────────────────────────────────────────────────────────
//  LOCAL FALLBACK (single device, BroadcastChannel)
// ─────────────────────────────────────────────────────────────────
let _bc = null;
let _localCallbacks = {};

function _localRoomKey(code) { return `ch_room_${code}`; }
function _readLocal(code) { try { return JSON.parse(localStorage.getItem(_localRoomKey(code))); } catch { return null; } }
function _writeLocal(code, data) { localStorage.setItem(_localRoomKey(code), JSON.stringify(data)); }

function _localBroadcast(type, code) {
    try { _bc && _bc.postMessage({ type, roomCode: code }); } catch { }
    _fireCbs(type, code);
}
function _fireCbs(type, code) {
    (_localCallbacks[type] || []).forEach(fn => { try { fn(_readLocal(code)); } catch { } });
}
function _onLocal(type, fn) {
    if (!_localCallbacks[type]) _localCallbacks[type] = [];
    _localCallbacks[type].push(fn);
}
function _setupBC(code) {
    if (_bc) { try { _bc.close(); } catch { } }
    _bc = new BroadcastChannel('ch_' + code);
    _bc.onmessage = e => { if (e.data?.roomCode === code) _fireCbs(e.data.type, code); };
    window.addEventListener('storage', e => {
        if (e.key === _localRoomKey(code))
            ['players_update', 'game_state', 'chat_update', 'mission_change'].forEach(t => _fireCbs(t, code));
    });
}

// ─────────────────────────────────────────────────────────────────
//  PUBLIC API
// ─────────────────────────────────────────────────────────────────

async function createRoom(username, role) {
    const roomCode = genRoomCode();
    const playerId = genPlayerId();
    const now = Date.now();

    const roomData = {
        host: playerId,
        createdAt: now,
        gameState: 'lobby',
        currentMission: 0,
        missionStartAt: now,
        teamBonuses: {
            smallTasks: false,
            mediumTasks: false,
            missionSuccess: false,
            perfectMission: true, // Remains true unless an alarm/failure occurs
            timeBonus: 0
        },
        players: {
            [playerId]: { username, role, score: 0, joined: now, solved: {}, tasksCompleted: {} }
        }
    };

    if (FIREBASE_READY && db) {
        await roomRef(roomCode).set(roomData);
    } else {
        _writeLocal(roomCode, { ...roomData, chat: [] });
        _setupBC(roomCode);
    }

    currentRoom = roomCode;
    currentPlayer = { id: playerId, username, role, isHost: true };
    _saveSession();
    return roomCode;
}

async function joinRoom(roomCode, username, role) {
    if (FIREBASE_READY && db) {
        const snap = await roomRef(roomCode).once('value');
        if (!snap.exists()) throw new Error('Room not found. Check the code!');
        const data = snap.val();
        if (data.gameState !== 'lobby') throw new Error('Game already in progress.');

        const taken = Object.values(data.players || {}).map(p => p.role);
        if (taken.includes(role)) throw new Error(`Role "${role}" is already taken!`);

        const playerId = genPlayerId();
        await roomRef(roomCode).child(`players/${playerId}`).set({
            username, role, score: 0, joined: Date.now(), solved: {}, tasksCompleted: {}
        });
        currentRoom = roomCode;
        currentPlayer = { id: playerId, username, role, isHost: false };
    } else {
        const room = _readLocal(roomCode);
        if (!room) throw new Error('Room not found. Check the code!');
        if (room.gameState !== 'lobby') throw new Error('Game already in progress.');
        const taken = Object.values(room.players || {}).map(p => p.role);
        if (taken.includes(role)) throw new Error(`Role "${role}" is already taken!`);

        const playerId = genPlayerId();
        room.players[playerId] = { username, role, score: 0, joined: Date.now(), solved: {}, tasksCompleted: {} };
        _writeLocal(roomCode, room);
        _setupBC(roomCode);
        _localBroadcast('players_update', roomCode);
        _localBroadcast('mission_change', roomCode);

        currentRoom = roomCode;
        currentPlayer = { id: playerId, username, role, isHost: false };
    }

    _saveSession();
    return roomCode;
}

async function getTakenRoles(roomCode) {
    if (FIREBASE_READY && db) {
        const snap = await roomRef(roomCode).child('players').once('value');
        if (!snap.exists()) throw new Error('Room not found.');
        return Object.values(snap.val() || {}).map(p => p.role);
    } else {
        const room = _readLocal(roomCode);
        if (!room) throw new Error('Room not found.');
        return Object.values(room.players || {}).map(p => p.role);
    }
}

async function startGame() {
    const update = { gameState: 'playing', currentMission: 0, missionStartAt: Date.now() };
    if (FIREBASE_READY && db) {
        await roomRef(currentRoom).update(update);
    } else {
        const room = _readLocal(currentRoom);
        if (!room) return;
        _writeLocal(currentRoom, { ...room, ...update });
        _localBroadcast('game_state', currentRoom);
        _localBroadcast('mission_change', currentRoom);
    }
}

async function broadcastScore(delta) {
    if (FIREBASE_READY && db) {
        const ref = roomRef(currentRoom).child(`players/${currentPlayer.id}/score`);
        const snap = await ref.once('value');
        await ref.set((snap.val() || 0) + delta);
    } else {
        const room = _readLocal(currentRoom);
        if (!room || !currentPlayer) return;
        const p = room.players[currentPlayer.id];
        if (!p) return;
        p.score = (p.score || 0) + delta;
        // Keep points non-negative or allow penalties to drop score
        _writeLocal(currentRoom, room);
        _localBroadcast('players_update', currentRoom);
        _localBroadcast('mission_change', currentRoom);
    }
}

async function markTaskCompleted(phaseId, taskId) {
    const taskKey = `${phaseId}_${taskId}`;
    if (FIREBASE_READY && db) {
        await roomRef(currentRoom).child(`players/${currentPlayer.id}/tasksCompleted/${taskKey}`).set(true);
    } else {
        const room = _readLocal(currentRoom);
        if (!room || !currentPlayer) return;
        const p = room.players[currentPlayer.id];
        if (!p) return;
        if (!p.tasksCompleted) p.tasksCompleted = {};
        p.tasksCompleted[taskKey] = true;
        _writeLocal(currentRoom, room);
        _localBroadcast('players_update', currentRoom);
        _localBroadcast('mission_change', currentRoom);
    }
}

async function updateTeamBonus(bonusKey, val) {
    if (FIREBASE_READY && db) {
        await roomRef(currentRoom).child(`teamBonuses/${bonusKey}`).set(val);
    } else {
        const room = _readLocal(currentRoom);
        if (!room) return;
        if (!room.teamBonuses) room.teamBonuses = {};
        room.teamBonuses[bonusKey] = val;
        _writeLocal(currentRoom, room);
        _localBroadcast('mission_change', currentRoom);
    }
}

async function markSolved(missionId) {
    if (FIREBASE_READY && db) {
        await roomRef(currentRoom).child(`players/${currentPlayer.id}/solved/${missionId}`).set(true);
    } else {
        const room = _readLocal(currentRoom);
        if (!room || !currentPlayer) return;
        const p = room.players[currentPlayer.id];
        if (!p) return;
        if (!p.solved) p.solved = {};
        p.solved[missionId] = true;
        _writeLocal(currentRoom, room);
        _localBroadcast('mission_change', currentRoom);
    }
}

async function advanceMission(missionIndex) {
    const update = { currentMission: missionIndex, missionStartAt: Date.now() };
    if (FIREBASE_READY && db) {
        await roomRef(currentRoom).update(update);
    } else {
        const room = _readLocal(currentRoom);
        if (!room) return;
        _writeLocal(currentRoom, { ...room, ...update });
        _localBroadcast('game_state', currentRoom);
        _localBroadcast('mission_change', currentRoom);
    }
}

async function endGame() {
    if (FIREBASE_READY && db) {
        await roomRef(currentRoom).update({ gameState: 'ended' });
    } else {
        const room = _readLocal(currentRoom);
        if (!room) return;
        room.gameState = 'ended';
        _writeLocal(currentRoom, room);
        _localBroadcast('game_state', currentRoom);
        _localBroadcast('mission_change', currentRoom);
    }
}

async function sendIntelMessage(text) {
    if (!currentRoom || !currentPlayer || !text.trim()) return;
    const msg = { from: currentPlayer.username, role: currentPlayer.role, text: text.trim(), ts: Date.now() };
    if (FIREBASE_READY && db) {
        await roomRef(currentRoom).child('chat').push(msg);
    } else {
        const room = _readLocal(currentRoom);
        if (!room) return;
        if (!room.chat) room.chat = [];
        room.chat.push(msg);
        if (room.chat.length > 50) room.chat = room.chat.slice(-50);
        _writeLocal(currentRoom, room);
        _localBroadcast('chat_update', currentRoom);
    }
}

// ── Realtime Listeners ─────────────────────────────────────────
function onPlayersUpdate(callback) {
    if (FIREBASE_READY && db) {
        roomRef(currentRoom).child('players').on('value', snap => {
            const players = snap.val() || {};
            _cachedActiveRoles = Object.values(players).map(p => p.role);
            callback(players);
        });
    } else {
        _onLocal('players_update', room => callback(room ? room.players || {} : {}));
        const room = _readLocal(currentRoom);
        if (room) callback(room.players || {});
    }
}

function onGameStateChange(callback) {
    if (FIREBASE_READY && db) {
        roomRef(currentRoom).child('gameState').on('value', snap => callback(snap.val()));
    } else {
        _onLocal('game_state', room => callback(room ? room.gameState : null));
    }
}

function onMissionChange(callback) {
    if (FIREBASE_READY && db) {
        roomRef(currentRoom).on('value', snap => { const d = snap.val(); if (d) callback(d); });
    } else {
        _onLocal('game_state', room => { if (room) callback(room); });
        _onLocal('mission_change', room => { if (room) callback(room); });
        _onLocal('players_update', room => { if (room) callback(room); });
        const room = _readLocal(currentRoom);
        if (room) callback(room);
    }
}

function onIntelMessages(callback) {
    if (FIREBASE_READY && db) {
        roomRef(currentRoom).child('chat').limitToLast(50).on('value', snap => {
            const msgs = [];
            snap.forEach(child => msgs.push(child.val()));
            callback(msgs);
        });
    } else {
        _onLocal('chat_update', room => callback(room ? room.chat || [] : []));
        const room = _readLocal(currentRoom);
        callback(room ? room.chat || [] : []);
    }
}

// ── Session ──────────────────────────────────────────────────────
function _saveSession() {
    localStorage.setItem('cyberheist_player', JSON.stringify(currentPlayer));
    localStorage.setItem('cyberheist_room', currentRoom);
}

function restoreSession() {
    try {
        const p = localStorage.getItem('cyberheist_player');
        const r = localStorage.getItem('cyberheist_room');
        if (p && r) {
            currentPlayer = JSON.parse(p);
            currentRoom = r;
            if (!FIREBASE_READY) _setupBC(r);
            return true;
        }
    } catch { }
    return false;
}

function clearSession() {
    localStorage.removeItem('cyberheist_player');
    localStorage.removeItem('cyberheist_room');
    currentPlayer = null; currentRoom = null;
    _localCallbacks = {};
    if (_bc) { try { _bc.close(); } catch { } _bc = null; }
}

function readRoom(code) { return _readLocal(code); }

function updateNavStatus() {
    const el = document.getElementById('nav-status');
    if (el) {
        if (FIREBASE_READY && db) {
            el.textContent = 'ONLINE';
            el.className = 'badge badge-green';
        } else {
            el.textContent = 'LOCAL ONLY';
            el.className = 'badge badge-yellow';
        }
    }
}
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', updateNavStatus);
} else {
    updateNavStatus();
}

function getActiveRoles() {
    const code = currentRoom;
    if (!code) return [];
    if (FIREBASE_READY && db) {
        return _cachedActiveRoles || [];
    } else {
        const room = _readLocal(code);
        if (!room || !room.players) return [];
        return Object.values(room.players).map(p => p.role);
    }
}
let _cachedActiveRoles = [];

async function saveToLeaderboard(roomCode, finalScore, rankInfo, players) {
    const entry = {
        roomCode,
        score: finalScore,
        rank: rankInfo.rank,
        ts: Date.now(),
        players: Object.values(players).map(p => ({ username: p.username, role: p.role }))
    };
    if (FIREBASE_READY && db) {
        await db.ref(`leaderboard/${roomCode}`).set(entry);
    } else {
        const lb = JSON.parse(localStorage.getItem('ch_leaderboard') || '[]');
        // Prevent duplicate local entries for same room
        const filtered = lb.filter(e => e.roomCode !== roomCode);
        filtered.push(entry);
        localStorage.setItem('ch_leaderboard', JSON.stringify(filtered));
    }
}

async function getLeaderboard() {
    if (FIREBASE_READY && db) {
        const snap = await db.ref('leaderboard').once('value');
        const vals = snap.val() || {};
        return Object.values(vals).sort((a, b) => b.score - a.score);
    } else {
        const lb = JSON.parse(localStorage.getItem('ch_leaderboard') || '[]');
        return lb.sort((a, b) => b.score - a.score);
    }
}

export const Lobby = {
    ROLES, createRoom, joinRoom, startGame, broadcastScore, markSolved,
    markTaskCompleted, updateTeamBonus,
    advanceMission, endGame, sendIntelMessage,
    onPlayersUpdate, onGameStateChange, onMissionChange, onIntelMessages,
    getTakenRoles, restoreSession, clearSession, readRoom, getActiveRoles,
    saveToLeaderboard, getLeaderboard,
    getPlayer: () => currentPlayer,
    getRoom: () => currentRoom,
    isOnline: () => FIREBASE_READY && !!db
};
