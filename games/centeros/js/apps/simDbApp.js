import { state } from "../state.js";
import { requirePoliceCode } from "../world/security.js";
import { BaseApp } from "../core/baseApp.js";

export class SimDbApp extends BaseApp {
    constructor() {
        super();
        this.message = "Click an entry to set IMEI for TelScanner.";
        this.rowRects = [];
    }

    handleClick(globalX, globalY, contentRect) {
        const { x, y } = this.getLocalCoords(globalX, globalY, contentRect);
        for (const row of this.rowRects) {
            if (this.isInside(x, y, row.x, row.y, row.w, row.h)) {
                state.world.selectedImei = row.imei;
                this.message = `Selected IMEI ${row.imei} for TelScanner.`;
                return;
            }
        }
    }

    render(ctx, rect) {
        this.clear(ctx, rect, "#141822");
        ctx.save();
        ctx.translate(rect.x, rect.y);

        const access = requirePoliceCode("Sim_DB");
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
        ctx.fillText("Sim_DB", 16, 12);
        ctx.font = "12px system-ui";
        ctx.fillStyle = "#bbbbbb";

        const c = state.world.citizens.find(c => c.id === state.world.selectedCitizenId);
        if (!c) {
            ctx.fillText("No citizen selected.", 16, 40);
            ctx.restore();
            return;
        }

        let y = 40;
        ctx.fillStyle = "#ffffff";
        ctx.fillText(`Subject: ${c.name} ${c.surname}`, 16, y); y += 22;

        const devices = c.devices || [];
        this.rowRects = [];

        ctx.fillStyle = "#88ccff";
        ctx.fillText("Devices:", 16, y); y += 18;

        for (const d of devices) {
            const rowH = 32;
            const isSelected = state.world.selectedImei === d.imei;
            ctx.fillStyle = isSelected ? "rgba(120, 200, 255, 0.25)" : "rgba(255, 255, 255, 0.03)";
            ctx.fillRect(16, y - 2, rect.width - 32, rowH);

            ctx.fillStyle = "#ffffff";
            ctx.fillText(`Label: ${d.label}`, 24, y); y += 14;
            ctx.fillStyle = "#dddddd";
            ctx.fillText(`IMEI: ${d.imei}`, 24, y); y += 18;

            this.rowRects.push({ imei: d.imei, x: 16, y: y - 32 - 2, w: rect.width - 32, h: rowH });
        }

        y = rect.height - 40;
        ctx.fillStyle = "#ffcc99";
        ctx.fillText(this.message, 16, y);
        ctx.restore();
    }
}