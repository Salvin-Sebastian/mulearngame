/**
 * CYBER HEIST — Puzzle Definitions
 * 4 Missions, each with role-specific clue/task and a shared solution.
 *
 * clues[role]   — what THIS role sees
 * task[role]    — what THIS role must do / submit
 * answer        — the canonical correct answer (validated on submit)
 * points        — base points for solving
 * timeLimit     — seconds allowed for this mission
 */

const PUZZLES = [
    // ─── MISSION 1: Password Cracking ────────────────────────────────────────
    {
        id: "m1",
        title: "MISSION 1 — SHADOW VAULT",
        subtitle: "Crack the administrator password hash",
        timeLimit: 150,
        points: 300,
        answerHash: "6e00cd562cc2d88e238dfb81d9439de7ec843ee9d0c9879d549cb1436786f975",
        roleMergeMap: { recon: "cryptographer", cryptographer: "exploiter", exploiter: "cryptographer", defender: "exploiter" },
        narrative: `Intercepted a password hash from the target's shadow file. Your team must identify the hash algorithm, choose the right attack strategy, and crack the hash — all while evading intrusion detection. Each agent holds a piece of the puzzle.`,

        clues: {
            recon: {
                label: "🔭 RECON INTEL",
                info: [
                    "Target: <code>root@shadowvault.internal</code>",
                    "Hash extracted from <code>/etc/shadow.backup</code>:",
                    "<code>d0be2dc421be4fcd0172e5afceea3970e2f3d940</code>",
                    "Hash length: <b>40 hex characters</b>",
                    "Common 40-char algorithms: SHA-1, RIPEMD-160",
                    "Admin note found: <i>'Changed to a movie-themed password last quarter'</i>",
                    "⚠ Share the hash and algorithm clue with your Cryptographer!"
                ],
                input: null,
                question: "Identify the hash algorithm and relay intel to your team."
            },
            cryptographer: {
                label: "🔐 CRYPTOGRAPHER INTEL",
                info: [
                    "You have a partial wordlist from a recovered USB drive:",
                    "<code>sunshine, dragon, phantom, shadow, letmein, qwerty, maverick, cipher, oracle, nebula</code>",
                    "⚠ This list is INCOMPLETE — the correct password may NOT be here.",
                    "Secondary wordlist recovered from admin's browser history:",
                    "<code>reboot, kernel, matrix, binary, trojan, daemon</code>",
                    "You need the hash + algorithm from Recon to crack it.",
                    "SHA-1 hash generator: hash each word and compare to the intercepted hash."
                ],
                input: "text",
                placeholder: "Enter the cracked password...",
                question: "Hash each wordlist entry with the correct algorithm. Submit the matching password."
            },
            exploiter: {
                label: "⚔️ EXPLOITER INTEL",
                info: [
                    "Available attack vectors:",
                    "• <b>Dictionary attack</b> — fast, requires wordlist from Cryptographer",
                    "• <b>Brute force</b> — exhaustive, extremely slow (days for 6+ chars)",
                    "• <b>Rainbow table</b> — precomputed, works for MD5 & SHA-1 only",
                    "• <b>Hybrid</b> — dictionary + rules (slow setup)",
                    "Intel from Recon says the hash is 40 chars — which attacks support that algorithm?",
                    "⚠ Wrong attack = wasted time. Coordinate before selecting!"
                ],
                input: "select",
                options: ["dictionary", "bruteforce", "rainbow", "hybrid"],
                question: "Select the optimal attack method based on team intel."
            },
            defender: {
                label: "🛡️ DEFENDER INTEL",
                info: [
                    "⚠ IDS ALERT: Hash lookup rate exceeding threshold",
                    "Current rate: <code>12 lookups/sec</code> — limit is <code>5/sec</code>",
                    "If IDS triggers, team loses <b>150 points</b> penalty!",
                    "You must deploy decoy traffic to mask the real lookups.",
                    "Decoy strategy: Flood with fake MD5 hashes on port 8443",
                    "⚠ Deploy BEFORE Cryptographer submits — timing is critical!",
                    "Coordinate with your team via Intel Chat."
                ],
                input: "button",
                buttonLabel: "🛡️ Deploy Decoy Traffic",
                question: "Deploy decoy hashes to mask your team's cracking attempt. Act BEFORE submission!"
            }
        }
    },

    // ─── MISSION 2: Encoded Communication ────────────────────────────────────
    {
        id: "m2",
        title: "MISSION 2 — DEAD DROP",
        subtitle: "Decode the intercepted communication",
        timeLimit: 130,
        points: 350,
        answerHash: "f0ffdb82123e5301e5b63e3bcac831d64f108b58919b84786f9f093fcbe995bf",
        roleMergeMap: { recon: "cryptographer", cryptographer: "exploiter", exploiter: "cryptographer", defender: "recon" },
        narrative: `An enemy operative split a classified passphrase across 4 covert channels, each using a different encoding method. Every team member intercepts ONE fragment. No single agent can solve this alone — you must decode your piece, share it via Intel Chat, and reconstruct the full passphrase.`,

        clues: {
            recon: {
                label: "🔭 RECON — CHANNEL ALPHA",
                info: [
                    "Intercepted raw packet on frequency 142.7 MHz:",
                    "<code>47 48 4F 53 54</code>",
                    "Encoding detected: <b>Hexadecimal (ASCII)</b>",
                    "Each pair = one ASCII character (e.g. 41 = 'A')",
                    "Your segment: characters <b>1–5</b> of the passphrase",
                    "⚠ You MUST share your decoded fragment — others can't see it!",
                    "Reminder: 47=G? 48=H? Work it out and post in Intel Chat."
                ],
                input: "text",
                placeholder: "Enter your decoded segment...",
                question: "Decode the hex bytes to ASCII letters. Share result with team."
            },
            cryptographer: {
                label: "🔐 CRYPTO — CHANNEL BRAVO",
                info: [
                    "Intercepted Base64-encoded packet:",
                    "<code>UFJPVE9DT0w=</code>",
                    "Encoding: <b>Base64 → ASCII</b>",
                    "Your segment: the <b>LAST 8 characters</b> of the passphrase",
                    "⚠ Base64 uses A-Z, a-z, 0-9, +, / and = for padding.",
                    "Decode carefully — one wrong letter breaks the passphrase!",
                    "Post your decoded result in Intel Chat immediately."
                ],
                input: "text",
                placeholder: "Enter decoded Base64...",
                question: "Decode the Base64 string and share your segment via Intel Chat."
            },
            exploiter: {
                label: "⚔️ EXPLOIT — CHANNEL CHARLIE",
                info: [
                    "Intercepted network traffic (partial passphrase assembly):",
                    "Your role: <b>ASSEMBLE the full passphrase</b> from all segments.",
                    "Expected format: one continuous word, ALL CAPS, no spaces.",
                    "Recon has the FIRST segment. Crypto has the LAST segment.",
                    "⚠ Wait for ALL teammates to share before submitting!",
                    "The passphrase references a famous spy movie operation.",
                    "Total length: <b>13 characters</b>"
                ],
                input: "text",
                placeholder: "Enter the full assembled passphrase...",
                question: "Collect all decoded segments from your team. Assemble and submit the full passphrase."
            },
            defender: {
                label: "🛡️ DEFENDER — CHANNEL DELTA",
                info: [
                    "⚠ COUNTER-INTELLIGENCE ALERT:",
                    "Enemy monitoring detected on channels Alpha through Charlie.",
                    "If team transmits decoded segments without cover, intercept risk: <b>HIGH</b>",
                    "You must activate signal jamming BEFORE teammates share decoded text.",
                    "Jamming window: <b>45 seconds</b> after activation",
                    "⚠ If you DON'T jam, team loses <b>100 bonus points</b>!",
                    "Coordinate timing with your team in Intel Chat."
                ],
                input: "button",
                buttonLabel: "📡 Activate Signal Jammer",
                question: "Jam enemy surveillance before your team shares decoded intel. Timing is everything!"
            }
        }
    },

    // ─── MISSION 3: SQL Injection ─────────────────────────────────────────────
    {
        id: "m3",
        title: "MISSION 3 — DATABASE BREACH",
        subtitle: "Bypass the admin login via SQL injection",
        timeLimit: 130,
        points: 400,
        answerHash: "39a043f5f5b6d2564dbf55bf07470dc30a3da1a7cd322f26ed612efcd68da2b1",
        roleMergeMap: { recon: "cryptographer", cryptographer: "exploiter", exploiter: "cryptographer", defender: "exploiter" },
        narrative: `Your team has located a login portal on the target server. Error messages suggest the backend uses raw SQL queries without parameterization. Build an injection payload from scattered recon data — but watch out for the Web Application Firewall.`,

        clues: {
            recon: {
                label: "🔭 RECON INTEL",
                info: [
                    "Target: <code>https://shadowvault.internal/admin/login</code>",
                    "Method: <code>POST</code> | Params: <code>username</code>, <code>password</code>",
                    "Error message leaked:",
                    "<code>MySQL Error: You have an error in your SQL syntax near '''</code>",
                    "Backend confirmed: <b>MySQL 5.7</b> (no prepared statements)",
                    "Server-side query pattern (deduced from error):",
                    "<code>SELECT * FROM users WHERE user='[INPUT]' AND pass='[INPUT]'</code>",
                    "⚠ Tell your Cryptographer: the input is wrapped in <b>single quotes</b>!"
                ],
                input: null,
                question: "Analyze the SQL pattern and share the injection context with your team."
            },
            cryptographer: {
                label: "🔐 CRYPTOGRAPHER INTEL",
                info: [
                    "Old pentest report recovered (partially redacted):",
                    "Payload structure: <code>[ESCAPE][LOGIC][BALANCE]</code>",
                    "Fragment ESCAPE: <code>'</code> — closes the existing quote",
                    "Fragment LOGIC: one of these operators makes the query always-true:",
                    "<code>AND, OR, NOT, XOR</code>",
                    "Fragment BALANCE: <code>'1'='1</code> — re-opens/closes quotes",
                    "Full pattern: <code>[ESCAPE] [OPERATOR] [BALANCE]</code>",
                    "⚠ You need Recon's intel on quote context + Defender's WAF rules to pick the right operator!"
                ],
                input: "text",
                placeholder: "Assemble: escape + operator + balance...",
                question: "Build the injection payload. Use intel from Recon (SQL context) and Defender (WAF rules)."
            },
            exploiter: {
                label: "⚔️ EXPLOITER INTEL",
                info: [
                    "Injection target field: <code>password</code> parameter",
                    "You will submit the final payload to the server.",
                    "Requirements for a successful bypass:",
                    "1. Must escape the existing string context (ask Recon)",
                    "2. Must create an always-TRUE condition",
                    "3. Must not trigger WAF signatures (ask Defender)",
                    "⚠ Get the assembled payload from your Cryptographer!",
                    "Double-check: does the payload have balanced quotes?"
                ],
                input: "text",
                placeholder: "Paste the final injection payload...",
                question: "Submit the SQL injection payload. Coordinate with Cryptographer for the exact string."
            },
            defender: {
                label: "🛡️ DEFENDER INTEL",
                info: [
                    "WAF Analysis — Blocked signatures:",
                    "❌ <code>UNION SELECT</code> — BLOCKED (signature #4401)",
                    "❌ <code>DROP TABLE</code> — BLOCKED (signature #4402)",
                    "❌ <code>AND 1=1</code> — BLOCKED (signature #4407)",
                    "❌ <code>; --</code> — BLOCKED (comment injection)",
                    "✅ <code>OR</code> conditions — <b>NOT in blocklist</b>",
                    "✅ String comparisons like <code>'x'='x'</code> — allowed",
                    "⚠ Tell Cryptographer to use <b>OR</b>, not AND!",
                    "Suppress WAF logs BEFORE the Exploiter submits!"
                ],
                input: "button",
                buttonLabel: "🔒 Suppress WAF Logs",
                question: "Share safe operators with Cryptographer, then suppress WAF before Exploiter submits."
            }
        }
    },

    // ─── MISSION 4: Port Scan & Exploit ──────────────────────────────────────
    {
        id: "m4",
        title: "MISSION 4 — FINAL BREACH",
        subtitle: "Identify the open port and exploit the vulnerability",
        timeLimit: 90,
        points: 450,
        answerHash: "785f3ec7eb32f30b90cd0fcf3657d388b5ff4297f2f9716ff66e9b69c05ddd09",
        roleMergeMap: { recon: "cryptographer", cryptographer: "exploiter", exploiter: "cryptographer", defender: "exploiter" },
        narrative: `Final barrier. One service has a known vulnerability. The recon scan
      returns open ports — find which one is exploitable and extract the root flag.`,

        clues: {
            recon: {
                label: "🔭 PORT SCAN RESULTS",
                info: [
                    "<b>nmap -sV 10.0.0.1</b>",
                    "<code>PORT     STATE  SERVICE  VERSION</code>",
                    "<code>22/tcp   open   ssh      OpenSSH 7.2</code>",
                    "<code>80/tcp   open   http     Apache 2.4.18</code>",
                    "<code>443/tcp  closed https    -</code>",
                    "<code>3306/tcp closed mysql    -</code>",
                    "CVE-2016-6515 affects OpenSSH 7.2 (DoS + auth bypass)"
                ],
                input: null,
                question: "Report all open ports and the vulnerable service to your team."
            },
            cryptographer: {
                label: "🔐 SERVICE BANNER",
                info: [
                    "Banner grabbed from target (Base64):",
                    "<code>U1NILTIuMC1PcGVuU1NIXzcuMg==</code>",
                    "Decode to confirm the exact service version.",
                    "Decoded = <b>SSH-2.0-OpenSSH_7.2</b>",
                    "CVE lookup: OpenSSH 7.2 → CVE-2016-6515"
                ],
                input: "text",
                placeholder: "Decode the banner and enter version...",
                question: "Decode the banner, confirm version, report to team."
            },
            exploiter: {
                label: "⚔️ EXPLOIT SELECTION",
                info: [
                    "Available exploits:",
                    "• Port 22 — OpenSSH 7.2 (CVE-2016-6515) <b>CRITICAL</b>",
                    "• Port 80 — Apache 2.4.18 (info disclosure only)",
                    "• Port 443 — CLOSED",
                    "Your Recon has the scan results. Select the right port!"
                ],
                input: "select",
                options: ["80", "22", "443", "3306"],
                question: "Select the port number with the exploitable vulnerability."
            },
            defender: {
                label: "🛡️ IDS SUPPRESSION",
                info: [
                    "IDS TRIGGERED: SSH brute-force pattern detected",
                    "Alert severity: HIGH",
                    "Time to suppress: <b>Act before Exploiter submits!</b>",
                    "Method: Flood decoy SSH packets on port 2222",
                    "Status: <span id='ids-status'>ARMED</span>"
                ],
                input: "button",
                buttonLabel: "Flood Decoy Port 2222",
                question: "Suppress IDS before exploit is launched."
            }
        }
    }
];

export { PUZZLES };
