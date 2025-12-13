import { BaseApp } from "../core/baseApp.js";
import { state } from "../state.js";
import { networkManager } from "../os/networkManager.js";
import { getOfficerById } from "../world/caseWorld.js";
import { fs } from "../os/fileSystem.js";
import { ScriptSystem } from "../systems/scriptSystem.js";
import { Compiler } from "../languages/compiler.js";

export class OneTerminal extends BaseApp {
    constructor(data) {
        super();
        this.lines = [
            { text: "CenterOS Unified Terminal v1.5 (Root)", color: "#ffffff" },
            { text: "Kernel: 5.4.0-center-generic x86_64", color: "#888888" },
            { text: "Type 'help' for available commands.", color: "#cccccc" },
            { text: "", color: "#fff" }
        ];
        this.input = "";
        this.maxLines = 300;
        this.commandHistory = [];
        this.historyIndex = -1;

        this.lineHeight = 18;
        this.padding = 10;
        this.inputHeight = 24;
        this.statusHeight = 24;
        this.scrollToBottom = true;

        this.currentDir = fs.home;

        this.process = {
            active: false,
            type: "IDLE",
            target: null,
            meta: null,
            progress: 0,
            timer: 0
        };

        if (data && data.content) {
            this.runScript(data);
        }
    }

    runScript(data) {
        const { content, filePath } = data;
        const filename = filePath ? filePath.split('/').pop() : "script.cts";
        this.log(`root@centeros:${this.currentDir.getPath()}$ ./` + filename, "#55aaff");

        if (filename.endsWith(".ccts")) {
            this.log(`[KERNEL] Verifying signature for Controlled Source...`, "#ffff55");
            this.log(`[KERNEL] SIGNATURE VALID. Ring-0 privileges granted.`, "#55ff55");
        } else {
            this.log(`[KERNEL] Executing Core Translated Source...`, "#cccccc");
        }

        const result = ScriptSystem.execute({ content });
        if (result.success) {
            const outputLines = result.message.split('\n');
            outputLines.forEach(l => this.log(l));
        } else {
            this.log(`SEGMENTATION FAULT: ${result.message}`, "#ff5555");
        }
        this.log("");
    }

    log(text, color = "#cccccc") {
        const lines = text.split('\n');
        lines.forEach(l => {
            this.lines.push({ text: l, color });
            if (this.lines.length > this.maxLines) this.lines.shift();
        });
        this.scrollToBottom = true;
    }

    handleKey(e) {
        if (this.process.active) {
            if (e.key === "c" && e.ctrlKey) {
                this.process.active = false;
                this.process.type = "IDLE";
                this.log("^C [Process Terminated]", "#ff5555");
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
                this.log(this.getPrompt(), "#55aaff");
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

    getPrompt() { return `root@centeros:${this.currentDir.getPath()}$`; }

    runCommand(rawCmd) {
        this.log(`${this.getPrompt()} ${rawCmd}`, "#55aaff");
        const parts = rawCmd.split(/\s+/);
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);

        if (cmd === "csc") {
            const filename = args[0];
            if (!filename) { this.log("Usage: csc <filename.src>", "#ffff55"); return; }
            this.runCompiler(filename);
            return;
        }

        const cleanName = cmd.replace(/^\.\//, "");
        const file = this.currentDir.children.find(f => f.name === cleanName);
        if (file && (file.extension === "cts" || file.extension === "ccts")) {
            this.runScript({ content: file.content, filePath: this.currentDir.getPath() + "/" + file.name });
            return;
        }

        switch (cmd) {
            case "help": this.cmdHelp(); break;
            case "clear": this.lines = []; this.scrollY = 0; break;
            case "ls": this.cmdLs(); break;
            case "cd": this.cmdCd(args[0]); break;
            case "cat": this.cmdCat(args[0]); break;
            case "rm": this.cmdRm(args[0]); break;
            case "pwd": this.log(this.currentDir.getPath()); break;

            case "airodump": this.cmdAirodump(); break;
            case "aireplay": this.cmdAireplay(args); break;
            case "aircrack": this.cmdAircrack(args[0]); break;

            case "intercept": this.cmdIntercept(args); break;
            case "decrypt": this.cmdDecrypt(args); break;
            case "inject": this.cmdInject(args); break;

            case "net": this.cmdNetWrapper(args); break;
            case "tel": this.cmdTel(args[0]); break;
            case "remote": this.cmdRemote(args); break;
            default: this.log(`bash: ${cmd}: command not found`, "#ff5555");
        }
    }

    runCompiler(filename) {
        const file = this.currentDir.children.find(f => f.name === filename);
        if (!file) { this.log(`Error: Source file '${filename}' not found.`, "#ff5555"); return; }
        this.log(`Compiling ${filename}...`, "#cccccc");
        const result = Compiler.compile(file.content);
        if (!result.success) {
            this.log("Compilation Failed:", "#ff5555");
            result.errors.forEach(e => this.log("  " + e, "#ff5555"));
            return;
        }
        const binaryObj = { sig: "CENTER_EXE", bytecode: result.bytecode };
        const newName = filename.replace(/\.(txt|src|js)$/, "") + ".cts";
        const old = this.currentDir.children.find(f => f.name === newName);
        if (old) this.currentDir.deleteChild(old.id);
        this.currentDir.addFile(newName, JSON.stringify(binaryObj), "binary");
        this.log(`Build successful: ${newName}`, "#55ff55");
    }

    cmdHelp() {
        const h = (c, d) => { this.log(c.padEnd(24) + ": " + d, "#cccccc"); };
        this.log("--- AIR-SUITE (802.11) ---", "#55aaff");
        h("airodump", "Scan for wireless networks");
        h("aireplay -b [BSSID]", "Packet injection / Capture");
        h("aircrack [FILE]", "Brute force WPA handshake");
        this.log("");
        this.log("--- SIGINT (POLICE) ---", "#55aaff");
        h("intercept [ID]", "Intercept officer AuthLink");
        h("decrypt [BLOB]", "Decrypt captured session");
        h("inject [BLOB]", "Inject token to DB");
        this.log("");
        this.log("--- UTILS ---", "#55aaff");
        h("csc [FILE]", "Compile CenterScript source");
        h("tel [IMEI]", "Query IMEI database");
        h("remote [CMD]", "Botnet control interface");
    }

    cmdIntercept(args) {
        if (!args[0]) { this.log("Usage: intercept [OFFICER_ID]", "#ffff55"); return; }
        const policeId = args[0].toUpperCase();
        const officer = getOfficerById(policeId);

        if (!officer) { this.log(`Error: Signal ID ${policeId} not found in range.`, "#ff5555"); return; }

        const currentNet = networkManager.getConnectedNetwork();
        if (!currentNet || currentNet.ssid !== officer.wifiSsid) {
            this.log(`Error: Handshake requires connection to ${officer.wifiSsid}.`, "#ff5555");
            return;
        }

        const t = state.time.minutes;
        if (t < officer.dutyStartMin || t >= officer.dutyEndMin) {
            this.log(`Error: Signal dormant. Officer OFF DUTY.`, "#ff5555");
            return;
        }

        if (!state.libs.wp2) { this.log(`Error: Missing libwp2 (WPA2-Enterprise Module).`, "#ff5555"); return; }

        this.process.active = true;
        this.process.type = "INTERCEPT";
        this.process.target = officer;
        this.process.progress = 0;
        this.process.meta = { packets: 0, signal: -40 - Math.floor(Math.random() * 20) };
        this.log(`[SIGINT] Locking onto frequency...`, "#ffff55");
        this.log(`[SIGINT] Stream initiated. Recording...`, "#cccccc");
    }

    cmdDecrypt(args) {
        if (!args[0]) { this.log("Usage: decrypt [BLOB_STRING]", "#ffff55"); return; }
        if (!args[0].startsWith("DATA-")) { this.log("Error: Invalid blob signature.", "#ff5555"); return; }

        this.process.active = true;
        this.process.type = "DECRYPT";
        this.process.meta = { blob: args[0] };
        this.process.progress = 0;
        this.log(`[CRYPTO] Loading KDF tables...`, "#cccccc");
        this.log(`[CRYPTO] Processing ${args[0]}...`, "#cccccc");
    }

    cmdInject(args) {
        if (!args[0]) { this.log("Usage: inject [BLOB]", "#ffff55"); return; }
        this.log("Initiating AuthLink Protocol...", "#55aaff");

        if (!this.process.target) {
            this.log("Error: No active target context. Intercept first.", "#ff5555");
            return;
        }

        const event = new CustomEvent("centeros-open-auth", {
            detail: { policeId: this.process.target.id }
        });
        window.dispatchEvent(event);
    }

    cmdAirodump() {
        this.log(" CH  ESSID                BSSID              PWR  ENC  AUTH", "#ffffff");
        this.log(" --  -------------------  -----------------  ---  ---  ----", "#888888");
        for (const net of networkManager.networks) {
            const pwr = net.strength * 30 + Math.floor(Math.random() * 10);
            const enc = `WPA${net.wpa}`;
            const bssid = this.formatBSSID(net.address);
            const known = networkManager.isKnown(net.id) ? "(Open)" : "PSK";
            const ssid = net.ssid.padEnd(20).substring(0, 20);
            this.log(` ${net.wpa.toString().padEnd(3)} ${ssid} ${bssid}  -${pwr}  ${enc}  ${known}`, "#cccccc");
        }
    }

    cmdAireplay(args) {
        if (args[0] !== "-b" || !args[1]) { this.log("Usage: aireplay -b [BSSID]", "#ffff55"); return; }
        const bssidInput = args[1].replace(/:/g, "").toUpperCase();
        const target = networkManager.networks.find(n => n.address.toUpperCase() === bssidInput);

        if (!target) { this.log(`Error: BSSID ${args[1]} out of range.`, "#ff5555"); return; }
        if (networkManager.isKnown(target.id)) { this.log("Target is already compromised.", "#ffff55"); return; }

        const libReq = `wp${target.wpa}`;
        if (!state.libs[libReq]) { this.log(`Error: Kernel module ${libReq} missing.`, "#ff5555"); return; }

        this.process.active = true;
        this.process.type = "CAPTURE";
        this.process.target = target;
        this.process.progress = 0;
        this.process.meta = { ivs: 0, beacons: 0 };
        this.log(`[aireplay-ng] Listening on channel 6...`, "#cccccc");
        this.log(`[aireplay-ng] Sending DeAuth to broadcast...`, "#cccccc");
    }

    cmdAircrack(filename) {
        if (!filename) { this.log("Usage: aircrack [file.cap]", "#ffff55"); return; }
        const file = this.currentDir.children.find(f => f.name === filename);
        if (!file) { this.log(`Error: ${filename} not found.`, "#ff5555"); return; }

        const parts = file.content.split('_');
        const netId = parts[3];
        const net = networkManager.getNetworkById(netId);

        if (!net) { this.log("Error: Capture file corrupted or expired.", "#ff5555"); return; }

        this.process.active = true;
        this.process.type = "CRACK";
        this.process.target = net;
        this.process.progress = 0;
        this.process.meta = { keys: 0 };
        this.log(`Opening ${filename}...`, "#cccccc");
        this.log(`Target: ${net.ssid} (WPA${net.wpa})`, "#cccccc");
        this.log(`Starting dictionary attack using rockyou.txt...`, "#cccccc");
    }

    update(dt) {
        if (!this.process.active) return;

        if (this.process.type === "CAPTURE") {
            const speed = 15 / this.process.target.wpa;
            this.process.progress += speed * dt;
            this.process.meta.ivs += Math.floor(Math.random() * 20);
            this.process.meta.beacons += Math.floor(Math.random() * 5);

            if (this.process.progress >= 100) {
                this.process.active = false;
                this.log(`[+] WPA Handshake captured!`, "#55ff55");
                const fName = `${this.process.target.ssid.replace(/\s/g, '_')}.cap`;
                const content = `HANDSHAKE_WPA_${this.process.target.address}_${this.process.target.id}`;
                this.currentDir.addFile(fName, content, "binary");
                this.log(`[+] Saved to ${fName}`, "#ffffff");
            }
        }
        else if (this.process.type === "CRACK") {
            const diff = this.process.target.wpa * 2;
            this.process.progress += dt * (10 / diff);
            this.process.meta.keys += Math.floor(Math.random() * 1000);

            if (this.process.progress >= 100) {
                this.process.active = false;
                this.log(`KEY FOUND! [ ${this.process.target.password} ]`, "#55ff55");
                networkManager.markKnown(this.process.target.id);
                state.eightcoin += 2;
            }
        }
        else if (this.process.type === "INTERCEPT") {
            this.process.progress += dt * 15;
            this.process.meta.packets = Math.floor(this.process.progress * 42);

            if (this.process.progress >= 100) {
                this.process.active = false;
                const blob = "DATA-" + Math.floor(Math.random() * 89999 + 10000);
                this.log(`[+] Stream captured successfully.`, "#55ff55");
                this.log(`[+] Session Blob: ${blob}`, "#ffffff");
                this.log(`Hint: Use 'decrypt ${blob}'`, "#888888");
            }
        }
        else if (this.process.type === "DECRYPT") {
            this.process.progress += dt * 20;

            if (this.process.progress >= 100) {
                this.process.active = false;
                this.log(`[+] Decryption Complete.`, "#55ff55");
                this.log(`[+] Token Validated.`, "#55ff55");
                this.log(`Hint: Use 'inject ${this.process.meta.blob}'`, "#888888");
            }
        }
    }

    getMemoryUsage() { return 15 + (this.process.active ? 60 : 0); }
    getCpuUsage() {
        if (["CRACK", "DECRYPT"].includes(this.process.type)) return 85;
        if (["CAPTURE", "INTERCEPT"].includes(this.process.type)) return 15;
        return 2;
    }

    formatBSSID(hex) { return hex.match(/.{1,2}/g).join(':'); }

    cmdLs() {
        if (!this.currentDir.children.length) { this.log("(empty)", "#555"); return; }
        const folders = this.currentDir.children.filter(c => c.type === 'folder').map(c => c.name + "/").join("  ");
        const files = this.currentDir.children.filter(c => c.type !== 'folder').map(c => c.name).join("  ");
        if(folders) this.log(folders, "#55aaff");
        if(files) this.log(files, "#ffffff");
    }

    cmdCd(path) {
        if (!path) return;
        if (path === "..") { if (this.currentDir.parent) this.currentDir = this.currentDir.parent; return; }
        if (path === "~") { this.currentDir = fs.home; return; }
        const target = this.currentDir.children.find(c => c.name === path && c.type === 'folder');
        if (target) this.currentDir = target;
        else this.log(`bash: cd: ${path}: No such file or directory`, "#ff5555");
    }

    cmdCat(file) {
        const f = this.currentDir.children.find(c => c.name === file && c.type !== 'folder');
        if (!f) this.log(`cat: ${file}: No such file`, "#ff5555");
        else if (f.isEncrypted) this.log("[Binary Data Encrypted]", "#ff5555");
        else this.log(f.content, "#cccccc");
    }

    cmdRm(file) {
        const f = this.currentDir.children.find(c => c.name === file);
        if (f) { this.currentDir.deleteChild(f.id); this.log("File deleted.", "#cccccc"); }
        else this.log(`rm: cannot remove '${file}': No such file`, "#ff5555");
    }

    cmdTel(imei) {
        if (!state.installedApps.includes("tel")) { this.log("Error: TelScanner not installed.", "#ff5555"); return; }
        this.log(`Querying IMEI: ${imei}...`, "#cccccc");
        let found = null;
        for (const c of state.world.citizens) { if (c.devices.some(d => d.imei === imei)) { found = c; break; } }
        if (found) {
            this.log(`MATCH: ${found.name} ${found.surname}`, "#55ff55");
            state.world.selectedCitizenId = found.id; state.world.selectedImei = imei;
        } else this.log("No record found.", "#ff5555");
    }

    cmdRemote(args) {
        if (!state.remote.owned) { this.log("RemoteAccesser tool not found.", "#ff5555"); return; }
        if (args[0] === "status") {
            const net = networkManager.getNetworkById(state.remote.activeNetworkId);
            this.log(net ? `Mining Target: ${net.ssid}` : "Idle.", "#ffff55");
        } else if (args[0] === "active" && args[1]) {
            const net = networkManager.getNetworkBySsid(args[1]);
            if(net && networkManager.isKnown(net.id)) { state.remote.activeNetworkId = net.id; this.log(`Target acquired: ${net.ssid}`, "#55ff55"); }
            else this.log("Network unknown or locked.", "#ff5555");
        } else this.log("Usage: remote [status|active <ssid>]", "#cccccc");
    }

    cmdNetWrapper(args) {
        if (args[0] === 'list') this.cmdAirodump();
        else if (args[0] === 'vpn') {
            const tier = parseInt(args[1]);
            if (isNaN(tier)) { this.log(`Active VPN Tier: ${state.vpn ? state.vpn.activeTier : 0}`, "#cccccc"); return; }
            if (state.vpn.tier < tier) { this.log("Error: Tier not purchased.", "#ff5555"); return; }
            state.vpn.activeTier = tier; this.log(`VPN Switched to Tier ${tier}.`, "#55ff55");
        }
    }

    onCopy() { return this.input; }
    onPaste(text) { this.input += text; }

    render(ctx, rect) {
        this.clear(ctx, rect, "#0c0c0c");
        ctx.save();
        ctx.translate(rect.x, rect.y);

        ctx.font = "14px monospace";
        ctx.textBaseline = "top";
        ctx.textAlign = "left";

        const totalContentH = (this.lines.length * this.lineHeight) + this.padding * 2;
        const bottomReserved = (this.process.active ? this.statusHeight : 0) + this.inputHeight + 10;
        this.contentHeight = totalContentH + bottomReserved;

        if (this.scrollToBottom) {
            const maxScroll = Math.max(0, this.contentHeight - rect.height);
            this.scrollY = maxScroll;
            this.scrollToBottom = false;
        }

        const startY = this.padding;
        const firstVisibleLine = Math.max(0, Math.floor((this.scrollY - startY) / this.lineHeight));
        const lastVisibleLine = Math.min(this.lines.length, Math.ceil((this.scrollY + rect.height) / this.lineHeight));

        for (let i = firstVisibleLine; i < lastVisibleLine; i++) {
            const l = this.lines[i];
            const y = startY + (i * this.lineHeight);
            ctx.fillStyle = l.color || "#cccccc";
            ctx.fillText(l.text, 10, y);
        }

        const viewBottom = rect.height + this.scrollY;

        if (this.process.active) {
            const statY = viewBottom - this.inputHeight - this.statusHeight - 10;
            ctx.fillStyle = "#222222";
            ctx.fillRect(0, statY, rect.width, this.statusHeight);

            let statusText = "";
            const p = this.process;
            if (p.type === "CAPTURE") statusText = `[ CH 11 ] [ Beacons: ${p.meta.beacons} ] [ IVS: ${p.meta.ivs} ] [ Handshake: ${Math.floor(p.progress)}% ]`;
            else if (p.type === "CRACK") statusText = `[ AIRCRACK-NG ] [ Tested: ${p.meta.keys} ] [ Remaining: ${Math.floor(100 - p.progress)}% ]`;
            else if (p.type === "INTERCEPT") statusText = `[ SIGINT ] [ RSSI: ${Math.floor(p.meta.signal)}dBm ] [ BUFFER: ${Math.floor(p.progress)}% ]`;
            else if (p.type === "DECRYPT") statusText = `[ KDF-SHA256 ] [ CYCLES: ${Math.floor(p.progress * 12)}k ] [ DECRYPTING... ]`;

            ctx.fillStyle = "#ffff55";
            ctx.fillText(statusText, 10, statY + 4);

            ctx.fillStyle = "#444";
            ctx.fillRect(rect.width - 110, statY + 6, 100, 12);
            ctx.fillStyle = "#55ff55";
            ctx.fillRect(rect.width - 110, statY + 6, p.progress, 12);
        }

        const inputY = viewBottom - this.inputHeight - 5;
        ctx.fillStyle = "#0c0c0c"; ctx.fillRect(0, inputY - 5, rect.width, this.inputHeight + 10);

        ctx.fillStyle = "#55aaff"; const promptTxt = this.getPrompt() + " ";
        ctx.fillText(promptTxt, 10, inputY);

        const pw = ctx.measureText(promptTxt).width;
        ctx.fillStyle = "#fff"; ctx.fillText(this.input, 10 + pw, inputY);

        if (!this.process.active && Math.floor(Date.now() / 500) % 2 === 0) {
            const iw = ctx.measureText(this.input).width;
            ctx.fillRect(10 + pw + iw, inputY, 8, 14);
        }
        ctx.restore();
    }
}