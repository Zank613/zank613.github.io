import { state } from "../state.js";
import { BaseApp } from "../core/baseApp.js";

export class VirusExterminatorApp extends BaseApp {
    constructor() {
        super();
        this.message = "";
        this.buttonRect = { x: 0, y: 0, w: 0, h: 0 };
    }

    handleClick(globalX, globalY, contentRect) {
        const { x, y } = this.getLocalCoords(globalX, globalY, contentRect);
        const b = this.buttonRect;
        if (this.isInside(x, y, b.x, b.y, b.w, b.h)) this.runScan();
    }

    runScan() {
        if ((state.virusTools?.exterminatorCharges || 0) <= 0) { this.message = "No charges. Buy in Underworld."; return; }
        if (!state.viruses?.length) { this.message = "System clean."; return; }

        state.virusTools.exterminatorCharges--;
        state.viruses = [];
        this.message = "Scan complete. Malware removed.";
    }

    render(ctx, rect) {
        this.clear(ctx, rect, "#15151b");
        ctx.save();
        ctx.translate(rect.x, rect.y);

        ctx.font = "13px system-ui";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText("VirusExterminator v0.1", 12, 8);

        const viruses = state.viruses || [];
        const charges = state.virusTools?.exterminatorCharges || 0;
        ctx.fillStyle = "#bbbbbb";
        ctx.fillText(`Active infections: ${viruses.length}`, 12, 32);
        ctx.fillText(`Available scans: ${charges}`, 12, 52);

        this.buttonRect = { x: 12, y: 80, w: 180, h: 32 };
        ctx.fillStyle = charges > 0 ? "#a83232" : "#444";
        ctx.fillRect(12, 80, 180, 32);

        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("SCAN & EXTERMINATE", 102, 96);

        if (this.message) {
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.fillStyle = "#ff9966";
            ctx.fillText(this.message, 12, rect.height - 28);
        }
        ctx.restore();
    }
}