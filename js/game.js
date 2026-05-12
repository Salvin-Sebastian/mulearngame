/**
 * CYBER HEIST — Game Engine
 * Handles: puzzle rendering, answer validation, timers, scoring, end game
 */
import { Lobby } from "./lobby.js";
import { PUZZLES } from "./puzzles.js";

const ROLE_COLORS = {
    recon: '#00ff99',
    cryptographer: '#00e5ff',
    exploiter: '#ff3355',
    defender: '#ffcc00'
};

let timerInterval = null;
let missionStartTime = null;
let currentMissionTime = null;
let defenderActed = false;

// ── Audio Feedback ──────────────────────────────────────────────
const AudioController = {
    ctx: null,
    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },
    playTone(freq, type, duration, vol) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },
    playSuccess() {
        this.init();
        this.playTone(600, 'sine', 0.1, 0.5);
        setTimeout(() => this.playTone(800, 'sine', 0.3, 0.5), 100);
    },
    playError() {
        this.init();
        this.playTone(300, 'sawtooth', 0.2, 0.5);
        setTimeout(() => this.playTone(200, 'sawtooth', 0.3, 0.5), 150);
    },
    playMsg() {
        this.init();
        this.playTone(1200, 'square', 0.05, 0.1);
    }
};

// ── Initialization ──────────────────────────────────────────────
function initGame() {
    const player = Lobby.getPlayer();
    if (!player) { window.location.href = 'index.html'; return; }

    renderRoleHeader(player);
    setupIntelChat();
    setupScoreboard();

    // Listen for room state changes
    Lobby.onMissionChange(roomData => {
        updateMissionDots(roomData.currentMission);
        renderMission(roomData.currentMission, roomData.missionStartAt);

        if (roomData.gameState === 'ended') {
            showEndGame(roomData.players);
        }
    });
}

// ── Role Header ─────────────────────────────────────────────────
function renderRoleHeader(player) {
    const roles = Lobby.ROLES;
    const info = roles[player.role];
    document.getElementById('role-badge').textContent = info.icon + ' ' + info.name;
    document.getElementById('player-name-display').textContent = player.username;
    const badge = document.getElementById('role-badge');
    badge.style.color = ROLE_COLORS[player.role];
    badge.style.borderColor = ROLE_COLORS[player.role];
}

// ── Mission Dots ─────────────────────────────────────────────────
function updateMissionDots(current) {
    document.querySelectorAll('.mission-dot').forEach((dot, i) => {
        dot.classList.remove('done', 'active');
        if (i < current) dot.classList.add('done');
        else if (i === current) dot.classList.add('active');
    });
    const missions = PUZZLES;
    if (missions[current]) {
        document.getElementById('mission-title-display').innerHTML =
            `<strong>${missions[current].title}</strong> — ${missions[current].subtitle}`;
    }
}

// ── Timer ────────────────────────────────────────────────────────
function startTimer(timeLimit, startAt) {
    if (timerInterval) clearInterval(timerInterval);
    const timerEl = document.getElementById('timer-display');

    function tick() {
        const elapsed = Math.floor((Date.now() - startAt) / 1000);
        const remaining = Math.max(0, timeLimit - elapsed);
        const m = Math.floor(remaining / 60).toString().padStart(2, '0');
        const s = (remaining % 60).toString().padStart(2, '0');
        timerEl.textContent = `${m}:${s}`;

        timerEl.classList.remove('warn', 'danger');
        if (remaining <= 10) timerEl.classList.add('danger');
        else if (remaining <= 30) timerEl.classList.add('warn');

        if (remaining === 0) {
            clearInterval(timerInterval);
            handleTimerExpired();
        }
    }
    tick();
    timerInterval = setInterval(tick, 1000);
}

async function handleTimerExpired() {
    const player = Lobby.getPlayer();
    const roomCode = Lobby.getRoom();
    if (!roomCode || !player) return;

    // Only the host advances the mission
    const room = Lobby.readRoom(roomCode);
    if (!room || player.id !== room.host) return;

    const cur = room.currentMission || 0;

    if (cur >= PUZZLES.length - 1) {
        await Lobby.endGame();
    } else {
        await Lobby.advanceMission(cur + 1);
    }
}

// ── Mission Renderer ────────────────────────────────────────────
function renderMission(missionIndex, startAt) {
    const puzzle = PUZZLES[missionIndex];
    if (!puzzle) return;

    const player = Lobby.getPlayer();
    const myRole = player.role;
    const myClue = puzzle.clues[myRole];
    defenderActed = false;

    // Track start time for time-bonus calculation in validateAnswer
    missionStartTime = startAt;

    startTimer(puzzle.timeLimit, startAt);

    // Narrative
    document.getElementById('mission-narrative').textContent = puzzle.narrative;

    // ── Primary clue info ──────────────────────────────────────────
    const clueLabel = document.getElementById('clue-label');
    const clueList = document.getElementById('clue-list');
    clueLabel.textContent = myClue.label;
    clueList.innerHTML = '';
    myClue.info.forEach(item => {
        const div = document.createElement('div');
        div.className = 'clue-item';
        div.innerHTML = item;
        clueList.appendChild(div);
    });

    // ── Detect absent roles & merge their clues ────────────────────
    const activeRoles = Lobby.getActiveRoles();
    const allRoles = ['recon', 'cryptographer', 'exploiter', 'defender'];
    const absentRoles = allRoles.filter(r => !activeRoles.includes(r));
    const mergeMap = puzzle.roleMergeMap || {};

    // Determine which absent roles this player inherits
    const inheritedRoles = [];
    absentRoles.forEach(absentRole => {
        let target = mergeMap[absentRole];
        // If target is also absent, follow the chain
        let visited = new Set();
        while (target && !activeRoles.includes(target) && !visited.has(target)) {
            visited.add(target);
            target = mergeMap[target];
        }
        // If we land on our role, we inherit it
        if (target === myRole) {
            inheritedRoles.push(absentRole);
        }
    });

    // Render bonus intel sections for inherited roles
    inheritedRoles.forEach(absentRole => {
        const bonusClue = puzzle.clues[absentRole];
        if (!bonusClue) return;

        // Separator
        const sep = document.createElement('div');
        sep.style.cssText = 'margin:16px 0 8px;padding:8px 12px;background:rgba(0,255,153,0.08);border-left:3px solid var(--green);font-family:var(--font-head);font-size:0.65rem;color:var(--green);letter-spacing:0.15em;';
        sep.textContent = `📡 BONUS INTEL — ${bonusClue.label}`;
        clueList.appendChild(sep);

        bonusClue.info.forEach(item => {
            const div = document.createElement('div');
            div.className = 'clue-item';
            div.innerHTML = item;
            clueList.appendChild(div);
        });
    });

    // Question
    document.getElementById('action-question').textContent = myClue.question;

    // Input area — primary role's input
    const actionBox = document.getElementById('answer-input-area');
    actionBox.innerHTML = '';
    renderInputArea(myClue, puzzle, missionIndex, actionBox);

    // Also render inputs from inherited absent roles
    inheritedRoles.forEach(absentRole => {
        const bonusClue = puzzle.clues[absentRole];
        if (!bonusClue || !bonusClue.input) return;

        const bonusHeader = document.createElement('div');
        bonusHeader.style.cssText = 'margin-top:16px;padding:6px 10px;background:rgba(0,255,153,0.06);border-left:3px solid var(--cyan);font-family:var(--font-head);font-size:0.6rem;color:var(--cyan);letter-spacing:0.15em;margin-bottom:8px;';
        bonusHeader.textContent = `📡 ${Lobby.ROLES[absentRole]?.name || absentRole.toUpperCase()} ACTION`;
        actionBox.appendChild(bonusHeader);

        const bonusQuestion = document.createElement('div');
        bonusQuestion.style.cssText = 'font-family:var(--font-mono);font-size:0.78rem;color:var(--text);margin-bottom:8px;line-height:1.4;';
        bonusQuestion.textContent = bonusClue.question;
        actionBox.appendChild(bonusQuestion);

        renderInputArea(bonusClue, puzzle, missionIndex, actionBox);
    });
}

function renderInputArea(clue, puzzle, missionIndex, actionBox) {
    const missionKey = puzzle.id;

    if (clue.input === 'text') {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'input mb-8';
        input.placeholder = clue.placeholder || 'Enter your answer...';
        input.id = 'puzzle-answer-input';

        const btn = document.createElement('button');
        btn.className = 'btn btn-full';
        btn.innerHTML = '<span>▶ SUBMIT ANSWER</span>';
        btn.onclick = () => validateAnswer(input.value.trim(), puzzle, missionIndex);

        const statusEl = document.createElement('div');
        statusEl.id = 'answer-status';
        statusEl.className = 'answer-status';

        actionBox.appendChild(input);
        actionBox.appendChild(btn);
        actionBox.appendChild(statusEl);

    } else if (clue.input === 'select') {
        const sel = document.createElement('select');
        sel.className = 'input mb-8';
        sel.id = 'puzzle-answer-input';
        clue.options.forEach(opt => {
            const o = document.createElement('option');
            o.value = opt; o.textContent = opt;
            sel.appendChild(o);
        });

        const btn = document.createElement('button');
        btn.className = 'btn btn-full';
        btn.innerHTML = '<span>▶ SUBMIT SELECTION</span>';
        btn.onclick = () => validateAnswer(sel.value, puzzle, missionIndex);

        const statusEl = document.createElement('div');
        statusEl.id = 'answer-status';
        statusEl.className = 'answer-status';

        actionBox.appendChild(sel);
        actionBox.appendChild(btn);
        actionBox.appendChild(statusEl);

    } else if (clue.input === 'button') {
        const btn = document.createElement('button');
        btn.className = 'btn btn-cyan btn-full';
        btn.innerHTML = `<span>${clue.buttonLabel}</span>`;
        btn.id = 'defender-btn';
        btn.onclick = async () => {
            if (defenderActed) return;
            defenderActed = true;
            btn.disabled = true;
            btn.innerHTML = '<span>✓ DEPLOYED</span>';

            const points = Math.floor(puzzle.points * 0.3);
            await Lobby.broadcastScore(points);
            await Lobby.markSolved(puzzle.id);
            showToast(`+${points} pts — Defensive action complete!`, 'green');
            await Lobby.sendIntelMessage(`🛡️ [${puzzle.id.toUpperCase()}] Defensive action deployed!`);
        };

        const infoEl = document.createElement('div');
        infoEl.className = 'text-dim mt-8';
        infoEl.textContent = 'Use this once — timing matters!';

        actionBox.appendChild(btn);
        actionBox.appendChild(infoEl);

    } else {
        // info-only (recon)
        const el = document.createElement('div');
        el.className = 'text-dim';
        el.innerHTML = '📡 Share your intel with the team using the chat below.';
        actionBox.appendChild(el);
    }
}

// ── Security / Anti-Cheat ───────────────────────────────────────
async function hashString(str) {
    const msgBuffer = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Answer Validation ───────────────────────────────────────────
async function validateAnswer(answer, puzzle, missionIndex) {
    const statusEl = document.getElementById('answer-status');
    const inputEl = document.getElementById('puzzle-answer-input');

    const inputHash = await hashString(answer.toLowerCase());
    
    if (inputHash === puzzle.answerHash) {
        // Calculate time bonus
        const elapsed = (Date.now() - missionStartTime) / 1000;
        const remaining = Math.max(0, puzzle.timeLimit - elapsed);
        const timeBonus = Math.floor(remaining * 2);
        const total = puzzle.points + timeBonus;

        if (statusEl) {
            statusEl.className = 'answer-status correct';
            statusEl.innerHTML = `✓ CORRECT! +${puzzle.points} pts${timeBonus > 0 ? ` + ${timeBonus} time bonus` : ''}`;
        }
        if (inputEl) inputEl.disabled = true;

        AudioController.playSuccess();
        await Lobby.broadcastScore(total);
        await Lobby.markSolved(puzzle.id);
        showToast(`🎯 Correct! +${total} pts`, 'green');
        await Lobby.sendIntelMessage(`✅ [${puzzle.id.toUpperCase()}] Solved! +${total} pts`);

        // Auto-advance after 3s (host only)
        const player = Lobby.getPlayer();
        const room = Lobby.readRoom(Lobby.getRoom());
        if (room && player.id === room.host) {
            setTimeout(async () => {
                const last = missionIndex >= PUZZLES.length - 1;
                if (last) await Lobby.endGame();
                else await Lobby.advanceMission(missionIndex + 1);
            }, 3000);
        }

    } else {
        if (statusEl) {
            statusEl.className = 'answer-status wrong';
            statusEl.innerHTML = `✗ INCORRECT — try again`;
        }
        // Penalty
        AudioController.playError();
        await Lobby.broadcastScore(-50);
        showToast('✗ Wrong answer. -50 pts', 'red');
    }
}

// ── Scoreboard ───────────────────────────────────────────────────
function setupScoreboard() {
    const player = Lobby.getPlayer();
    Lobby.onPlayersUpdate(players => {
        renderScoreboard(players, player.id);
    });
}

function renderScoreboard(players, myId) {
    const container = document.getElementById('score-list');
    container.innerHTML = '';

    let teamTotal = 0;
    const sorted = Object.entries(players)
        .sort(([, a], [, b]) => (b.score || 0) - (a.score || 0));

    const maxScore = Math.max(...sorted.map(([, p]) => p.score || 0), 1);

    sorted.forEach(([pid, p]) => {
        const score = p.score || 0;
        teamTotal += score;
        const info = Lobby.ROLES[p.role] || { icon: '?', name: p.role };
        const isMe = pid === myId;

        const card = document.createElement('div');
        card.className = 'score-card' + (isMe ? ' self' : '');
        card.innerHTML = `
      <div class="score-card-role">${info.icon} ${info.name}${isMe ? ' · YOU' : ''}</div>
      <div class="score-card-name">${p.username}</div>
      <div class="score-bar-wrap">
        <div class="score-bar" style="width:${Math.round((score / maxScore) * 100)}%"></div>
      </div>
      <div class="score-val">
        <span class="score-num">${score.toLocaleString()}</span>
        <span class="badge ${isMe ? 'badge-green' : 'badge-cyan'}" style="font-size:0.55rem">PTS</span>
      </div>
    `;
        container.appendChild(card);
    });

    document.getElementById('team-total-score').textContent = teamTotal.toLocaleString();
}

// ── Intel Chat ───────────────────────────────────────────────────
function setupIntelChat() {
    const input = document.getElementById('intel-msg-input');
    const sendBtn = document.getElementById('intel-send-btn');

    async function send() {
        AudioController.init(); // Initialize audio on user interaction
        const text = input.value.trim();
        if (!text) return;
        await Lobby.sendIntelMessage(text);
        input.value = '';
    }

    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });

    let msgCount = 0;
    Lobby.onIntelMessages(msgs => {
        if (msgs.length > msgCount && msgCount > 0) {
            AudioController.playMsg();
        }
        msgCount = msgs.length;
        const container = document.getElementById('intel-messages');
        container.innerHTML = '';
        msgs.forEach(msg => {
            const div = document.createElement('div');
            div.className = 'intel-msg';
            const roleColor = ROLE_COLORS[msg.role] || '#00ff99';
            div.innerHTML = `<span class="msg-from" style="color:${roleColor}">[${msg.from}]</span> <span class="msg-text">${escapeHtml(msg.text)}</span>`;
            container.appendChild(div);
        });
        container.scrollTop = container.scrollHeight;
    });
}

// ── End Game ─────────────────────────────────────────────────────
function showEndGame(players) {
    if (timerInterval) clearInterval(timerInterval);
    document.getElementById('game-page').classList.add('hidden');
    document.getElementById('endgame-page').classList.remove('hidden');

    const sorted = Object.entries(players)
        .sort(([, a], [, b]) => (b.score || 0) - (a.score || 0));

    const teamTotal = sorted.reduce((s, [, p]) => s + (p.score || 0), 0);
    const WIN_THRESHOLD = 500;
    const won = teamTotal >= WIN_THRESHOLD;

    document.getElementById('endgame-title').textContent = won ? '🎯 HEIST COMPLETE!' : '💀 MISSION FAILED';
    document.getElementById('endgame-title').className = 'endgame-title ' + (won ? 'win' : 'lose');
    document.getElementById('endgame-subtitle').textContent = won
        ? `Team extracted ${teamTotal.toLocaleString()} pts of data. Nice work, crew.`
        : `Only ${teamTotal.toLocaleString()} pts secured. The system held. Try again.`;

    document.getElementById('endgame-team-score').textContent = teamTotal.toLocaleString() + ' PTS';

    const list = document.getElementById('endgame-score-list');
    list.innerHTML = '';
    sorted.forEach(([pid, p], i) => {
        const info = Lobby.ROLES[p.role] || { icon: '?', name: p.role.toUpperCase() };
        const row = document.createElement('div');
        row.className = 'endgame-score-row' + (i === 0 ? ' top' : '');
        row.innerHTML = `
      <div>
        <div class="row-role">${info.icon} ${info.name}</div>
        <div class="row-name">${p.username}${i === 0 ? ' 🏆' : ''}</div>
      </div>
      <div class="row-pts">${(p.score || 0).toLocaleString()}</div>
    `;
        list.appendChild(row);
    });
}

// ── Toast ─────────────────────────────────────────────────────────
function showToast(msg, type = 'green') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export const Game = { initGame, showToast };
