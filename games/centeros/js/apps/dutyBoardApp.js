import { state, TIME_CONFIG } from "../state.js";
import { Utils } from '../utils.js'; // unused?

function formatTimeFromMinutes(m) {
    // Night starts at 21:00; minute 0 = 21:00
    const absoluteMinutes = 21 * 60 + m;
    let hours = Math.floor(absoluteMinutes / 60) % 24;
    const mins = Math.floor(absoluteMinutes % 60);

    const pad = (n) => (n < 10 ? "0" + n : "" + n);
    return `${pad(hours)}:${pad(mins)}`;
}

export class DutyBoardApp {
    constructor() {}

    handleClick() {}

    handleKey() {}

    update() {}

    render(ctx, rect) {
        ctx.save();
        ctx.translate(rect.x, rect.y);

        ctx.fillStyle = "#151821";
        ctx.fillRect(0, 0, rect.width, rect.height);

        ctx.font = "14px system-ui";
        ctx.textBaseline = "top";
        ctx.textAlign = "left";

        ctx.fillStyle = "#ffcc66";
        ctx.fillText("DutyBoard", 16, 12);

        ctx.font = "12px system-ui";
        ctx.fillStyle = "#bbbbbb";

        const t = state.time.minutes;
        ctx.fillText(
            `Night ${state.time.day} — ${formatTimeFromMinutes(t)} / ` +
            `${formatTimeFromMinutes(TIME_CONFIG.NIGHT_MINUTES)}`,
            16,
            36
        );

        const officers = state.world.policeOfficers || [];
        let y = 64;

        if (officers.length === 0) {
            ctx.fillStyle = "#8888aa";
            ctx.fillText("No officers scheduled tonight.", 16, y);
            ctx.restore();
            return;
        }

        ctx.fillStyle = "#ffcc88";
        ctx.fillText("Active roster:", 16, y);
        y += 18;

        for (const o of officers) {
            if (y > rect.height - 40) break;

            const start = formatTimeFromMinutes(o.dutyStartMin);
            const end = formatTimeFromMinutes(o.dutyEndMin);

            const onDuty = t >= o.dutyStartMin && t < o.dutyEndMin;
            const minutesLeft = o.dutyEndMin - t;

            let status = "OFF DUTY";
            let color = "#777799";
            if (onDuty) {
                if (minutesLeft <= 30) {
                    status = "ON DUTY (ending soon)";
                    color = "#ffcc66";
                } else {
                    status = "ON DUTY";
                    color = "#88ff88";
                }
            }

            ctx.fillStyle = "#ffffff";
            ctx.fillText(`${o.id} — ${o.name}`, 16, y);
            y += 16;

            ctx.fillStyle = "#bbbbbb";
            ctx.fillText(`Duty: ${start} → ${end}`, 32, y);
            y += 16;

            ctx.fillText(`Assigned Wi-Fi: ${o.wifiSsid}`, 32, y);
            y += 16;

            ctx.fillStyle = color;
            ctx.fillText(`Status: ${status}`, 32, y);
            y += 20;
        }

        ctx.fillStyle = "#aaaaaa";
        y = rect.height - 44;
        ctx.fillText(
            "Hint: target an ON DUTY officer, steal a code via Police Terminal,",
            16,
            y
        );
        ctx.fillText(
            "then use DB apps while they are still working their shift.",
            16,
            y + 16
        );

        ctx.restore();
    }
}