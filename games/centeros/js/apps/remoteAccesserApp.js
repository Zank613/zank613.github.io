import { state } from "../state.js";
import { networkManager } from "../os/networkManager.js";

export class RemoteAccesserApp {
    constructor() {
        this.lines = [
            "RemoteAccesser v0.1",
            "Type: help",
            ""
        ];
        this.input = "";
        this.maxLines = 120;
    }

    append(line = "") {
        this.lines.push(line);
        if (this.lines.length > this.maxLines) {
            this.lines.shift();
        }
    }

    handleKey(e) {
        if (!state.remote.owned) {
            e.preventDefault();
            return;
        }

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
        } else if (e.key === "Escape") {
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
            this.append("Commands:");
            this.append('  active "SSID"  - assign watchers to a known network');
            this.append("  off            - disable remote mining");
            this.append("  status         - show current target");
            this.append("");
            return;
        }

        if (/^status$/i.test(cmd)) {
            if (!state.remote.owned) {
                this.append("RemoteAccesser not installed.");
            } else if (state.remote.activeNetworkId) {
                const net = networkManager.getNetworkById(state.remote.activeNetworkId);
                const name = net ? net.ssid : "(unknown)";
                this.append(`Active target: ${name}`);
            } else {
                this.append("No active remote target.");
            }
            this.append("");
            return;
        }

        if (/^off$/i.test(cmd)) {
            state.remote.activeNetworkId = null;
            this.append("Remote mining disabled.");
            this.append("");
            return;
        }

        const activeMatch = cmd.match(/^active\s+"([^"]+)"$/i);
        if (activeMatch) {
            const ssid = activeMatch[1];
            const net = networkManager.getNetworkBySsid(ssid);
            if (!net) {
                this.append(`No network found with SSID "${ssid}".`);
            } else if (!networkManager.isKnown(net.id)) {
                this.append(`No foothold on "${ssid}". Crack it first via NetHacker.`);
            } else {
                state.remote.activeNetworkId = net.id;
                this.append(`Remote watchers assigned to "${ssid}".`);
                this.append("They will send E€E every in-game hour.");
            }
            this.append("");
            return;
        }

        this.append("Unknown command. Type 'help'.");
        this.append("");
    }

    update(dt) {}

    render(ctx, rect) {
        ctx.fillStyle = "#06070c";
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

        ctx.font = "13px monospace";
        ctx.textBaseline = "top";
        ctx.textAlign = "left";

        if (!state.remote.owned) {
            ctx.fillStyle = "#ffcccc";
            ctx.fillText("RemoteAccesser not installed.", rect.x + 16, rect.y + 32);
            ctx.fillStyle = "#dddddd";
            ctx.fillText("Purchase in Underworld Market for 16 E€E.", rect.x + 16, rect.y + 52);
            return;
        }

        ctx.fillStyle = "#c0f0ff";

        const lineHeight = 18;
        const maxLinesVisible = Math.floor((rect.height - 40) / lineHeight);
        const start = Math.max(0, this.lines.length - maxLinesVisible);

        for (let i = 0; i < maxLinesVisible; i++) {
            const line = this.lines[start + i];
            if (line === undefined) continue;
            const y = rect.y + 8 + i * lineHeight;
            ctx.fillText(line, rect.x + 8, y);
        }

        const inputY = rect.y + rect.height - 20;
        ctx.fillStyle = "#ffffff";
        ctx.fillText("> " + this.input, rect.x + 8, inputY);

        const caretX = rect.x + 8 + ctx.measureText("> " + this.input).width + 2;
        ctx.fillRect(caretX, inputY, 8, 1);
    }
}