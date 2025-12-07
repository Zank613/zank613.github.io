import { state } from "../state.js";

export class VirusExterminatorApp {
    constructor() {
        this.message = "";
        this.buttonRect = { x: 0, y: 0, w: 0, h: 0 };
    }

    update(dt) {

    }

    handleKey(event) {

    }

    handleClick(localX, localY, contentRect) {
        const { x, y, w, h } = this.buttonRect;
        if (!x && !w) return;

        const gx = localX;
        const gy = localY;

        if (gx >= x && gx <= x + w &&
            gy >= y && gy <= y + h) {
            this.runScan();
        }
    }

    runScan() {
        const viruses = state.viruses || [];
        const charges = state.virusTools?.exterminatorCharges || 0;

        if (charges <= 0) {
            this.message = "No VirusExterminator uses left. Buy more from Underworld.";
            return;
        }

        if (viruses.length === 0) {
            this.message = "No active malware found. System is clean.";
            return;
        }

        // Consume one charge and wipe infections
        state.virusTools.exterminatorCharges = charges - 1;
        state.viruses = [];

        this.message = "Scan complete. All visual malware signatures removed.";
    }

    render(ctx, rect) {
        ctx.save();
        ctx.translate(rect.x, rect.y);

        ctx.fillStyle = "#15151b";
        ctx.fillRect(0, 0, rect.width, rect.height);

        ctx.font = "13px system-ui";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";

        const viruses = state.viruses || [];
        const charges = state.virusTools?.exterminatorCharges || 0;

        ctx.fillText("VirusExterminator v0.1", 12, 8);

        ctx.fillStyle = "#bbbbbb";
        ctx.fillText(`Active infections: ${viruses.length}`, 12, 32);
        ctx.fillText(`Available scans: ${charges}`, 12, 52);

        // Big button
        const buttonW = 180;
        const buttonH = 32;
        const buttonX = 12;
        const buttonY = 80;

        this.buttonRect = { x: buttonX, y: buttonY, w: buttonW, h: buttonH };

        ctx.fillStyle = (charges > 0) ? "#a83232" : "#444444";
        ctx.fillRect(buttonX, buttonY, buttonW, buttonH);

        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("SCAN & EXTERMINATE", buttonX + buttonW / 2, buttonY + buttonH / 2);

        // Status message
        if (this.message) {
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.fillStyle = "#ff9966";
            ctx.fillText(this.message, 12, rect.height - 28);
        }

        ctx.restore();
    }
}