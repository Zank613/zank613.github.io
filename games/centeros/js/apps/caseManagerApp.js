import { state } from "../state.js";
import { evaluateCaseVerdict } from "../world/caseWorld.js";
import { BaseApp } from "../core/baseApp.js";

export class CaseManagerApp extends BaseApp {
    constructor() {
        super();
        this.selectedAction = null;
        this.selectedThreat = null;
        this.actionButtons = [];
        this.threatButtons = [];
        this.submitButton = null;
    }

    handleClick(globalX, globalY, contentRect) {
        const { x, y } = this.getLocalCoords(globalX, globalY, contentRect);
        const wc = state.world.case;
        if (!wc || (wc.verdict && wc.verdict.evaluated)) return;

        for (const b of this.actionButtons) { if (this.isInside(x, y, b.x, b.y, b.w, b.h)) { this.selectedAction = b.id; return; } }
        for (const b of this.threatButtons) { if (this.isInside(x, y, b.x, b.y, b.w, b.h)) { this.selectedThreat = b.id; return; } }

        const s = this.submitButton;
        if (s && this.isInside(x, y, s.x, s.y, s.w, s.h) && this.selectedAction && this.selectedThreat) {
            evaluateCaseVerdict(this.selectedAction, this.selectedThreat, "submit");
        }
    }

    render(ctx, rect) {
        this.clear(ctx, rect, "#181b22");
        ctx.save();
        ctx.translate(rect.x, rect.y);

        const wc = state.world.case;
        if (!wc) { ctx.fillStyle = "#fff"; ctx.fillText("No active case.", 16, 16); ctx.restore(); return; }

        ctx.font = "14px system-ui";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillStyle = "#ffcc66";
        ctx.fillText("Incident Report", 16, 12);

        ctx.font = "12px system-ui";
        ctx.fillStyle = "#bbbbbb";
        ctx.fillText(`ID: ${wc.id} (Night ${wc.day})`, 16, 36);

        ctx.fillStyle = "#ffffff";
        ctx.fillText(wc.report.complaint_title, 16, 60);

        // Simple wrap for complaint text
        let y = 80;
        const words = wc.report.complaint_text.split(" ");
        let line = "";
        ctx.fillStyle = "#dddddd";
        for (let word of words) {
            if (ctx.measureText(line + word).width > rect.width - 32) { ctx.fillText(line, 16, y); line = ""; y += 16; }
            line += word + " ";
        }
        ctx.fillText(line, 16, y); y += 24;

        // Buttons
        this.actionButtons = []; this.threatButtons = [];
        const actions = [{id:"flag",l:"FLAG"},{id:"monitor",l:"MONITOR"},{id:"ignore",l:"IGNORE"}];
        let bx = 16;
        for (const a of actions) {
            const sel = this.selectedAction === a.id || wc.verdict.action === a.id;
            ctx.fillStyle = sel ? "#2d7a3e" : "#30374a";
            ctx.fillRect(bx, y, 80, 24);
            ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.fillText(a.l, bx+40, y+6);
            this.actionButtons.push({id: a.id, x: bx, y, w: 80, h: 24});
            bx += 90;
        }
        y += 40;

        ctx.textAlign = "left";
        const threats = [{id:"low",l:"LOW"},{id:"medium",l:"MEDIUM"},{id:"high",l:"HIGH"}];
        bx = 16;
        for (const t of threats) {
            const sel = this.selectedThreat === t.id || wc.verdict.threat === t.id;
            ctx.fillStyle = sel ? "#945ad1" : "#30374a";
            ctx.fillRect(bx, y, 80, 24);
            ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.fillText(t.l, bx+40, y+6);
            this.threatButtons.push({id: t.id, x: bx, y, w: 80, h: 24});
            bx += 90;
        }

        y += 40;
        if (!wc.verdict.evaluated) {
            ctx.fillStyle = (this.selectedAction && this.selectedThreat) ? "#2d7a3e" : "#555";
            ctx.fillRect(16, y, 140, 28);
            ctx.fillStyle = "#fff"; ctx.fillText("Submit verdict", 86, y+8);
            this.submitButton = {x: 16, y, w: 140, h: 28};
        } else {
            ctx.fillStyle = "#444"; ctx.fillRect(16, y, 140, 28);
            ctx.fillStyle = "#ccc"; ctx.fillText("Verdict locked", 86, y+8);
            ctx.textAlign = "left"; ctx.fillStyle = "#ffcc99";
            ctx.fillText(wc.verdict.summary || "Verdict submitted.", 16, y + 36);
        }

        ctx.restore();
    }
}