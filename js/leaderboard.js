import { Lobby } from "./lobby.js";

function updateNavStatus() {
    const el = document.getElementById('nav-status');
    if (el) {
        if (Lobby.isOnline()) {
            el.textContent = 'ONLINE';
            el.className = 'badge badge-green';
        } else {
            el.textContent = 'LOCAL ONLY';
            el.className = 'badge badge-yellow';
        }
    }
}

function escapeHtml(unsafe) {
    return (unsafe || '').toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function loadLeaderboard() {
    const tbody = document.getElementById('leaderboard-body');
    
    try {
        const scores = await Lobby.getLeaderboard();
        
        if (!scores || scores.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:40px; color:var(--text-dim);">No operational records found in the matrix yet.</td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        
        scores.forEach((entry, index) => {
            const tr = document.createElement('tr');
            
            // Format players
            let playersHtml = '';
            if (entry.players && Array.isArray(entry.players)) {
                entry.players.forEach(p => {
                    const icon = Lobby.ROLES[p.role]?.icon || '👤';
                    playersHtml += `<span class="player-tag" title="${p.role}">${icon} ${escapeHtml(p.username)}</span>`;
                });
            } else {
                playersHtml = '<span style="color:var(--text-dim)">Unknown Operatives</span>';
            }

            tr.innerHTML = `
                <td style="font-family:var(--font-mono); color:var(--text-dim)">${index + 1}</td>
                <td style="font-family:var(--font-mono); font-weight:bold; color:var(--recon)">${escapeHtml(entry.roomCode)}</td>
                <td>
                    <div class="${index === 0 ? 'top-rank' : 'mono'}" style="font-size:1.1rem">${entry.score.toLocaleString()} PTS</div>
                    <div style="font-size:0.7rem; color:var(--text-dim); margin-top:2px;">${escapeHtml(entry.rank)}</div>
                </td>
                <td>${playersHtml}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (e) {
        console.error(e);
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:40px; color:var(--red);">⚠️ ERROR DECRYPTING DATABANKS: ${e.message}</td></tr>`;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    // Wait briefly for firebase to initialize before rendering
    setTimeout(() => {
        updateNavStatus();
        loadLeaderboard();
    }, 500);
});
