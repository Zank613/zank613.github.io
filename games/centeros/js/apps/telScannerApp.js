import { state } from "../state.js";
import { requirePoliceCode } from "../world/security.js";

export class TelScannerApp {
    constructor() {
        this.input = "";
        this.message = "Type an IMEI and press Enter, or select one via Sim_DB.";
        this.lastCitizenId = null;
    }

    handleClick(localX, localY, contentRect) {
        // could later add clickable things
    }

    handleKey(e) {
        if (e.key === "Backspace") {
            this.input = this.input.slice(0, -1);
            e.preventDefault();
        } else if (e.key === "Enter") {
            const raw = this.input.trim();
            if (raw.length > 0) {
                this.scanImei(raw);
            }
            e.preventDefault();
        } else if (e.key === "Escape") {
            this.input = "";
            e.preventDefault();
        } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            // accept digits and basic characters
            this.input += e.key;
            e.preventDefault();
        }
    }

    update(dt) {}

    scanImei(entered) {
        const imei = entered.replace(/\s+/g, "");
        const citizens = state.world.citizens || [];

        let foundCitizen = null;

        for (const c of citizens) {
            const devices = c.devices || [];
            for (const d of devices) {
                if (d.imei === imei) {
                    foundCitizen = c;
                    break;
                }
            }
            if (foundCitizen) break;
        }

        if (!foundCitizen) {
            this.message = `No device found with IMEI ${imei}.`;
            this.lastCitizenId = null;
            return;
        }

        this.lastCitizenId = foundCitizen.id;
        state.world.selectedCitizenId = foundCitizen.id;
        state.world.selectedImei = imei;
        this.message = `Device found. Subject set to ${foundCitizen.name} ${foundCitizen.surname}.`;
    }

    render(ctx, rect) {
        ctx.save();
        ctx.translate(rect.x, rect.y);

        ctx.fillStyle = "#10141f";
        ctx.fillRect(0, 0, rect.width, rect.height);

        const access = requirePoliceCode("TelScanner");
        if (!access.allowed) {
            ctx.fillStyle = "#ff4444";
            ctx.textAlign = "center";
            ctx.fillText("ACCESS DENIED", rect.width/2, rect.height/2);
            ctx.fillStyle = "#aaaaaa";
            ctx.fillText(access.reason, rect.width/2, rect.height/2 + 20);
            ctx.restore();
            return;
        }

        ctx.font = "14px system-ui";
        ctx.textBaseline = "top";
        ctx.textAlign = "left";

        ctx.fillStyle = "#ffcc66";
        ctx.fillText("TelScanner", 16, 12);

        ctx.font = "12px system-ui";
        ctx.fillStyle = "#bbbbbb";

        const selectedImei = state.world.selectedImei;
        if (selectedImei) {
            ctx.fillText(`Selected IMEI from Sim_DB: ${selectedImei}`, 16, 36);
        } else {
            ctx.fillText("No IMEI selected from Sim_DB.", 16, 36);
        }

        // Input field
        const inputLabelY = 60;
        ctx.fillStyle = "#bbbbbb";
        ctx.fillText("IMEI input:", 16, inputLabelY);

        const inputY = inputLabelY + 18;
        const boxW = rect.width - 32;
        const boxH = 22;

        ctx.fillStyle = "#222838";
        ctx.fillRect(16, inputY, boxW, boxH);
        ctx.strokeStyle = "#555b70";
        ctx.strokeRect(16.5, inputY + 0.5, boxW - 1, boxH - 1);

        ctx.fillStyle = "#ffffff";
        const text = this.input || (selectedImei || "");
        ctx.fillText(text, 20, inputY + 4);

        // caret
        const caretX = 20 + ctx.measureText(text).width + 2;
        ctx.fillRect(caretX, inputY + 4, 8, 1);

        // message
        ctx.fillStyle = "#ffcc99";
        ctx.fillText(this.message, 16, inputY + 32);

        // Show digital evidence
        const cid = this.lastCitizenId || state.world.selectedCitizenId;
        const c = state.world.citizens.find(x => x.id === cid);

        let y = inputY + 56;

        if (!c) {
            ctx.fillStyle = "#8888aa";
            ctx.fillText("No device bound to any citizen yet.", 16, y);
            ctx.restore();
            return;
        }

        ctx.fillStyle = "#ffffff";
        ctx.fillText(`Subject: ${c.name} ${c.surname}`, 16, y);
        y += 20;

        const digital = c.digital || {};
        const texts = digital.texts || [];
        const emails = digital.emails || [];
        const apps = digital.apps || [];

        const lineHeight = 16;
        const maxWidth = rect.width - 32;

        const wrapText = (label, textVal, yy) => {
            const words = textVal.split(" ");
            let line = "";
            yy += lineHeight;
            for (let i = 0; i < words.length; i++) {
                const testLine = line + words[i] + " ";
                const metrics = ctx.measureText(testLine);
                if (metrics.width > maxWidth && i > 0) {
                    ctx.fillText(line, 32, yy);
                    line = words[i] + " ";
                    yy += lineHeight;
                } else {
                    line = testLine;
                }
            }
            if (line) ctx.fillText(line, 32, yy);
            return yy + lineHeight;
        };

        // Texts
        ctx.fillStyle = "#88ccff";
        ctx.fillText("Text messages:", 16, y);
        y += lineHeight;

        if (texts.length === 0) {
            ctx.fillStyle = "#777799";
            ctx.fillText("(none)", 32, y);
            y += lineHeight;
        } else {
            ctx.fillStyle = "#dddddd";
            for (const t of texts) {
                if (y > rect.height - 80) break;
                ctx.fillText("•", 20, y);
                y = wrapText("txt", t.content, y - lineHeight);
                y += 4;
            }
        }

        // Emails
        ctx.fillStyle = "#88ffcc";
        ctx.fillText("Emails:", 16, y);
        y += lineHeight;

        if (emails.length === 0) {
            ctx.fillStyle = "#777999";
            ctx.fillText("(none)", 32, y);
            y += lineHeight;
        } else {
            ctx.fillStyle = "#dddddd";
            for (const eItem of emails) {
                if (y > rect.height - 60) break;
                ctx.fillText(`• ${eItem.subject}`, 20, y);
                y = wrapText("em", eItem.content, y);
                y += 4;
            }
        }

        // Apps
        ctx.fillStyle = "#ffcc88";
        ctx.fillText("Apps of interest:", 16, y);
        y += lineHeight;

        if (apps.length === 0) {
            ctx.fillStyle = "#777999";
            ctx.fillText("(none)", 32, y);
        } else {
            ctx.fillStyle = "#dddddd";
            for (const a of apps) {
                if (y > rect.height - 40) break;
                ctx.fillText(`• ${a.name} – ${a.note}`, 24, y);
                y += lineHeight;
            }
        }

        ctx.restore();
    }
}