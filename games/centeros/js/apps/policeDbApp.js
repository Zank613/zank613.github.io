import { state } from "../state.js";
import { requirePoliceCode } from "../world/security.js";
import { BaseApp } from "../core/baseApp.js";

export class PoliceDbApp extends BaseApp {
    constructor() { super(); }

    render(ctx, rect) {
        this.clear(ctx, rect, "#161922");
        ctx.save();
        ctx.translate(rect.x, rect.y);

        const access = requirePoliceCode("Police_DB");
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
        ctx.fillText("Police_DB", 16, 12);
        ctx.font = "12px system-ui";
        ctx.fillStyle = "#bbbbbb";

        const selectedId = state.world.selectedCitizenId;
        const c = state.world.citizens.find(c => c.id === selectedId);

        if (!selectedId || !c) {
            ctx.fillText("No citizen selected.", 16, 40);
            ctx.restore();
            return;
        }

        let y = 40;
        ctx.fillStyle = "#ffffff";
        ctx.fillText(`Subject: ${c.name} ${c.surname}`, 16, y); y += 22;

        const records = c.police_records || [];
        if (records.length === 0) {
            ctx.fillStyle = "#88ff88";
            ctx.fillText("No prior police records found.", 16, y);
            ctx.restore();
            return;
        }

        ctx.fillStyle = "#ff9999";
        ctx.fillText("Prior Incidents:", 16, y); y += 18;
        ctx.fillStyle = "#dddddd";

        const wrapText = (text, x, yy) => {
            const words = text.split(" ");
            let line = "";
            for (let i = 0; i < words.length; i++) {
                const testLine = line + words[i] + " ";
                const metrics = ctx.measureText(testLine);
                if (metrics.width > rect.width - 32 && i > 0) {
                    ctx.fillText(line, x, yy);
                    line = words[i] + " ";
                    yy += 16;
                } else {
                    line = testLine;
                }
            }
            if (line) ctx.fillText(line, x, yy);
            return yy + 16;
        };

        for (const r of records) {
            if (y > rect.height - 40) break;
            ctx.fillStyle = "#ffcc88";
            ctx.fillText(`• Record ID: ${r.id}`, 16, y); y += 16;
            ctx.fillStyle = "#dddddd";
            y = wrapText(r.note, 32, y);
            y += 8;
        }
        ctx.restore();
    }
}