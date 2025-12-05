import { state } from "../state.js";
import { requirePoliceCode } from "../world/security.js";

export class SimDbApp {
    constructor() {
        this.message = "Click an entry to set IMEI for TelScanner.";
        this.rowRects = [];
    }

    handleClick(localX, localY, contentRect) {
        const x = localX - contentRect.x;
        const y = localY - contentRect.y;

        for (const row of this.rowRects) {
            if (x >= row.x && x <= row.x + row.w &&
                y >= row.y && y <= row.y + row.h) {
                state.world.selectedImei = row.imei;
                this.message = `Selected IMEI ${row.imei} for TelScanner.`;
                return;
            }
        }
    }

    handleKey(e) {

    }

    update(dt) {

    }

    render(ctx, rect) {
        ctx.save();
        ctx.translate(rect.x, rect.y);

        ctx.fillStyle = "#141822";
        ctx.fillRect(0, 0, rect.width, rect.height);

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

        const selectedId = state.world.selectedCitizenId;
        if (!selectedId) {
            ctx.fillText("No citizen selected.", 16, 40);
            ctx.fillText("Use Citizen_DB to select a subject first.", 16, 56);
            ctx.restore();
            return;
        }

        const c = state.world.citizens.find(c => c.id === selectedId);
        if (!c) {
            ctx.fillText("Selected citizen not found in current world.", 16, 40);
            ctx.restore();
            return;
        }

        const devices = c.devices || [];
        let y = 40;

        ctx.fillStyle = "#ffffff";
        ctx.fillText(`Subject: ${c.name} ${c.surname}`, 16, y);
        y += 22;

        if (devices.length === 0) {
            ctx.fillStyle = "#ff9999";
            ctx.fillText("No registered devices found.", 16, y);
            ctx.restore();
            return;
        }

        ctx.fillStyle = "#88ccff";
        ctx.fillText("Devices:", 16, y);
        y += 18;

        this.rowRects = [];

        const selectedImei = state.world.selectedImei;

        for (const d of devices) {
            if (y > rect.height - 40) break;

            const rowX = 16;
            const rowY = y - 2;
            const rowW = rect.width - 32;
            const rowH = 32;

            const isSelected = selectedImei === d.imei;

            ctx.fillStyle = isSelected
                ? "rgba(120, 200, 255, 0.25)"
                : "rgba(255, 255, 255, 0.03)";
            ctx.fillRect(rowX, rowY, rowW, rowH);

            ctx.fillStyle = "#ffffff";
            ctx.fillText(`Label: ${d.label}`, 24, y);
            y += 14;

            ctx.fillStyle = "#dddddd";
            ctx.fillText(`IMEI: ${d.imei}`, 24, y);
            y += 18;

            this.rowRects.push({
                imei: d.imei,
                x: rowX,
                y: rowY,
                w: rowW,
                h: rowH
            });
        }

        y = rect.height - 40;
        ctx.fillStyle = "#ffcc99";
        ctx.fillText(this.message, 16, y);

        ctx.restore();
    }
}