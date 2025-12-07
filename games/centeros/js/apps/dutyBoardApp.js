import { state, TIME_CONFIG } from "../state.js";
import { BaseApp } from "../core/baseApp.js";

function formatTime(m) {
    const abs = 21 * 60 + m;
    const hrs = Math.floor(abs / 60) % 24;
    const mins = Math.floor(abs % 60);
    return `${(hrs<10?"0":"")+hrs}:${(mins<10?"0":"")+mins}`;
}

export class DutyBoardApp extends BaseApp {
    constructor() { super(); }

    render(ctx, rect) {
        this.clear(ctx, rect, "#151821");
        ctx.save();
        ctx.translate(rect.x, rect.y);

        ctx.font = "14px system-ui";
        ctx.textBaseline = "top";
        ctx.textAlign = "left";
        ctx.fillStyle = "#ffcc66";
        ctx.fillText("DutyBoard", 16, 12);

        ctx.font = "12px system-ui";
        ctx.fillStyle = "#bbbbbb";
        ctx.fillText(`Night ${state.time.day} — ${formatTime(state.time.minutes)} / ${formatTime(TIME_CONFIG.NIGHT_MINUTES)}`, 16, 36);

        let y = 64;
        const officers = state.world.policeOfficers || [];
        if (officers.length === 0) {
            ctx.fillText("No officers scheduled.", 16, y);
            ctx.restore(); return;
        }

        ctx.fillStyle = "#ffcc88";
        ctx.fillText("Active roster:", 16, y); y += 18;

        for (const o of officers) {
            const onDuty = state.time.minutes >= o.dutyStartMin && state.time.minutes < o.dutyEndMin;
            const color = onDuty ? "#88ff88" : "#777799";

            ctx.fillStyle = "#ffffff";
            ctx.fillText(`${o.id} — ${o.name}`, 16, y); y += 16;
            ctx.fillStyle = "#bbbbbb";
            ctx.fillText(`Duty: ${formatTime(o.dutyStartMin)} → ${formatTime(o.dutyEndMin)}`, 32, y); y += 16;
            ctx.fillText(`SSID: ${o.wifiSsid}`, 32, y); y += 16;
            ctx.fillStyle = color;
            ctx.fillText(`Status: ${onDuty ? "ON DUTY" : "OFF DUTY"}`, 32, y); y += 20;
        }

        ctx.restore();
    }
}