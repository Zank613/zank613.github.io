import { state } from "../state.js";
import { networkManager } from "../os/networkManager.js";

export class EightminerApp {
    constructor() {
        this.message = "";
    }

    handleClick(localX, localY, contentRect) {
        if (!state.miner.owned) {
            return;
        }

        const x = localX - contentRect.x;
        const y = localY - contentRect.y;

        const btnX = 16;
        const btnY = 110;
        const btnW = 140;
        const btnH = 28;

        if (x >= btnX && x <= btnX + btnW &&
            y >= btnY && y <= btnY + btnH) {
            state.miner.running = !state.miner.running;
            this.message = state.miner.running
                ? "Miner started."
                : "Miner stopped.";
        }
    }

    update(dt) {}

    render(ctx, rect) {
        ctx.save();
        ctx.translate(rect.x, rect.y);

        ctx.fillStyle = "#15171d";
        ctx.fillRect(0, 0, rect.width, rect.height);

        ctx.font = "14px system-ui";
        ctx.textBaseline = "top";
        ctx.textAlign = "left";

        ctx.fillStyle = "#ffcc66";
        ctx.fillText("Eightminer", 16, 16);

        ctx.font = "12px system-ui";
        ctx.fillStyle = "#bbbbbb";

        if (!state.miner.owned) {
            ctx.fillText("Not installed.", 16, 48);
            ctx.fillText("Purchase in Underworld Market for 1 E€E.", 16, 68);
            ctx.restore();
            return;
        }

        const net = networkManager.getConnectedNetwork();
        const ssid = net ? net.ssid : "None";

        ctx.fillText(`Installed: yes`, 16, 48);
        ctx.fillText(`Connected network: ${ssid}`, 16, 68);
        ctx.fillText("Generates E€E while running, but raises Heat.", 16, 86);

        const btnX = 16;
        const btnY = 110;
        const btnW = 140;
        const btnH = 28;

        const active = state.miner.running && !!net;
        const enabled = !!net;

        if (!enabled) {
            ctx.fillStyle = "#333333";
        } else if (active) {
            ctx.fillStyle = "#2d7a3e";
        } else {
            ctx.fillStyle = "#444bff";
        }
        ctx.fillRect(btnX, btnY, btnW, btnH);

        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        const label = !enabled
            ? "No Wi-Fi"
            : (active ? "Stop mining" : "Start mining");
        ctx.fillText(label, btnX + btnW / 2, btnY + 8);

        ctx.textAlign = "left";
        ctx.fillStyle = "#aaaaaa";
        ctx.fillText("Tip: Use stronger WPA networks to stay hidden longer.", 16, 150);

        if (this.message) {
            ctx.fillStyle = "#ff9966";
            ctx.fillText(this.message, 16, rect.height - 40);
        }

        ctx.restore();
    }
}