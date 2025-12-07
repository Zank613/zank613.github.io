import { state } from "../state.js";
import { requirePoliceCode } from "../world/security.js";
import { BaseApp } from "../core/baseApp.js";

export class TelScannerApp extends BaseApp {
    constructor() {
        super();
        this.input = "";
        this.message = "Type IMEI or select from Sim_DB.";
        this.lastCitizenId = null;
    }

    handleKey(e) {
        if (e.key === "Backspace") this.input = this.input.slice(0, -1);
        else if (e.key === "Enter") { if (this.input.trim().length > 0) this.scanImei(this.input.trim()); }
        else if (e.key === "Escape") this.input = "";
        else if (e.key.length === 1 && !e.ctrlKey && !e.altKey) this.input += e.key;
    }

    scanImei(entered) {
        const imei = entered.replace(/\s+/g, "");
        let foundCitizen = null;
        for (const c of state.world.citizens) {
            if (c.devices.some(d => d.imei === imei)) { foundCitizen = c; break; }
        }

        if (!foundCitizen) {
            this.message = `No device found with IMEI ${imei}.`;
            this.lastCitizenId = null;
        } else {
            this.lastCitizenId = foundCitizen.id;
            state.world.selectedCitizenId = foundCitizen.id;
            state.world.selectedImei = imei;
            this.message = `Subject found: ${foundCitizen.name} ${foundCitizen.surname}.`;
        }
    }

    render(ctx, rect) {
        this.clear(ctx, rect, "#10141f");
        ctx.save();
        ctx.translate(rect.x, rect.y);

        const access = requirePoliceCode("TelScanner");
        if (!access.allowed) {
            ctx.fillStyle = "#ff4444";
            ctx.textAlign = "center";
            ctx.fillText("ACCESS DENIED", rect.width/2, rect.height/2);
            ctx.restore();
            return;
        }

        ctx.font = "14px system-ui";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillStyle = "#ffcc66";
        ctx.fillText("TelScanner", 16, 12);

        ctx.font = "12px system-ui";
        ctx.fillStyle = "#bbbbbb";
        ctx.fillText(state.world.selectedImei ? `Selected: ${state.world.selectedImei}` : "No IMEI selected.", 16, 36);

        // Input
        const inputY = 78;
        ctx.fillStyle = "#222838";
        ctx.fillRect(16, inputY, rect.width - 32, 22);
        ctx.strokeStyle = "#555b70";
        ctx.strokeRect(16.5, inputY + 0.5, rect.width - 33, 21);
        ctx.fillStyle = "#ffffff";
        const text = this.input || (state.world.selectedImei || "");
        ctx.fillText(text, 20, inputY + 4);
        ctx.fillRect(20 + ctx.measureText(text).width + 2, inputY + 4, 8, 1);

        ctx.fillStyle = "#ffcc99";
        ctx.fillText(this.message, 16, inputY + 32);

        // Data Display
        const cid = this.lastCitizenId || state.world.selectedCitizenId;
        const c = state.world.citizens.find(x => x.id === cid);
        let y = inputY + 56;

        if (c) {
            ctx.fillStyle = "#ffffff";
            ctx.fillText(`Subject: ${c.name} ${c.surname}`, 16, y); y += 20;

            const wrapText = (text, yy) => {
                const words = text.split(" ");
                let line = "";
                yy += 16;
                for (let i = 0; i < words.length; i++) {
                    const test = line + words[i] + " ";
                    if (ctx.measureText(test).width > rect.width - 32) {
                        ctx.fillText(line, 32, yy);
                        line = words[i] + " ";
                        yy += 16;
                    } else line = test;
                }
                ctx.fillText(line, 32, yy);
                return yy + 16;
            };

            const digital = c.digital || {};

            ctx.fillStyle = "#88ccff";
            ctx.fillText("Text messages:", 16, y); y += 16;
            ctx.fillStyle = "#dddddd";
            for (const t of digital.texts) { if (y > rect.height - 40) break; ctx.fillText("•", 20, y + 16); y = wrapText(t.content, y); y += 4; }

            ctx.fillStyle = "#88ffcc";
            ctx.fillText("Emails:", 16, y); y += 16;
            ctx.fillStyle = "#dddddd";
            for (const e of digital.emails) { if (y > rect.height - 40) break; ctx.fillText(`• ${e.subject}`, 20, y + 16); y = wrapText(e.content, y); y += 4; }
        }

        ctx.restore();
    }
}