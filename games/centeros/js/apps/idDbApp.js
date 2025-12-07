import { state } from "../state.js";
import { requirePoliceCode } from "../world/security.js";
import { BaseApp } from "../core/baseApp.js";

export class IdDbApp extends BaseApp {
    constructor() { super(); }

    render(ctx, rect) {
        this.clear(ctx, rect, "#181b22");
        ctx.save();
        ctx.translate(rect.x, rect.y);

        const access = requirePoliceCode("ID_DB");
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
        ctx.fillText("ID_DB", 16, 12);

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
        ctx.fillText(`${c.name} ${c.surname}`, 16, y); y += 22;
        ctx.fillStyle = "#bbbbbb";
        ctx.fillText(`Citizen ID: ${c.id}`, 16, y); y += 16;
        ctx.fillText(`National ID: ${c.ids.national_id}`, 16, y); y += 16;
        ctx.fillText(`Passport No: ${c.ids.passport_no}`, 16, y); y += 16;
        ctx.fillText("Fingerprint ID:", 16, y); y += 16;
        ctx.fillStyle = "#ffdd88";
        ctx.fillText(c.ids.fingerprint_hex, 32, y); y += 22;
        ctx.fillStyle = "#bbbbbb";
        ctx.fillText("Physical:", 16, y); y += 18;
        ctx.fillStyle = "#ffffff";
        ctx.fillText(`Height: ${c.physical.height_cm} cm, Weight: ${c.physical.weight_kg} kg`, 32, y); y += 16;
        ctx.fillText(`Age: ${c.physical.age}, Eyes: ${c.physical.eye_color}, Hair: ${c.physical.hair_color}`, 32, y);

        ctx.restore();
    }
}