import { state } from "../state.js";
import { networkManager } from "../os/networkManager.js";
import { BaseApp } from "../core/baseApp.js";

export class EightminerApp extends BaseApp {
    constructor() {
        super();
        this.message = "";
    }

    handleClick(globalX, globalY, contentRect) {
        if (!state.miner.owned) return;
        const { x, y } = this.getLocalCoords(globalX, globalY, contentRect);

        if (this.isInside(x, y, 16, 110, 140, 28)) {
            state.miner.running = !state.miner.running;
            this.message = state.miner.running ? "Miner started." : "Miner stopped.";
        }
    }

    render(ctx, rect) {
        this.clear(ctx, rect, "#15171d");
        ctx.save();
        ctx.translate(rect.x, rect.y);

        ctx.font = "14px system-ui";
        ctx.textBaseline = "top";
        ctx.textAlign = "left";
        ctx.fillStyle = "#ffcc66";
        ctx.fillText("Eightminer", 16, 16);
        ctx.font = "12px system-ui";
        ctx.fillStyle = "#bbbbbb";

        if (!state.miner.owned) {
            ctx.fillText("Not installed. Purchase in Market.", 16, 48);
            ctx.restore();
            return;
        }

        const net = networkManager.getConnectedNetwork();
        ctx.fillText(`Connected network: ${net ? net.ssid : "None"}`, 16, 68);
        ctx.fillText("Generates E€E while running. Raises Heat.", 16, 86);

        const active = state.miner.running && !!net;
        const btnX = 16, btnY = 110, btnW = 140, btnH = 28;

        ctx.fillStyle = !net ? "#333" : active ? "#2d7a3e" : "#444bff";
        ctx.fillRect(btnX, btnY, btnW, btnH);

        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText(!net ? "No Wi-Fi" : active ? "Stop mining" : "Start mining", btnX + btnW / 2, btnY + 8);

        if (this.message) {
            ctx.textAlign = "left";
            ctx.fillStyle = "#ff9966";
            ctx.fillText(this.message, 16, rect.height - 40);
        }
        ctx.restore();
    }
}