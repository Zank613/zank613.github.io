import { BaseApp } from "../core/baseApp.js";
import { state } from "../state.js";
import { networkManager } from "../os/networkManager.js";
import { getOfficerById } from "../world/caseWorld.js";
import { fs } from "../os/fileSystem.js";
import { ScriptSystem } from "../systems/scriptSystem.js";

export class OneTerminal extends BaseApp {
    constructor(data) {
        super();
        this.lines = [
            "CenterOS Unified Terminal v1.1 (Root)",
            "Kernel: 5.4.0-center-generic",
            "Type 'help' for available commands.",
            ""
        ];
        this.input = "";
        this.maxLines = 200;
        this.commandHistory = [];
        this.historyIndex = -1;

        // Layout Config
        this.lineHeight = 18;
        this.padding = 10;
        this.inputHeight = 24;
        this.statusHeight = 24;

        // Auto-scroll trigger
        this.scrollToBottom = true;

        // File System
        this.currentDir = fs.home;

        // Hacking State Machine
        this.hackState = {
            mode: "IDLE", // IDLE, MONITOR, CAPTURING, CRACKING
            targetNet: null,
            packets: 0,
            ivs: 0,
            handshakeProgress: 0,
            crackProgress: 0,
            dictionaryLine: 0,
            logTimer: 0
        };

        this.dictionary = [
            "admin", "password", "123456", "iloveyou", "princess", "rockyou", "qwerty",
            "football", "dragon", "master", "666666", "letmein", "server", "wpa2_fail"
        ];

        if (data && data.content) {
            this.runScript(data);
        }
    }

    runScript(data) {
        const { content, filePath } = data;
        const filename = filePath ? filePath.split('/').pop() : "script.cts";

        this.append(`root@centeros:${this.currentDir.getPath()}$ ./` + filename);

        // Simulate "Controlled" check for .ccts
        if (filename.endsWith(".ccts")) {
            this.append(`[KERNEL] Verifying signature for Controlled Source...`);
            this.append(`[KERNEL] SIGNATURE VALID. Executing with Ring-0 privileges.`);
        } else {
            this.append(`[KERNEL] Executing Core Translated Source...`);
        }

        // Use the existing ScriptSystem logic
        const result = ScriptSystem.execute({ content });

        if (result.success) {
            // Append the output lines
            const outputLines = result.message.split('\n');
            outputLines.forEach(l => this.append(l));
        } else {
            this.append(`SEGMENTATION FAULT: ${result.message}`);
        }

        this.append(""); // Spacer
    }

    append(text) {
        const lines = text.split('\n');
        lines.forEach(l => {
            this.lines.push(l);
            if (this.lines.length > this.maxLines) this.lines.shift();
        });
        // Flag to force scroll to bottom on next render
        this.scrollToBottom = true;
    }

    // --- INPUT HANDLING ---
    handleKey(e) {
        if (this.hackState.mode !== "IDLE") {
            if (e.key === "c" && e.ctrlKey) {
                this.hackState.mode = "IDLE";
                this.append("^C [Process Terminated]");
            }
            return;
        }

        if (e.key === "Backspace") {
            this.input = this.input.slice(0, -1);
        } else if (e.key === "Enter") {
            const cmd = this.input.trim();
            if (cmd) {
                this.commandHistory.push(cmd);
                this.historyIndex = this.commandHistory.length;
                this.runCommand(cmd);
            } else {
                this.append(this.getPrompt());
            }
            this.input = "";
        } else if (e.key === "ArrowUp") {
            if (this.historyIndex > 0) {
                this.historyIndex--;
                this.input = this.commandHistory[this.historyIndex];
            }
        } else if (e.key === "ArrowDown") {
            if (this.historyIndex < this.commandHistory.length - 1) {
                this.historyIndex++;
                this.input = this.commandHistory[this.historyIndex];
            } else {
                this.historyIndex = this.commandHistory.length;
                this.input = "";
            }
        } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
            this.input += e.key;
        }
    }

    getPrompt() {
        return `root@centeros:${this.currentDir.getPath()}$`;
    }

    runCommand(rawCmd) {
        this.append(`${this.getPrompt()} ${rawCmd}`);
        const parts = rawCmd.split(/\s+/);
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);

        switch (cmd) {
            case "help": this.showHelp(); break;
            case "clear": this.lines = []; this.scrollY = 0; break;
            case "ls": this.cmdLs(); break;
            case "cd": this.cmdCd(args[0]); break;
            case "cat": this.cmdCat(args[0]); break;
            case "rm": this.cmdRm(args[0]); break;
            case "pwd": this.append(this.currentDir.getPath()); break;
            case "airodump": this.cmdAirodump(); break;
            case "aireplay": this.cmdAireplay(args); break;
            case "aircrack": this.cmdAircrack(args[0]); break;
            case "net": this.cmdNetWrapper(args); break;
            case "tel": this.cmdTel(args[0]); break;
            case "remote": this.cmdRemote(args); break;
            default: this.append(`bash: ${cmd}: command not found`);
        }
    }

    showHelp() {
        this.append("--- AIR-SUITE (WiFi Security) ---");
        this.append("  airodump       : Scan for networks (BSSID/CH/SIG)");
        this.append("  aireplay -b [BSSID] : Capture handshake from target");
        this.append("  aircrack [file]: Brute force captured .cap file");
        this.append("");
        this.append("--- FILESYSTEM ---");
        this.append("  ls, cd, cat, rm, pwd");
        this.append("");
        this.append("--- UTILS ---");
        this.append("  tel [IMEI]     : Sim database lookup");
        this.append("  remote [cmd]   : Botnet controller");
        this.append("  clear           : Clear terminal");
    }

    // ==========================================
    // LOGIC & COMMANDS
    // ==========================================

    cmdAirodump() {
        this.append(" CH  ESSID                BSSID              PWR  ENC  AUTH");
        this.append(" --  -------------------  -----------------  ---  ---  ----");
        for (const net of networkManager.networks) {
            const pwr = net.strength * 30 + Math.floor(Math.random() * 10);
            const enc = `WPA${net.wpa}`;
            const bssid = this.formatBSSID(net.address);
            const known = networkManager.isKnown(net.id) ? "(Open)" : "PSK";
            const ssid = net.ssid.padEnd(20).substring(0, 20);
            this.append(` ${net.wpa.toString().padEnd(3)} ${ssid} ${bssid}  -${pwr}  ${enc}  ${known}`);
        }
    }

    cmdAireplay(args) {
        if (args[0] !== "-b" || !args[1]) {
            this.append("Usage: aireplay -b [BSSID]");
            return;
        }
        const bssidInput = args[1].replace(/:/g, "").toUpperCase();
        const target = networkManager.networks.find(n => n.address.toUpperCase() === bssidInput);
        if (!target) { this.append(`Error: BSSID ${args[1]} not found.`); return; }
        if (networkManager.isKnown(target.id)) { this.append("Target already compromised."); return; }
        const libReq = `wp${target.wpa}`;
        if (!state.libs[libReq]) { this.append(`Error: Missing kernel module ${libReq}.`); return; }

        this.hackState.mode = "CAPTURING";
        this.hackState.targetNet = target;
        this.hackState.packets = 0;
        this.hackState.ivs = 0;
        this.hackState.handshakeProgress = 0;
        this.append(`[aireplay-ng] Waiting for beacon frame (BSSID: ${args[1]})...`);
        this.append(`[aireplay-ng] Sending DeAuth packets to broadcast...`);
        this.append("Press Ctrl+C to stop.");
    }

    cmdAircrack(filename) {
        if (!filename) { this.append("Usage: aircrack [file.cap]"); return; }
        const file = this.currentDir.children.find(f => f.name === filename);
        if (!file) { this.append(`Error: ${filename} not found.`); return; }
        if (!file.name.endsWith(".cap")) { this.append("Error: Invalid file format."); return; }
        const parts = file.content.split('_');
        const netId = parts[3];
        if (!netId) { this.append("Error: Corrupted capture."); return; }
        const net = networkManager.getNetworkById(netId);
        if (!net) { this.append("Error: Network reset."); return; }

        this.hackState.mode = "CRACKING";
        this.hackState.targetNet = net;
        this.hackState.crackProgress = 0;
        this.hackState.dictionaryLine = 0;
        this.append(`Opening ${filename}...`);
        this.append(`Reading packets... 100%`);
        this.append(`Target: ${net.ssid} (WPA${net.wpa})`);
        this.append(`Starting dictionary attack (rockyou.txt)...`);
    }

    update(dt) {
        if (this.hackState.mode === "CAPTURING") {
            this.updateCapture(dt);
        } else if (this.hackState.mode === "CRACKING") {
            this.updateCrack(dt);
        }
    }

    updateCapture(dt) {
        this.hackState.packets += Math.floor(Math.random() * 50);
        this.hackState.logTimer += dt;
        if (this.hackState.logTimer > 0.5) {
            this.hackState.logTimer = 0;
            this.hackState.ivs += Math.floor(Math.random() * 5);
        }
        const speed = 15 / this.hackState.targetNet.wpa;
        this.hackState.handshakeProgress += speed * dt;
        this.statusLine = `[CH 6] [ Elapsed: ${Math.floor(performance.now()/1000)}s ] [ Packets: ${this.hackState.packets} ] [ WPA Handshake: ${Math.floor(this.hackState.handshakeProgress)}% ]`;

        if (this.hackState.handshakeProgress >= 100) {
            this.hackState.mode = "IDLE";
            this.statusLine = "";
            this.append("");
            this.append(`[+] WPA Handshake captured: ${this.hackState.targetNet.address}`);
            const fileName = `${this.hackState.targetNet.ssid.replace(/\s/g, '_')}.cap`;
            const fileContent = `HANDSHAKE_WPA${this.hackState.targetNet.wpa}_${this.hackState.targetNet.address}_${this.hackState.targetNet.id}`;
            const existing = this.currentDir.children.find(f => f.name === fileName);
            if (!existing) {
                this.currentDir.addFile(fileName, fileContent, "binary");
                this.append(`[+] Saved capture to ${this.currentDir.getPath()}/${fileName}`);
            } else {
                this.append(`[!] Overwrote ${fileName}`);
            }
        }
    }

    updateCrack(dt) {
        const net = this.hackState.targetNet;
        this.hackState.logTimer += dt;
        if (this.hackState.logTimer > 0.1) {
            this.hackState.logTimer = 0;
            const randPass = this.dictionary[Math.floor(Math.random() * this.dictionary.length)] + Math.floor(Math.random()*999);
            this.append(`Testing: ${randPass}`);
        }
        const difficulty = net.wpa * 2;
        this.hackState.crackProgress += dt * (10 / difficulty);
        this.statusLine = `[ Aircrack-ng ] [ Keys: ${Math.floor(this.hackState.crackProgress * 100)} tested ] [ Time left: ${Math.floor(5 - this.hackState.crackProgress)}s ]`;

        if (this.hackState.crackProgress >= 5.0) {
            this.hackState.mode = "IDLE";
            this.statusLine = "";
            this.append("");
            this.append("KEY FOUND! [ " + net.password + " ]");
            this.append("Decrypted Master Key stored in keyring.");
            networkManager.markKnown(net.id);
            state.eightcoin += (net.wpa * 1.5);
        }
    }

    formatBSSID(hex) { return hex.match(/.{1,2}/g).join(':'); }
    cmdLs() {
        if (!this.currentDir.children.length) { this.append("(empty)"); return; }
        const folders = this.currentDir.children.filter(c => c.type === 'folder').map(c => c.name + "/").join("  ");
        const files = this.currentDir.children.filter(c => c.type !== 'folder').map(c => c.name).join("  ");
        if(folders) this.append(folders);
        if(files) this.append(files);
    }
    cmdCd(path) {
        if (!path) return;
        if (path === "..") { if (this.currentDir.parent) this.currentDir = this.currentDir.parent; return; }
        if (path === "~") { this.currentDir = fs.home; return; }
        const target = this.currentDir.children.find(c => c.name === path && c.type === 'folder');
        if (target) this.currentDir = target;
        else this.append(`bash: cd: ${path}: No such file or directory`);
    }
    cmdCat(file) {
        const f = this.currentDir.children.find(c => c.name === file && c.type !== 'folder');
        if (!f) this.append(`cat: ${file}: No such file`);
        else if (f.isEncrypted) this.append("[Binary Data Encrypted]");
        else this.append(f.content);
    }
    cmdRm(file) {
        const f = this.currentDir.children.find(c => c.name === file);
        if (f) { this.currentDir.deleteChild(f.id); this.append("File deleted."); }
        else this.append(`rm: cannot remove '${file}': No such file`);
    }
    cmdTel(imei) {
        if (!state.installedApps.includes("tel")) { this.append("Error: TelScanner not installed."); return; }
        this.append(`Querying IMEI: ${imei}...`);
        let found = null;
        for (const c of state.world.citizens) { if (c.devices.some(d => d.imei === imei)) { found = c; break; } }
        if (found) {
            this.append(`MATCH: ${found.name} ${found.surname}`);
            state.world.selectedCitizenId = found.id; state.world.selectedImei = imei;
        } else this.append("No record found.");
    }
    cmdRemote(args) {
        if (!state.remote.owned) { this.append("RemoteAccesser tool not found."); return; }
        if (args[0] === "status") {
            const net = networkManager.getNetworkById(state.remote.activeNetworkId);
            this.append(net ? `Mining Target: ${net.ssid}` : "Idle.");
        } else if (args[0] === "active" && args[1]) {
            const net = networkManager.getNetworkBySsid(args[1]);
            if(net && networkManager.isKnown(net.id)) { state.remote.activeNetworkId = net.id; this.append(`Target acquired: ${net.ssid}`); }
            else this.append("Network unknown or locked.");
        } else this.append("Usage: remote [status|active <ssid>]");
    }
    cmdNetWrapper(args) {
        if (args[0] === 'list') this.cmdAirodump();
        else if (args[0] === 'crack') this.append("Legacy command. Use: aircrack [file]");
        else if (args[0] === 'vpn') {
            const tier = parseInt(args[1]);
            if (isNaN(tier)) { this.append(`Active VPN Tier: ${state.vpn ? state.vpn.activeTier : 0}`); return; }
            if (state.vpn.tier < tier) { this.append("Error: Tier not purchased."); return; }
            state.vpn.activeTier = tier; this.append(`VPN Switched to Tier ${tier}.`);
        }
    }

    onCopy() {
        return this.input;
    }

    onPaste(text) {
        this.input += text;
    }

    // ==========================================
    // RENDER
    // ==========================================

    render(ctx, rect) {
        this.clear(ctx, rect, "#0c0c0c");
        ctx.save();
        ctx.translate(rect.x, rect.y);

        const font = "14px monospace";
        ctx.font = font;
        ctx.textBaseline = "top";
        ctx.textAlign = "left";

        // 1. Calculate Dimensions
        const totalContentH = (this.lines.length * this.lineHeight) + this.padding * 2;
        // Reserve space for Status Bar
        const bottomReserved = (this.statusLine ? this.statusHeight : 0) + this.inputHeight + 10;
        this.contentHeight = totalContentH + bottomReserved;

        // 2. Handle Auto-Scroll
        if (this.scrollToBottom) {
            // Calculate max scroll (content height - viewport height)
            const maxScroll = Math.max(0, this.contentHeight - rect.height);
            this.scrollY = maxScroll;
            this.scrollToBottom = false;
        }

        // 3. Render Output Lines
        // Optimization: Only render lines that are currently visible
        const startY = this.padding;

        // Find visible range to avoid drawing 1000 lines every frame
        const firstVisibleLine = Math.max(0, Math.floor((this.scrollY - startY) / this.lineHeight));
        const lastVisibleLine = Math.min(this.lines.length, Math.ceil((this.scrollY + rect.height) / this.lineHeight));

        for (let i = firstVisibleLine; i < lastVisibleLine; i++) {
            const l = this.lines[i];
            const y = startY + (i * this.lineHeight);

            // Color Coding
            if (l.includes("Error") || l.includes("fail") || l.includes("Corrupted")) ctx.fillStyle = "#ff5555";
            else if (l.includes("KEY FOUND") || l.includes("Success") || l.includes("MATCH")) ctx.fillStyle = "#55ff55";
            else if (l.includes("root@") || l.includes("admin@")) ctx.fillStyle = "#55aaff"; // Prompt
            else ctx.fillStyle = "#cccccc";

            ctx.fillText(l, 10, y);
        }

        // 4. Render Fixed UI (Status & Input)
        const viewBottom = rect.height + this.scrollY;

        // Status Line
        if (this.statusLine) {
            const statY = viewBottom - this.inputHeight - this.statusHeight - 10;
            ctx.fillStyle = "#333";
            ctx.fillRect(0, statY, rect.width, this.statusHeight);
            ctx.fillStyle = "#ffff55";
            ctx.fillText(this.statusLine, 10, statY + 4);
        }

        // Input Line
        const inputY = viewBottom - this.inputHeight - 5;

        // Background for input to cover text behind it
        ctx.fillStyle = "#0c0c0c";
        ctx.fillRect(0, inputY - 5, rect.width, this.inputHeight + 10);

        ctx.fillStyle = "#55aaff";
        const promptTxt = this.getPrompt() + " ";
        ctx.fillText(promptTxt, 10, inputY);
        const pw = ctx.measureText(promptTxt).width;

        ctx.fillStyle = "#fff";
        ctx.fillText(this.input, 10 + pw, inputY);

        // Blinking Caret
        if (this.hackState.mode === "IDLE" && Math.floor(Date.now() / 500) % 2 === 0) {
            const iw = ctx.measureText(this.input).width;
            ctx.fillRect(10 + pw + iw, inputY, 8, 14);
        }

        ctx.restore();
    }
}