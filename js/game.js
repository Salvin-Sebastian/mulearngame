/**
 * OPERATION SHADOW GRID — Premium Game Engine
 * Manages rendering of dynamic multi-step tasks, real-time answer evaluations,
 * collaborative global bonus synchronization, sound feedbacks, and custom ranks.
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

// ── Audio Feedback Engine ───────────────────────────────────────
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
        try {
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
        } catch { }
    },
    playSuccess() {
        this.init();
        this.playTone(587.33, 'sine', 0.1, 0.4); // D5
        setTimeout(() => this.playTone(880, 'sine', 0.25, 0.4), 100); // A5
    },
    playError() {
        this.init();
        this.playTone(220, 'sawtooth', 0.2, 0.4);
        setTimeout(() => this.playTone(146.83, 'sawtooth', 0.3, 0.4), 120);
    },
    playMsg() {
        this.init();
        this.playTone(1046.50, 'triangle', 0.05, 0.15); // C6
    }
};

// ── Initialization ──────────────────────────────────────────────
function initGame() {
    const player = Lobby.getPlayer();
    if (!player) { window.location.href = 'index.html'; return; }

    renderRoleHeader(player);
    setupIntelChat();
    setupScoreboard();

    // Listen for comprehensive mission and player state updates
    Lobby.onMissionChange(roomData => {
        if (!roomData) return;
        updateMissionDots(roomData.currentMission);
        renderMission(roomData.currentMission, roomData.missionStartAt);
        renderScoreboard(roomData.players, player.id, roomData);

        if (roomData.gameState === 'ended') {
            showEndGame(roomData.players, roomData);
        }
    });
}

// ── Role Header ─────────────────────────────────────────────────
function renderRoleHeader(player) {
    const roles = Lobby.ROLES;
    const info = roles[player.role] || { icon: "⚡", name: player.role.toUpperCase() };
    const badge = document.getElementById('role-badge');
    if (badge) {
        badge.textContent = info.icon + ' ' + info.name;
        badge.style.color = ROLE_COLORS[player.role] || '#00ff99';
        badge.style.borderColor = ROLE_COLORS[player.role] || '#00ff99';
    }
    const nameDisplay = document.getElementById('player-name-display');
    if (nameDisplay) nameDisplay.textContent = player.username;
}

// ── Mission Progression Indicators ──────────────────────────────
function updateMissionDots(current) {
    document.querySelectorAll('.mission-dot').forEach((dot, i) => {
        dot.classList.remove('done', 'active');
        if (i < current) dot.classList.add('done');
        else if (i === current) dot.classList.add('active');
    });
    const missions = PUZZLES;
    const titleDisplay = document.getElementById('mission-title-display');
    if (titleDisplay && missions[current]) {
        titleDisplay.innerHTML = `<strong>${missions[current].title}</strong> — ${missions[current].subtitle}`;
    }
}

// ── Timer & Phase Controls ──────────────────────────────────────
function startTimer(timeLimit, startAt) {
    if (timerInterval) clearInterval(timerInterval);
    const timerEl = document.getElementById('timer-display');
    if (!timerEl) return;

    function tick() {
        const elapsed = Math.floor((Date.now() - startAt) / 1000);
        const remaining = Math.max(0, timeLimit - elapsed);
        const m = Math.floor(remaining / 60).toString().padStart(2, '0');
        const s = (remaining % 60).toString().padStart(2, '0');
        timerEl.textContent = `${m}:${s}`;

        timerEl.classList.remove('warn', 'danger');
        if (remaining <= 15) timerEl.classList.add('danger');
        else if (remaining <= 45) timerEl.classList.add('warn');

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

    const room = Lobby.readRoom(roomCode);
    if (!room || player.id !== room.host) return;

    // Apply time exceeded penalty
    await Lobby.broadcastScore(-20);
    await Lobby.updateTeamBonus('perfectMission', false);
    Lobby.sendIntelMessage("⚠ [TIME EXCEEDED] Phase security collapsed! (-20 pts)");

    const cur = room.currentMission || 0;
    if (cur >= PUZZLES.length - 1) {
        await Lobby.endGame();
    } else {
        await Lobby.advanceMission(cur + 1);
    }
}

// ── Multi-Step Phase Layout Renderer ────────────────────────────
function renderMission(missionIndex, startAt) {
    const puzzle = PUZZLES[missionIndex];
    if (!puzzle) return;

    const player = Lobby.getPlayer();
    const myRole = player.role;
    const myClue = puzzle.clues[myRole];

    missionStartTime = startAt;
    startTimer(puzzle.timeLimit, startAt);

    const narrativeEl = document.getElementById('mission-narrative');
    if (narrativeEl) narrativeEl.textContent = puzzle.narrative;

    // Render Clues & Sub-Tasks
    const clueLabel = document.getElementById('clue-label');
    const clueList = document.getElementById('clue-list');
    if (clueLabel) clueLabel.textContent = myClue?.label || "INTEL BRIEF";
    if (clueList) {
        clueList.innerHTML = '';
        (myClue?.info || []).forEach(item => {
            const div = document.createElement('div');
            div.className = 'clue-item';
            div.innerHTML = item;
            clueList.appendChild(div);
        });
    }

    // Handle Inherited Tasks from Absent Roles
    const activeRoles = Lobby.getActiveRoles();
    const allRoles = ['recon', 'cryptographer', 'exploiter', 'defender'];
    const absentRoles = allRoles.filter(r => !activeRoles.includes(r));
    const mergeMap = puzzle.roleMergeMap || {};

    const inheritedRoles = [];
    absentRoles.forEach(absentRole => {
        let target = mergeMap[absentRole];
        let visited = new Set();
        while (target && !activeRoles.includes(target) && !visited.has(target)) {
            visited.add(target);
            target = mergeMap[target];
        }
        if (target === myRole) {
            inheritedRoles.push(absentRole);
        }
    });

    // Render bonus clues for inherited roles
    inheritedRoles.forEach(absentRole => {
        const bonusClue = puzzle.clues[absentRole];
        if (!bonusClue || !clueList) return;

        const sep = document.createElement('div');
        sep.style.cssText = 'margin:16px 0 8px;padding:8px 12px;background:rgba(0,229,255,0.06);border-left:3px solid var(--crypto);font-family:var(--font-head);font-size:0.65rem;color:var(--crypto);letter-spacing:0.15em;';
        sep.textContent = `📡 INHERITED LINK — ${bonusClue.label}`;
        clueList.appendChild(sep);

        bonusClue.info.forEach(item => {
            const div = document.createElement('div');
            div.className = 'clue-item';
            div.innerHTML = item;
            clueList.appendChild(div);
        });
    });

    // Render Interactive Sub-Tasks Action Box
    const actionBox = document.getElementById('answer-input-area');
    if (!actionBox) return;
    actionBox.innerHTML = '';

    const flowContainer = document.createElement('div');
    flowContainer.className = 'task-flow-container';

    // Render primary role sub-tasks
    if (myClue && myClue.tasks) {
        renderSubTaskArray(myClue.tasks, puzzle, missionIndex, flowContainer, false);
    }

    // Render inherited sub-tasks
    inheritedRoles.forEach(absentRole => {
        const bonusClue = puzzle.clues[absentRole];
        if (!bonusClue || !bonusClue.tasks) return;

        const header = document.createElement('div');
        header.style.cssText = 'margin-top:16px;padding:6px 12px;background:rgba(255,204,0,0.08);border-left:3px solid var(--defender);font-family:var(--font-head);font-size:0.65rem;color:var(--defender);letter-spacing:0.12em;';
        header.textContent = `⚡ INHERITED TASKS: ${Lobby.ROLES[absentRole]?.name || absentRole.toUpperCase()}`;
        flowContainer.appendChild(header);

        renderSubTaskArray(bonusClue.tasks, puzzle, missionIndex, flowContainer, true);
    });

    actionBox.appendChild(flowContainer);

    // Render Shared Master Phase Override Form at the bottom
    renderMasterPhaseUplink(puzzle, missionIndex, actionBox);
}

// ── Multi-Step Task Action Engine ───────────────────────────────
function renderSubTaskArray(tasks, puzzle, missionIndex, container, isInherited) {
    const room = Lobby.readRoom(Lobby.getRoom());
    const player = Lobby.getPlayer();
    const pData = room?.players?.[player.id];

    tasks.forEach(task => {
        const taskKey = `${puzzle.id}_${task.id}`;
        const isCompleted = pData?.tasksCompleted?.[taskKey];

        const stepDiv = document.createElement('div');
        stepDiv.className = `task-step ${isCompleted ? 'completed' : ''}`;
        stepDiv.id = `task-step-${taskKey}`;

        // Header showing title and points
        const headerDiv = document.createElement('div');
        headerDiv.className = 'task-step-header';
        headerDiv.innerHTML = `
            <div class="task-step-title">${task.title}</div>
            <div class="task-step-points">+${task.points} PTS</div>
        `;
        stepDiv.appendChild(headerDiv);

        const actionDiv = document.createElement('div');
        actionDiv.className = 'task-step-action';

        if (isCompleted) {
            actionDiv.innerHTML = `<span class="badge badge-green" style="font-size:0.7rem">✓ SECURED</span>`;
        } else {
            if (task.type === 'button') {
                const btn = document.createElement('button');
                btn.className = 'btn btn-sm btn-cyan';
                btn.innerHTML = `<span>${task.actionText || 'Execute'}</span>`;
                btn.onclick = async () => {
                    btn.disabled = true;
                    btn.innerHTML = '<span>✓ VERIFIED</span>';
                    stepDiv.classList.add('completed');
                    AudioController.playSuccess();

                    await Lobby.markTaskCompleted(puzzle.id, task.id);
                    await Lobby.broadcastScore(task.points);
                    showToast(`⚡ Sub-task secured! +${task.points} pts`, 'cyan');
                    await Lobby.sendIntelMessage(`⚡ Secured: ${task.title} (+${task.points} pts)`);

                    // Trigger collaborative evaluation
                    checkGlobalTaskSync(missionIndex);
                };
                actionDiv.appendChild(btn);

            } else if (task.type === 'text') {
                const inp = document.createElement('input');
                inp.type = 'text';
                inp.className = 'input';
                inp.placeholder = task.placeholder || 'Enter validation key...';
                inp.style.flex = '1';

                const btn = document.createElement('button');
                btn.className = 'btn btn-sm';
                btn.innerHTML = '<span>Verify</span>';
                btn.onclick = async () => {
                    const val = inp.value.trim().toLowerCase();
                    if (val === task.answer) {
                        inp.disabled = true; btn.disabled = true;
                        stepDiv.classList.add('completed');
                        AudioController.playSuccess();

                        await Lobby.markTaskCompleted(puzzle.id, task.id);
                        await Lobby.broadcastScore(task.points);
                        showToast(`⚡ Verification matched! +${task.points} pts`, 'green');
                        await Lobby.sendIntelMessage(`⚡ Verified: ${task.title} (+${task.points} pts)`);
                        checkGlobalTaskSync(missionIndex);
                    } else {
                        AudioController.playError();
                        const pen = task.penalty || 15;
                        await Lobby.broadcastScore(-pen);
                        await Lobby.updateTeamBonus('perfectMission', false);
                        showToast(`✗ Validation mismatch! -${pen} pts penalty`, 'red');
                        await Lobby.sendIntelMessage(`⚠ Mistake logged on ${task.title} (-${pen} pts)`);
                    }
                };
                actionDiv.appendChild(inp); actionDiv.appendChild(btn);

            } else if (task.type === 'select') {
                const sel = document.createElement('select');
                sel.className = 'input';
                sel.style.flex = '1';
                task.options.forEach(o => {
                    const opt = document.createElement('option');
                    opt.value = o; opt.textContent = o;
                    sel.appendChild(opt);
                });

                const btn = document.createElement('button');
                btn.className = 'btn btn-sm';
                btn.innerHTML = '<span>Submit</span>';
                btn.onclick = async () => {
                    const val = sel.value;
                    if (val === task.answer) {
                        sel.disabled = true; btn.disabled = true;
                        stepDiv.classList.add('completed');
                        AudioController.playSuccess();

                        await Lobby.markTaskCompleted(puzzle.id, task.id);
                        await Lobby.broadcastScore(task.points);
                        showToast(`⚡ Coordinates relayed! +${task.points} pts`, 'green');
                        await Lobby.sendIntelMessage(`⚡ Confirmed: ${task.title} (+${task.points} pts)`);
                        checkGlobalTaskSync(missionIndex);
                    } else {
                        AudioController.playError();
                        const pen = task.penalty || 15;
                        await Lobby.broadcastScore(-pen);
                        await Lobby.updateTeamBonus('perfectMission', false);
                        showToast(`✗ Routing mistake! -${pen} pts penalty`, 'red');
                        await Lobby.sendIntelMessage(`⚠ Routing error on ${task.title} (-${pen} pts)`);
                    }
                };
                actionDiv.appendChild(sel); actionDiv.appendChild(btn);
            }
        }
        stepDiv.appendChild(actionDiv);
        container.appendChild(stepDiv);
    });
}

// ── Shared Master Phase Passcode Component ──────────────────────
function renderMasterPhaseUplink(puzzle, missionIndex, container) {
    const divider = document.createElement('hr');
    divider.className = 'divider';
    container.appendChild(divider);

    const titleEl = document.createElement('div');
    titleEl.className = 'action-label';
    titleEl.textContent = '◈ MASTER PHASE UPLINK OVERRIDE';
    container.appendChild(titleEl);

    const descEl = document.createElement('div');
    descEl.className = 'text-dim mb-8';
    descEl.textContent = 'Combine fragments extracted by all 4 roles to advance the entire team.';
    container.appendChild(descEl);

    const wrap = document.createElement('div');
    wrap.style.display = 'flex'; wrap.style.gap = '8px'; wrap.style.marginTop = '10px';

    const inp = document.createElement('input');
    inp.type = 'text'; inp.className = 'input';
    inp.placeholder = 'Enter complete synthesized phase code...';
    inp.id = 'master-phase-input';

    const btn = document.createElement('button');
    btn.className = 'btn btn-cyan';
    btn.innerHTML = '<span>BREACH</span>';

    const statusEl = document.createElement('div');
    statusEl.className = 'answer-status';

    btn.onclick = async () => {
        AudioController.init();
        const val = inp.value.trim().toLowerCase();
        if (val === puzzle.answerPlain) {
            statusEl.className = 'answer-status correct';
            statusEl.innerHTML = '✓ MASTER PASSCODE ACCEPTED!';
            inp.disabled = true; btn.disabled = true;
            AudioController.playSuccess();

            await Lobby.markSolved(puzzle.id);
            const isLast = missionIndex >= PUZZLES.length - 1;

            if (isLast) {
                // Successful extraction claim
                await Lobby.updateTeamBonus('missionSuccess', true);
                
                // Calculate time bonus
                const room = Lobby.readRoom(Lobby.getRoom());
                if (room && room.createdAt) {
                    const elapsedMin = (Date.now() - room.createdAt) / 60000;
                    let timeB = 0;
                    if (elapsedMin <= 5) timeB = 25;
                    else if (elapsedMin <= 8) timeB = 15;
                    else if (elapsedMin <= 10) timeB = 10;
                    await Lobby.updateTeamBonus('timeBonus', timeB);
                }

                showToast('🎯 HEIST COMPLETE! Securing extraction protocols...', 'green');
                setTimeout(() => Lobby.endGame(), 2000);
            } else {
                showToast('🎯 Phase access cleared! Relaying new sequence...', 'cyan');
                setTimeout(() => Lobby.advanceMission(missionIndex + 1), 3000);
            }
        } else {
            AudioController.playError();
            statusEl.className = 'answer-status wrong';
            statusEl.innerHTML = '✗ ACCESS DENIED — Invalid Phase Uplink Sequence';
            await Lobby.broadcastScore(-20);
            await Lobby.updateTeamBonus('perfectMission', false);
            showToast('✗ Incorrect core override sequence. -20 pts', 'red');
        }
    };

    wrap.appendChild(inp); wrap.appendChild(btn);
    container.appendChild(wrap); container.appendChild(statusEl);
}

// ── Collaborative Synchronization Checker ───────────────────────
async function checkGlobalTaskSync(missionIndex) {
    const room = Lobby.readRoom(Lobby.getRoom());
    if (!room || !room.players) return;

    const phase = PUZZLES[missionIndex];
    if (!phase) return;

    const isPhase1 = phase.id === 'phase1';
    const isPhase2 = phase.id === 'phase2';

    if (isPhase1 && room.teamBonuses?.smallTasks) return;
    if (isPhase2 && room.teamBonuses?.mediumTasks) return;

    const activePlayers = Object.values(room.players);
    let allComplete = true;

    activePlayers.forEach(p => {
        const roleTasks = phase.clues[p.role]?.tasks || [];
        roleTasks.forEach(t => {
            const key = `${phase.id}_${t.id}`;
            if (!p.tasksCompleted || !p.tasksCompleted[key]) {
                allComplete = false;
            }
        });
    });

    if (allComplete && activePlayers.length > 0) {
        if (isPhase1) {
            await Lobby.updateTeamBonus('smallTasks', true);
            showToast('🌟 TEAM BONUS: All Outer Perimeter Small Tasks Complete! +20 Team Pts', 'cyan');
            await Lobby.sendIntelMessage('🌟 [TEAM BONUS] All Small Tasks Completed! (+20 Team Pts)');
        } else if (isPhase2) {
            await Lobby.updateTeamBonus('mediumTasks', true);
            showToast('🌟 TEAM BONUS: All Internal Medium Tasks Complete! +20 Team Pts', 'cyan');
            await Lobby.sendIntelMessage('🌟 [TEAM BONUS] All Medium Tasks Completed! (+20 Team Pts)');
        }
    }
}

// ── Scoreboard & Global Objective Tracking Panel ────────────────
function setupScoreboard() {
    const player = Lobby.getPlayer();
    Lobby.onPlayersUpdate(players => {
        const room = Lobby.readRoom(Lobby.getRoom());
        renderScoreboard(players, player.id, room);
    });
}

function renderScoreboard(players, myId, room) {
    const container = document.getElementById('score-list');
    if (!container) return;
    container.innerHTML = '';

    let baseTeamTotal = 0;
    const sorted = Object.entries(players || {})
        .sort(([, a], [, b]) => (b.score || 0) - (a.score || 0));

    const maxScore = Math.max(...sorted.map(([, p]) => p.score || 0), 1);

    sorted.forEach(([pid, p]) => {
        const score = p.score || 0;
        baseTeamTotal += score;
        const info = Lobby.ROLES[p.role] || { icon: '⚡', name: p.role.toUpperCase() };
        const isMe = pid === myId;

        const card = document.createElement('div');
        card.className = 'score-card' + (isMe ? ' self' : '');
        card.innerHTML = `
            <div style="display:flex;justify-content:space-between">
                <span class="score-card-role">${info.icon} ${info.name}${isMe ? ' · YOU' : ''}</span>
            </div>
            <div class="score-card-name">${p.username}</div>
            <div class="score-bar-wrap">
                <div class="score-bar" style="width:${Math.round((Math.max(score,0) / maxScore) * 100)}%"></div>
            </div>
            <div class="score-val">
                <span class="score-num">${score.toLocaleString()}</span>
                <span class="badge ${isMe ? 'badge-green' : 'badge-cyan'}" style="font-size:0.55rem">PTS</span>
            </div>
        `;
        container.appendChild(card);
    });

    // Add Shared Global Team Bonuses to cumulative score
    let globalBonusTotal = 0;
    const tB = room?.teamBonuses || {};
    if (tB.smallTasks) globalBonusTotal += 20;
    if (tB.mediumTasks) globalBonusTotal += 20;
    if (tB.missionSuccess) globalBonusTotal += 10;
    if (tB.perfectMission && room?.gameState === 'ended') globalBonusTotal += 25;
    globalBonusTotal += (tB.timeBonus || 0);

    const finalCumulativeScore = baseTeamTotal + globalBonusTotal;
    const scoreDisplay = document.getElementById('team-total-score');
    if (scoreDisplay) scoreDisplay.textContent = finalCumulativeScore.toLocaleString();

    // Update Global Objectives Checklist Widget live
    renderGlobalObjectivesWidget(tB, room?.gameState);
}

function renderGlobalObjectivesWidget(tB, gameState) {
    let widget = document.getElementById('global-objectives-widget');
    if (!widget) {
        const wrap = document.querySelector('.team-total');
        if (!wrap) return;
        widget = document.createElement('div');
        widget.id = 'global-objectives-widget';
        widget.className = 'team-bonus-widget';
        wrap.appendChild(widget);
    }

    widget.innerHTML = `
        <div style="font-family:var(--font-head);font-size:0.6rem;color:var(--text-dim);margin-bottom:6px;letter-spacing:0.1em;text-align:left">◈ GLOBAL TEAM OBJECTIVES</div>
        <div class="team-bonus-item ${tB.smallTasks ? 'active' : ''}">
            <span>Outer Perimeter Tasks</span>
            <span class="bonus-check">${tB.smallTasks ? '✓ +20 PTS' : '---'}</span>
        </div>
        <div class="team-bonus-item ${tB.mediumTasks ? 'active' : ''}">
            <span>Core Facility Tasks</span>
            <span class="bonus-check">${tB.mediumTasks ? '✓ +20 PTS' : '---'}</span>
        </div>
        <div class="team-bonus-item ${tB.perfectMission ? 'active' : ''}">
            <span>Perfect Infiltration Status</span>
            <span class="bonus-check">${tB.perfectMission ? '✓ ACTIVE' : '✗ BROKEN'}</span>
        </div>
        <div class="team-bonus-item ${tB.missionSuccess ? 'active' : ''}">
            <span>Successful Extraction</span>
            <span class="bonus-check">${tB.missionSuccess ? '✓ +10 PTS' : '---'}</span>
        </div>
        ${tB.timeBonus > 0 ? `
        <div class="team-bonus-item active">
            <span>High-Speed Exfil Bonus</span>
            <span class="bonus-check">✓ +${tB.timeBonus} PTS</span>
        </div>` : ''}
    `;
}

// ── Intel Share Chat Channel ────────────────────────────────────
function setupIntelChat() {
    const input = document.getElementById('intel-msg-input');
    const sendBtn = document.getElementById('intel-send-btn');
    if (!input || !sendBtn) return;

    async function send() {
        AudioController.init();
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
        if (!container) return;
        container.innerHTML = '';
        msgs.forEach(msg => {
            const div = document.createElement('div');
            div.className = 'intel-msg';
            const rColor = ROLE_COLORS[msg.role] || '#00ff99';
            div.innerHTML = `<span class="msg-from" style="color:${rColor}">[${escapeHtml(msg.from)}]</span> <span class="msg-text">${escapeHtml(msg.text)}</span>`;
            container.appendChild(div);
        });
        container.scrollTop = container.scrollHeight;
    });
}

// ── Master Rank Structure Evaluator ─────────────────────────────
function getRankInfo(score) {
    if (score <= 100) return { rank: "Rookie", desc: "Basic grid infiltration proficiency" };
    if (score <= 200) return { rank: "Operator", desc: "Standard field network operator" };
    if (score <= 350) return { rank: "Specialist", desc: "Tactical secure database specialist" };
    if (score <= 500) return { rank: "Elite Agent", desc: "Flawless core system breacher" };
    if (score <= 700) return { rank: "Shadow Master", desc: "Supreme multi-node matrix commander" };
    return { rank: "Cyber Legend", desc: "Absolute high-security facility domination" };
}

// ── End Game Summary View ───────────────────────────────────────
function showEndGame(players, room) {
    if (timerInterval) clearInterval(timerInterval);
    const gamePage = document.getElementById('game-page');
    const endPage = document.getElementById('endgame-page');
    if (gamePage) gamePage.classList.add('hidden');
    if (endPage) endPage.classList.remove('hidden');

    const sorted = Object.entries(players || {})
        .sort(([, a], [, b]) => (b.score || 0) - (a.score || 0));

    const baseTeamTotal = sorted.reduce((s, [, p]) => s + (p.score || 0), 0);

    let globalBonusTotal = 0;
    const tB = room?.teamBonuses || {};
    if (tB.smallTasks) globalBonusTotal += 20;
    if (tB.mediumTasks) globalBonusTotal += 20;
    if (tB.missionSuccess) globalBonusTotal += 10;
    if (tB.perfectMission) globalBonusTotal += 25;
    globalBonusTotal += (tB.timeBonus || 0);

    const finalScore = baseTeamTotal + globalBonusTotal;
    const rankInfo = getRankInfo(finalScore);

    const winTitle = document.getElementById('endgame-title');
    if (winTitle) {
        winTitle.textContent = tB.missionSuccess ? '🎯 OPERATION SHADOW GRID COMPLETE!' : '💀 BREACH CONTAINED';
        winTitle.className = 'endgame-title ' + (tB.missionSuccess ? 'win' : 'lose');
    }
    const sub = document.getElementById('endgame-subtitle');
    if (sub) {
        sub.textContent = tB.missionSuccess
            ? `Magnificent execution. Team secured all core access gates with a cumulative combat rating of ${finalScore.toLocaleString()} PTS.`
            : `Facility security overwhelmed agents. Final extracted data worth ${finalScore.toLocaleString()} PTS. Restart grid.`;
    }

    const tScore = document.getElementById('endgame-team-score');
    if (tScore) tScore.textContent = finalScore.toLocaleString() + ' PTS';

    // Inject beautiful Rank Card
    let rankCardWrap = document.getElementById('endgame-rank-card-wrap');
    if (!rankCardWrap) {
        rankCardWrap = document.createElement('div');
        rankCardWrap.id = 'endgame-rank-card-wrap';
        if (sub && sub.parentNode) {
            sub.parentNode.insertBefore(rankCardWrap, sub.nextSibling);
        }
    }
    rankCardWrap.innerHTML = `
        <div class="rank-card anim-fade-up">
            <div>
                <div class="rank-label">ASSIGNED OPERATIONAL RANK</div>
                <div class="rank-title">${rankInfo.rank}</div>
                <div style="font-size:0.8rem;color:var(--text-dim);margin-top:2px">${rankInfo.desc}</div>
            </div>
        </div>
    `;

    const list = document.getElementById('endgame-score-list');
    if (list) {
        list.innerHTML = '';
        sorted.forEach(([pid, p], i) => {
            const info = Lobby.ROLES[p.role] || { icon: '⚡', name: p.role.toUpperCase() };
            const row = document.createElement('div');
            row.className = 'endgame-score-row' + (i === 0 ? ' top' : '');
            row.innerHTML = `
                <div>
                    <div class="row-role">${info.icon} ${info.name}</div>
                    <div class="row-name">${escapeHtml(p.username)}${i === 0 ? ' 🏆 MASTER OP' : ''}</div>
                </div>
                <div class="row-pts">${(p.score || 0).toLocaleString()} PTS</div>
            `;
            list.appendChild(row);
        });
    }
}

function showToast(msg, type = 'green') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function escapeHtml(str) {
    return (str || '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export const Game = { initGame, showToast };
