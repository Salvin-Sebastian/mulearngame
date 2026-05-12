/**
 * OPERATION SHADOW GRID — Complete Mission & Task Definitions
 * 3 Main Phases integrating Small Tasks, Medium Tasks, and Bonus Systems.
 * Maximum Possible Score Per Player: 300 Points.
 */

const PUZZLES = [
    // ─── PHASE 1: ENTRY OPERATION (Small Tasks) ──────────────────────────────
    {
        id: "phase1",
        title: "PHASE 1 — ENTRY OPERATION",
        subtitle: "Infiltrate the outer perimeter and establish secure uplink",
        timeLimit: 300, // 5 minutes
        points: 0, // Phase progression points are accumulated via individual sub-tasks
        answerPlain: "entrygridsecurealpha",
        roleMergeMap: { recon: "cryptographer", cryptographer: "exploiter", exploiter: "defender", defender: "recon" },
        narrative: `Team infiltration initiated. Recon must scout hidden digital signals, Cryptographer decodes access barriers, Exploiter identifies perimeter vulnerabilities, and Defender locks down the checkpoint. Complete all role-specific Small Tasks to synthesize the final Phase 1 passcode.`,

        clues: {
            recon: {
                label: "🔭 RECON SMALL TASK: Hidden Signal Hunt",
                info: [
                    "Objective: Find 3 hidden digital signals inside the outer facility.",
                    "Activate scanner across different map zones to retrieve signal frequencies.",
                    "Passcode Fragment 1: <code>ENTRY</code>",
                    "⚠ Coordinate with your team to assemble the complete 4-part passcode."
                ],
                tasks: [
                    { id: "sig1", title: "Find Signal 1 (Zone Alpha)", points: 10, type: "button", actionText: "Scan Zone Alpha" },
                    { id: "sig2", title: "Find Signal 2 (Zone Bravo)", points: 10, type: "button", actionText: "Scan Zone Bravo" },
                    { id: "sig3", title: "Find Signal 3 (Zone Charlie)", points: 10, type: "button", actionText: "Scan Zone Charlie" },
                    { id: "report", title: "Correct Location Reporting", points: 20, type: "select", options: ["-- Select Coordinates --", "sector-7g", "vault-door-3", "ventilation-shaft"], answer: "sector-7g", penalty: 10 }
                ]
            },
            cryptographer: {
                label: "🔐 CRYPTO SMALL TASK: Cipher Decode",
                info: [
                    "Objective: Decode an encrypted access message to clear the datalines.",
                    "Encrypted string intercepted: <code>KHOOR</code>",
                    "Hint: Caesar Cipher Shift by <b>3</b>",
                    "Passcode Fragment 2: <code>GRID</code>",
                    "⚠ Relay your fragment to the team channel immediately."
                ],
                tasks: [
                    { id: "decode", title: "Decrypt Access Message", points: 30, type: "text", placeholder: "Shift by 3: KHOOR -> ?", answer: "hello", penalty: 15 },
                    { id: "time_limit", title: "Complete Under Time Limit", points: 20, type: "button", actionText: "Verify Time Precision" }
                ]
            },
            exploiter: {
                label: "⚔️ EXPLOIT SMALL TASK: Weak Point Discovery",
                info: [
                    "Objective: Find a vulnerability inside the facility security system.",
                    "Scan perimeter firewall layers to identify exploitable entry nodes.",
                    "Passcode Fragment 3: <code>SECURE</code>",
                    "⚠ Share your passcode fragment to construct the final bypass sequence."
                ],
                tasks: [
                    { id: "vuln", title: "Identify Vulnerability", points: 20, type: "select", options: ["-- Scan Target --", "port-22-ssh", "sql-auth-bypass", "buffer-overflow"], answer: "sql-auth-bypass", penalty: 15 },
                    { id: "method", title: "Select Correct Exploit Method", points: 30, type: "select", options: ["-- Select Method --", "injection-payload", "brute-force", "ddos-flood"], answer: "injection-payload", penalty: 15 }
                ]
            },
            defender: {
                label: "🛡️ DEFENDER SMALL TASK: Checkpoint Security",
                info: [
                    "Objective: Protect a critical checkpoint from incoming counter-attacks.",
                    "Reinforce barrier integrity to prevent detection spikes during entry.",
                    "Passcode Fragment 4: <code>ALPHA</code>",
                    "⚠ Combine all 4 fragments: Recon + Crypto + Exploit + Defender."
                ],
                tasks: [
                    { id: "secure", title: "Secure Checkpoint", points: 25, type: "button", actionText: "Deploy Firewall Shield" },
                    { id: "prevent", title: "Prevent All Breaches", points: 25, type: "button", actionText: "Engage Threat Monitor" }
                ]
            }
        }
    },

    // ─── PHASE 2: CORE FACILITY (Medium Tasks) ───────────────────────────────
    {
        id: "phase2",
        title: "PHASE 2 — CORE FACILITY",
        subtitle: "Navigate internal defenses and access the restricted control center",
        timeLimit: 300, // 5 minutes
        points: 0,
        answerPlain: "corevaultbreachdelta",
        roleMergeMap: { recon: "cryptographer", cryptographer: "exploiter", exploiter: "defender", defender: "recon" },
        narrative: `Core facility breached. Recon initiates full surveillance mapping, Cryptographer transmits classified data relays, Exploiter executes multi-step system overrides, and Defender repels heavy server counter-attacks. Every task step is crucial for team survival.`,

        clues: {
            recon: {
                label: "🔭 RECON MEDIUM TASK: Surveillance Mapping",
                info: [
                    "Objective: Create a full tactical map of the core facility.",
                    "Identify patrol routes, mark secure paths, and map hidden entry points.",
                    "Core Fragment 1: <code>CORE</code>",
                    "⚠ Keep team updated on active camera sweep zones."
                ],
                tasks: [
                    { id: "patrol", title: "Detect Patrol Routes", points: 25, type: "button", actionText: "Map Patrol Routes" },
                    { id: "safe_paths", title: "Mark Safe Paths", points: 25, type: "button", actionText: "Highlight Safe Paths" },
                    { id: "cameras", title: "Identify Camera Zones", points: 25, type: "select", options: ["-- Select Zone --", "server-room-a", "hallway-b", "cafeteria"], answer: "server-room-a", penalty: 10 },
                    { id: "hidden_ent", title: "Discover Hidden Entrances", points: 25, type: "text", placeholder: "Enter hidden shaft code (hint: vent)...", answer: "vent", penalty: 10 }
                ]
            },
            cryptographer: {
                label: "🔐 CRYPTO MEDIUM TASK: Secure Data Relay",
                info: [
                    "Objective: Transmit classified mission data securely across three terminals.",
                    "Establish multi-layer encryption passcodes to prevent interception.",
                    "Core Fragment 2: <code>VAULT</code>",
                    "⚠ Broadcast your passcode piece to complete the relay link."
                ],
                tasks: [
                    { id: "term1", title: "Decode Terminal 1", points: 10, type: "button", actionText: "Decrypt Terminal 1" },
                    { id: "term2", title: "Decode Terminal 2", points: 10, type: "button", actionText: "Decrypt Terminal 2" },
                    { id: "term3", title: "Decode Terminal 3", points: 10, type: "button", actionText: "Decrypt Terminal 3" },
                    { id: "passcode", title: "Create Secure Passcode", points: 30, type: "text", placeholder: "Enter passcode (hint: cipher)...", answer: "cipher", penalty: 15 },
                    { id: "transmit", title: "Complete Secure Transmission", points: 40, type: "button", actionText: "Transmit Classified Data" }
                ]
            },
            exploiter: {
                label: "⚔️ EXPLOIT MEDIUM TASK: System Breach Operation",
                info: [
                    "Objective: Access the highly restricted central control core.",
                    "Chain multiple vulnerabilities to force open the primary heavy gates.",
                    "Core Fragment 3: <code>BREACH</code>",
                    "⚠ Verify all firewall blocks are cleared before gate execution."
                ],
                tasks: [
                    { id: "vuln1", title: "Find Vulnerability 1", points: 15, type: "button", actionText: "Scan Core DB" },
                    { id: "vuln2", title: "Find Vulnerability 2", points: 15, type: "button", actionText: "Scan Internal API" },
                    { id: "disable_def", title: "Disable Defense System", points: 30, type: "button", actionText: "Override Defense Grid" },
                    { id: "unlock_gate", title: "Unlock Restricted Gate", points: 40, type: "select", options: ["-- Select Gate --", "gate-alpha", "core-gate-override", "maintenance-hatch"], answer: "core-gate-override", penalty: 15 }
                ]
            },
            defender: {
                label: "🛡️ DEFENDER MEDIUM TASK: Counterattack Response",
                info: [
                    "Objective: Defend the main server during active enemy attack waves.",
                    "Reinforce barrier nodes and ensure central processing health stays above 60%.",
                    "Core Fragment 4: <code>DELTA</code>",
                    "⚠ Post the final phase passcode assembly format in Intel Chat."
                ],
                tasks: [
                    { id: "detect_src", title: "Detect Attack Source", points: 25, type: "button", actionText: "Trace Enemy IP" },
                    { id: "reinforce", title: "Reinforce Defenses", points: 35, type: "button", actionText: "Boost Defense Barriers" },
                    { id: "server_health", title: "Maintain Server Health > 60%", points: 40, type: "button", actionText: "Execute Emergency Recovery" }
                ]
            }
        }
    },

    // ─── PHASE 3: EXTRACTION (Bonus Systems & Escape) ────────────────────────
    {
        id: "phase3",
        title: "PHASE 3 — EXTRACTION",
        subtitle: "Secure extraction routes and finalize operational extraction",
        timeLimit: 240, // 4 minutes
        points: 0,
        answerPlain: "shadowgridescapevictory",
        roleMergeMap: { recon: "cryptographer", cryptographer: "exploiter", exploiter: "defender", defender: "recon" },
        narrative: `Extraction protocol active. Claim your role-specific Bonus Points by achieving flawless tactical execution under extreme time pressure. Combine the final escape passcode pieces to successfully conclude Operation Shadow Grid.`,

        clues: {
            recon: {
                label: "🔭 RECON BONUS SYSTEM",
                info: [
                    "Claim operational proficiency rewards for flawless reconnaissance.",
                    "Final Passcode Piece 1: <code>SHADOW</code>"
                ],
                tasks: [
                    { id: "no_mistakes", title: "No Incorrect Reports", points: 15, type: "button", actionText: "Verify Clean Reports" },
                    { id: "fast_map", title: "Fastest Mapping Completion", points: 10, type: "button", actionText: "Claim Speed Bonus" },
                    { id: "stealth", title: "Avoid All Enemy Detection", points: 25, type: "button", actionText: "Engage Stealth Escape" }
                ]
            },
            cryptographer: {
                label: "🔐 CRYPTO BONUS SYSTEM",
                info: [
                    "Claim rewards for rapid transmission speeds and flawless logic execution.",
                    "Final Passcode Piece 2: <code>GRID</code>"
                ],
                tasks: [
                    { id: "no_mistakes", title: "No Decryption Mistakes", points: 15, type: "button", actionText: "Audit Decryption Logs" },
                    { id: "prevent_int", title: "Prevent Enemy Interception", points: 10, type: "button", actionText: "Activate Signal Scrambler" },
                    { id: "fast_trans", title: "Fastest Secure Transmission", points: 25, type: "button", actionText: "Finalize High-Speed Relay" }
                ]
            },
            exploiter: {
                label: "⚔️ EXPLOIT BONUS SYSTEM",
                info: [
                    "Claim maximum impact rewards for zero alarm triggers and perfect exploit chains.",
                    "Final Passcode Piece 3: <code>ESCAPE</code>"
                ],
                tasks: [
                    { id: "no_alarms", title: "No Alarms Triggered", points: 15, type: "button", actionText: "Verify Silent Execution" },
                    { id: "quick_breach", title: "Complete Breach Quickly", points: 10, type: "button", actionText: "Claim Rapid Override" },
                    { id: "perfect_chain", title: "Perfect Exploit Chain", points: 25, type: "button", actionText: "Execute Perfect Chain" }
                ]
            },
            defender: {
                label: "🛡️ DEFENDER BONUS SYSTEM",
                info: [
                    "Claim defensive honors for perfect server integrity and ultimate wave survival.",
                    "Final Passcode Piece 4: <code>VICTORY</code>"
                ],
                tasks: [
                    { id: "zero_dmg", title: "Zero System Damage", points: 15, type: "button", actionText: "Certify Intact Server" },
                    { id: "fast_resp", title: "Fastest Threat Response", points: 10, type: "button", actionText: "Claim Quick Reaction" },
                    { id: "survive_waves", title: "Survive All Attack Waves", points: 25, type: "button", actionText: "Trigger Final Lockdown" }
                ]
            }
        }
    }
];

export { PUZZLES };
