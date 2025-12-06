import { networkManager } from "../os/networkManager.js";
import { state } from "../state.js";
import { getOfficerById } from "../world/caseWorld.js";

export class NetHackerApp {
    constructor() {
        this.lines = [
            "NetHacker v3.0",
            "Type: help",
            ""
        ];
        this.input = "";
        this.maxLines = 150;

        this.currentCrack = null;
        this.statusLine = "";

        this.policeHack = {
            targetPoliceId: null,
            pendingCode: null,
            cracked: false,
            timer: 0,
            duration: 0
        };
    }

    append(line = "") {
        this.lines.push(line);
        if (this.lines.length > this.maxLines) {
            this.lines.shift();
        }
    }

    handleKey(e) {
        if (e.key === "Backspace") {
            this.input = this.input.slice(0, -1);
            e.preventDefault();
        } else if (e.key === "Enter") {
            const cmd = this.input.trim();
            if (cmd.length > 0) {
                this.runCommand(cmd);
            }
            this.input = "";
            e.preventDefault();
        } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            this.input += e.key;
            e.preventDefault();
        }
    }

    runCommand(cmd) {
        this.append("> " + cmd);

        if (/^help$/i.test(cmd)) {
            this.append("Standard Commands:");
            this.append("  list                   - Show networks");
            this.append('  address "SSID" get     - Get address for WiFi');
            this.append('  crack "ADDRESS"        - Crack standard WiFi');
            this.append("");
            this.append("Police Commands:");
            this.append("  get code [COP_ID]      - Intercept handshake");
            this.append("  crack [BLOB]           - Decrypt handshake");
            this.append("  inject [BLOB] poldb    - Inject to auth server");
            this.append("");
            this.append("Network Stack:");
            this.append("  stack status           - Show router/VPN summary");
            this.append("  router on|off          - Toggle AroundRouter (if installed)");
            this.append("  vpn status             - Show VPN tiers and connection");
            this.append("  vpn use [0-4]          - Set active VPN chain (0 = off)");
            this.append("");
            return;
        }

        if (/^list$/i.test(cmd)) {
            this.append("Available networks:");
            for (const net of networkManager.networks) {
                const known = networkManager.isKnown(net.id) ? "[KNOWN]" : "[LOCKED]";
                this.append(`  - ${net.ssid}  [WPA${net.wpa}]  ${known}`);
            }
            this.append("");
            return;
        }

        const addrMatch = cmd.match(/^address\s+"([^"]+)"\s+get$/i);
        if (addrMatch) {
            const ssid = addrMatch[1];
            const net = networkManager.getNetworkBySsid(ssid);
            if (!net) {
                this.append(`No network found with SSID "${ssid}".`);
            } else {
                this.append(`Address for "${ssid}": 0x${net.address}`);
            }
            this.append("");
            return;
        }

        // Helper: make sure state.vpn / state.router exist so we don't crash
        if (!state.vpn) {
            state.vpn = { tier: 0, activeTier: 0, uptimeSeconds: 0 };
        }
        if (!state.router) {
            state.router = { owned: false, active: false };
        }

        const stackStatusMatch = cmd.match(/^stack\s+status$/i);
        if (stackStatusMatch) {
            const installedTier = state.vpn.tier || 0;
            const activeTier = state.vpn.activeTier || 0;
            const routerOwned = !!state.router.owned;
            const routerActive = !!state.router.active;

            this.append("Network Stack Status:");
            this.append(`  AroundRouter: ${routerOwned ? (routerActive ? "ACTIVE" : "installed, OFF") : "NOT INSTALLED"}`);
            this.append(`  VPN installed tier: ${installedTier}`);
            this.append(`  VPN active chain: ${activeTier > 0 ? "Tier " + activeTier : "DISCONNECTED"}`);

            // crude risk hint
            let riskScore = 1.0;
            if (!routerActive) riskScore *= 1.3;
            if (activeTier === 0) riskScore *= 1.4;
            else if (activeTier === 1) riskScore *= 1.1;
            else if (activeTier === 2) riskScore *= 0.9;
            else if (activeTier === 3) riskScore *= 0.7;
            else if (activeTier >= 4) riskScore *= 0.5;

            let label = "UNKNOWN";
            if (riskScore >= 1.3) label = "SEVERE";
            else if (riskScore >= 1.0) label = "HIGH";
            else if (riskScore >= 0.75) label = "ELEVATED";
            else label = "LOW";

            this.append(`  Estimated trench profile: ${label}`);
            this.append("");
            return;
        }

        const routerMatch = cmd.match(/^router\s+(on|off)$/i);
        if (routerMatch) {
            const mode = routerMatch[1].toLowerCase();
            if (!state.router.owned) {
                this.append("Error: AroundRouter not installed. Check Underworld.");
                return;
            }
            if (mode === "on") {
                state.router.active = true;
                this.statusLine = "AroundRouter path locked in.";
                this.append("AroundRouter: ACTIVE.");
            } else {
                state.router.active = false;
                this.statusLine = "AroundRouter disabled.";
                this.append("AroundRouter: OFF.");
            }
            this.append("");
            return;
        }

        if (/^vpn\s+status$/i.test(cmd)) {
            const installedTier = state.vpn.tier || 0;
            const activeTier = state.vpn.activeTier || 0;
            const up = state.vpn.uptimeSeconds || 0;

            this.append("VPN Status:");
            this.append(`  Installed max tier: ${installedTier}`);
            this.append(`  Active chain: ${activeTier > 0 ? "Tier " + activeTier : "DISCONNECTED"}`);
            this.append(`  Uptime (approx): ${up.toFixed(1)}s`);
            this.append("");
            return;
        }

        const vpnUseMatch = cmd.match(/^vpn\s+use\s+(\d)$/i);
        if (vpnUseMatch) {
            const desired = parseInt(vpnUseMatch[1], 10);
            const installedTier = state.vpn.tier || 0;

            if (desired === 0) {
                state.vpn.activeTier = 0;
                state.vpn.uptimeSeconds = 0;
                this.statusLine = "VPN chain disconnected.";
                this.append("VPN: disconnected.");
                this.append("");
                return;
            }

            if (desired < 0 || desired > 4) {
                this.append("Error: VPN tier must be between 0 and 4.");
                return;
            }
            if (installedTier < desired) {
                this.append(`Error: Highest purchased tier is ${installedTier}.`);
                this.append("Use Underworld to buy higher VPN tiers.");
                return;
            }

            state.vpn.activeTier = desired;
            state.vpn.uptimeSeconds = 0;
            this.statusLine = `VPN tier ${desired} chain active.`;
            this.append(`VPN: connected to tier ${desired} chain.`);
            this.append("");
            return;
        }

        const getMatch = cmd.match(/^get\s+code\s+(.+)$/i);
        if (getMatch) {
            const policeId = getMatch[1].toUpperCase();
            const officer = getOfficerById(policeId);

            if (!officer) {
                this.append(`Error: Officer ${policeId} not found.`);
                return;
            }
            const currentNet = networkManager.getConnectedNetwork();
            if (!currentNet || currentNet.ssid !== officer.wifiSsid) {
                this.append(`Error: Must be connected to ${officer.wifiSsid}.`);
                return;
            }
            const t = state.time.minutes;
            if (t < officer.dutyStartMin || t >= officer.dutyEndMin) {
                this.append(`Error: Signal dead. Officer is OFF DUTY.`);
                return;
            }
            if (!state.libs.wp2) {
                this.append(`Error: libwp2 required for police handshake.`);
                return;
            }

            const blob = "DATA-" + Math.floor(Math.random()*9999);
            this.policeHack = {
                targetPoliceId: policeId,
                pendingCode: blob,
                cracked: false,
                timer: 0,
                duration: 0
            };
            this.append(`Handshake captured for ${policeId}.`);
            this.append(`Session Blob: ${blob}`);
            return;
        }

        const injectMatch = cmd.match(/^inject\s+(.+)\s+poldb$/i);
        if (injectMatch) {
            const blob = injectMatch[1];
            if (blob !== this.policeHack.pendingCode || !this.policeHack.cracked) {
                this.append("Error: Blob not decrypted or invalid.");
                return;
            }
            this.append("Initiating AuthLink Protocol...");

            // Dispatch event to open minigame
            const event = new CustomEvent("centeros-open-auth", {
                detail: { policeId: this.policeHack.targetPoliceId }
            });
            window.dispatchEvent(event);

            this.policeHack = { targetPoliceId: null, pendingCode: null, cracked: false };
            return;
        }

        const crackMatch = cmd.match(/^crack\s+(.+)$/i);
        const crackMatchQuotes = cmd.match(/^crack\s+"([^"]+)"$/i);

        const arg = (crackMatchQuotes ? crackMatchQuotes[1] : (crackMatch ? crackMatch[1] : null));

        if (arg) {
            if (this.policeHack.pendingCode && arg === this.policeHack.pendingCode) {
                this.append("Decrypting handshake...");
                this.policeHack.duration = 4;
                this.policeHack.timer = 0;
                return;
            }

            const hex = arg.replace(/^0x/i, "");
            const net = networkManager.getNetworkByAddress(hex);

            if (!net) {
                this.append(`No network with address 0x${hex.toUpperCase()}.`);
                this.append("(Note: If this is a police blob, ensure you typed it exactly)");
                return;
            }

            if (networkManager.isKnown(net.id)) {
                this.append(`Already cracked ${net.ssid}. Password: ${net.password}`);
                return;
            }

            if (this.currentCrack) {
                this.append("Crack already in progress. Wait for it to finish.");
                return;
            }

            // Check libs
            const wpa = net.wpa || 1;
            const libKey = `wp${wpa}`;
            if (!state.libs[libKey]) {
                this.append(`Missing library ${libKey}. Purchase it in the Underworld Market.`);
                return;
            }

            // Setup Standard WiFi Crack
            const baseDuration = 3;
            const wpaMultiplier = 1 + (wpa - 1) * 1.5;
            const duration = baseDuration * wpaMultiplier;

            const baseTries = 50000;
            const speedMult = 1 + (wpa - 1) * 0.7;
            const triesPerSec = baseTries * speedMult;

            this.currentCrack = {
                netId: net.id,
                wpa,
                duration,
                elapsed: 0,
                triesPerSecond: triesPerSec,
                tries: 0
            };

            this.append(`Cracking 0x${net.address} (${net.ssid})...`);
            return;
        }

        this.append("Unknown command. Type 'help'.");
    }

    update(dt) {
        if (this.policeHack.duration > 0 && !this.policeHack.cracked) {
            this.policeHack.timer += dt;
            if (this.policeHack.timer >= this.policeHack.duration) {
                this.policeHack.cracked = true;
                this.policeHack.duration = 0;
                this.append(`Crack complete. Ready to inject.`);
            }
        }

        if (this.currentCrack) {
            const job = this.currentCrack;
            job.elapsed += dt;
            job.tries += job.triesPerSecond * dt;

            if (job.elapsed >= job.duration) {
                const net = networkManager.getNetworkById(job.netId);
                if (net && !networkManager.isKnown(net.id)) {
                    networkManager.markKnown(net.id);
                }

                this.append(`Password found for ${net.ssid}: ${net.password}`);
                this.append("Access key sold on black market. +1 E€E");
                state.eightcoin += 1;
                this.append("");
                this.currentCrack = null;
                this.statusLine = "";
            } else {
                this.statusLine =
                    `Cracking passwords (${Math.floor(job.tries)}) [WPA${job.wpa}]`;
            }
        }

        // VPN overuse tracking
        if (!state.vpn) {
            state.vpn = { tier: 0, activeTier: 0, uptimeSeconds: 0 };
        }

        if (state.vpn.activeTier && state.vpn.activeTier > 0) {
            state.vpn.uptimeSeconds = (state.vpn.uptimeSeconds || 0) + dt;

            // If user is sitting on VPN4 for a long time, the world gets nervous.
            if (state.vpn.activeTier >= 4 && state.vpn.uptimeSeconds > 20) {
                const oldHeat = state.policeHeat || 0;
                const newHeat = Math.min(100, oldHeat + dt * 0.3);
                state.policeHeat = newHeat;

                // Occasionally hint that something feels off
                if (Math.floor(oldHeat) !== Math.floor(newHeat)) {
                    this.statusLine = "VPN4 side-channel noise observed on upstream nodes.";
                }
            }
        } else {
            if (state.vpn) {
                state.vpn.uptimeSeconds = 0;
            }
        }
    }

    render(ctx, rect) {
        ctx.fillStyle = "#050910";
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

        ctx.font = "13px monospace";
        ctx.textBaseline = "top";
        ctx.textAlign = "left";
        ctx.fillStyle = "#d0f0ff";

        const lineHeight = 18;
        const maxLinesVisible = Math.floor((rect.height - 40) / lineHeight);
        const start = Math.max(0, this.lines.length - maxLinesVisible);

        for (let i = 0; i < maxLinesVisible; i++) {
            const line = this.lines[start + i];
            if (line === undefined) continue;
            const y = rect.y + 8 + i * lineHeight;
            ctx.fillText(line, rect.x + 8, y);
        }

        // Render status line
        if (this.statusLine) {
            const y = rect.y + rect.height - 40;
            ctx.fillStyle = "#80ff80";
            ctx.fillText(this.statusLine, rect.x + 8, y);
        }

        // Render police hack progress if active
        if (this.policeHack.duration > 0 && !this.policeHack.cracked) {
            const y = rect.y + rect.height - 40;
            const pct = Math.floor((this.policeHack.timer / this.policeHack.duration) * 100);
            ctx.fillStyle = "#ffcc00";
            ctx.fillText(`Decrypting Police Handshake... ${pct}%`, rect.x + 8, y);
        }

        const inputY = rect.y + rect.height - 20;
        ctx.fillStyle = "#ffffff";
        ctx.fillText("> " + this.input, rect.x + 8, inputY);

        const caretX = rect.x + 8 + ctx.measureText("> " + this.input).width + 2;
        ctx.fillRect(caretX, inputY, 8, 1);
    }
}