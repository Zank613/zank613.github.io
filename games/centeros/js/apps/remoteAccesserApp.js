import { state } from "../state.js";
import { networkManager } from "../os/networkManager.js";
import { BaseApp } from "../core/baseApp.js";

export class RemoteAccesserApp extends BaseApp {
    constructor() {
        super();
        this.lines = ["RemoteAccesser v0.1", "Type: help", ""];
        this.input = "";
        this.maxLines = 120;
    }

    append(line) { this.lines.push(line); if (this.lines.length > this.maxLines) this.lines.shift(); }

    handleKey(e) {
        if (!state.remote.owned) return;
        if (e.key === "Backspace") this.input = this.input.slice(0, -1);
        else if (e.key === "Enter") { if (this.input.trim()) this.runCommand(this.input.trim()); this.input = ""; }
        else if (e.key === "Escape") this.input = "";
        else if (e.key.length === 1 && !e.ctrlKey && !e.altKey) this.input += e.key;
    }

    runCommand(cmd) {
        this.append("> " + cmd);
        if (/^help$/i.test(cmd)) {
            this.append("Commands: active \"SSID\", off, status");
        } else if (/^status$/i.test(cmd)) {
            const net = networkManager.getNetworkById(state.remote.activeNetworkId);
            this.append(net ? `Target: ${net.ssid}` : "No active target.");
        } else if (/^off$/i.test(cmd)) {
            state.remote.activeNetworkId = null;
            this.append("Remote mining disabled.");
        } else {
            const match = cmd.match(/^active\s+"([^"]+)"$/i);
            if (match) {
                const net = networkManager.getNetworkBySsid(match[1]);
                if (net && networkManager.isKnown(net.id)) {
                    state.remote.activeNetworkId = net.id;
                    this.append(`Watchers assigned to "${net.ssid}".`);
                } else this.append("Network not found or not cracked.");
            } else {
                this.append("Unknown command.");
            }
        }
    }

    render(ctx, rect) {
        this.clear(ctx, rect, "#06070c");

        ctx.font = "13px monospace";
        ctx.textBaseline = "top";
        ctx.textAlign = "left";

        if (!state.remote.owned) {
            ctx.fillStyle = "#ffcccc";
            ctx.fillText("RemoteAccesser not installed.", rect.x + 16, rect.y + 32);
            return;
        }

        ctx.fillStyle = "#c0f0ff";
        const lh = 18;
        const maxLines = Math.floor((rect.height - 40) / lh);
        const start = Math.max(0, this.lines.length - maxLines);

        for (let i = 0; i < maxLines; i++) {
            const line = this.lines[start + i];
            if (line !== undefined) ctx.fillText(line, rect.x + 8, rect.y + 8 + i * lh);
        }

        const inputY = rect.y + rect.height - 20;
        ctx.fillStyle = "#ffffff";
        ctx.fillText("> " + this.input, rect.x + 8, inputY);
        ctx.fillRect(rect.x + 8 + ctx.measureText("> " + this.input).width + 2, inputY, 8, 1);
    }
}