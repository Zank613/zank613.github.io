import { state } from "../state.js";
import { evaluateCaseVerdict } from "../world/caseWorld.js";

export class CaseManagerApp {
    constructor() {
        this.selectedAction = null; // "flag" | "monitor" | "ignore"
        this.selectedThreat = null; // "low" | "medium" | "high"

        this.actionButtons = [];
        this.threatButtons = [];
        this.submitButton = null;
    }

    handleClick(localX, localY, contentRect) {
        const wc = state.world.case;
        if (!wc) return;

        if (wc.verdict && wc.verdict.evaluated) {
            return; // case is locked
        }

        const x = localX - contentRect.x;
        const y = localY - contentRect.y;

        // action buttons
        for (const b of this.actionButtons) {
            if (x >= b.x && x <= b.x + b.w &&
                y >= b.y && y <= b.y + b.h) {
                this.selectedAction = b.id;
                return;
            }
        }

        // threat buttons
        for (const b of this.threatButtons) {
            if (x >= b.x && x <= b.x + b.w &&
                y >= b.y && y <= b.y + b.h) {
                this.selectedThreat = b.id;
                return;
            }
        }

        // submit
        if (this.submitButton &&
            x >= this.submitButton.x && x <= this.submitButton.x + this.submitButton.w &&
            y >= this.submitButton.y && y <= this.submitButton.y + this.submitButton.h) {

            if (this.selectedAction && this.selectedThreat) {
                evaluateCaseVerdict(this.selectedAction, this.selectedThreat, "submit");
            }
        }
    }

    handleKey(e) {
        // could add hotkeys later
    }

    update(dt) {}

    render(ctx, rect) {
        ctx.save();
        ctx.translate(rect.x, rect.y);

        ctx.fillStyle = "#181b22";
        ctx.fillRect(0, 0, rect.width, rect.height);

        ctx.font = "14px system-ui";
        ctx.textBaseline = "top";
        ctx.textAlign = "left";

        const worldCase = state.world.case;

        if (!worldCase) {
            ctx.fillStyle = "#ffffff";
            ctx.fillText("No active case.", 16, 16);
            ctx.restore();
            return;
        }

        const report = worldCase.report;

        // ==== Incident header ====
        ctx.fillStyle = "#ffcc66";
        ctx.fillText("Incident Report", 16, 12);

        ctx.font = "12px system-ui";
        ctx.fillStyle = "#bbbbbb";
        ctx.fillText(`Case ID: ${worldCase.id}`, 16, 36);
        ctx.fillText(`Night: ${worldCase.day}`, 16, 52);

        // complaint text
        const wrapText = (text, x, y, maxWidth, lineHeight) => {
            const words = text.split(" ");
            let line = "";
            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + " ";
                const metrics = ctx.measureText(testLine);
                if (metrics.width > maxWidth && n > 0) {
                    ctx.fillText(line, x, y);
                    line = words[n] + " ";
                    y += lineHeight;
                } else {
                    line = testLine;
                }
            }
            if (line) ctx.fillText(line, x, y);
            return y;
        };

        ctx.fillStyle = "#ffffff";
        ctx.fillText(report.complaint_title, 16, 80);
        ctx.fillStyle = "#dddddd";
        let y = wrapText(report.complaint_text, 16, 98, rect.width - 32, 16);

        // ==== Subject description ====
        y += 16;
        ctx.fillStyle = "#ffcc66";
        ctx.fillText("Subject Description", 16, y);
        y += 18;

        const f = report.fields;

        const drawField = (label, field) => {
            const text = (field && field.text) || "Unknown";
            ctx.fillStyle = "#bbbbbb";
            ctx.fillText(label + ": ", 16, y);
            ctx.fillStyle = "#ffffff";
            ctx.fillText(text, 140, y);
            y += 16;
        };

        drawField("Name", f.name);
        drawField("Surname", f.surname);
        drawField("Height", f.height);
        drawField("Weight", f.weight);
        drawField("Eye Colour", f.eye_color);
        drawField("Hair Colour", f.hair_color);
        drawField("Age", f.age);

        // ==== Verdict UI ====

        const verdict = worldCase.verdict || {};
        const evaluated = verdict.evaluated;

        // Start verdict after finishing the description,
        // but don't let it go off the bottom of the window.
        const minTop = Math.max(y + 16, 230);
        const verdictTop = Math.min(rect.height - 180, minTop);
        let vy = verdictTop;

        ctx.fillStyle = "#ffcc66";
        ctx.fillText("Your Assessment", 16, vy);
        vy += 16;

        // current focus info
        const selId = state.world.selectedCitizenId;
        if (selId) {
            const c = state.world.citizens.find(c => c.id === selId);
            if (c) {
                ctx.fillStyle = "#aaccff";
                ctx.fillText(
                    `Current subject focus: ${c.name} ${c.surname} (id: ${c.id})`,
                    16,
                    vy
                );
                vy += 18;
            }
        }

        this.actionButtons = [];
        this.threatButtons = [];
        this.submitButton = null;

        const btnW = 80;
        const btnH = 24;
        const gap = 8;

        // actions
        const actionY = vy + 6;
        const actions = [
            { id: "flag", label: "FLAG" },
            { id: "monitor", label: "MONITOR" },
            { id: "ignore", label: "IGNORE" }
        ];

        ctx.font = "12px system-ui";
        ctx.textAlign = "left";
        ctx.fillStyle = "#bbbbbb";
        ctx.fillText("Action:", 16, actionY);

        let bx = 90;
        for (const a of actions) {
            const isSelected =
                this.selectedAction === a.id ||
                (evaluated && verdict.action === a.id);

            const x = bx;
            const bY = actionY - 2;
            const w = btnW;
            const h = btnH;

            ctx.fillStyle = isSelected ? "#2d7a3e" : "#30374a";
            ctx.fillRect(x, bY, w, h);
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.fillText(a.label, x + w / 2, bY + 6);

            this.actionButtons.push({ id: a.id, x, y: bY, w, h });
            bx += w + gap;
        }

        // threat level
        const threatY = actionY + 32;
        const threats = [
            { id: "low", label: "LOW" },
            { id: "medium", label: "MEDIUM" },
            { id: "high", label: "HIGH" }
        ];

        ctx.textAlign = "left";
        ctx.fillStyle = "#bbbbbb";
        ctx.fillText("Threat level:", 16, threatY);

        bx = 110;
        for (const t of threats) {
            const isSelected =
                this.selectedThreat === t.id ||
                (evaluated && verdict.threat === t.id);

            const x = bx;
            const bY = threatY - 2;
            const w = btnW;
            const h = btnH;

            ctx.fillStyle = isSelected ? "#945ad1" : "#30374a";
            ctx.fillRect(x, bY, w, h);
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.fillText(t.label, x + w / 2, bY + 6);

            this.threatButtons.push({ id: t.id, x, y: bY, w, h });
            bx += w + gap;
        }

        // submit button
        const submitY = Math.min(rect.height - 60, threatY + 34);
        const submitX = 16;
        const submitW = 140;
        const submitH = 28;

        this.submitButton = { x: submitX, y: submitY, w: submitW, h: submitH };

        ctx.textAlign = "center";
        if (!evaluated) {
            ctx.fillStyle =
                this.selectedAction && this.selectedThreat
                    ? "#2d7a3e"
                    : "#555a5f";
            ctx.fillRect(submitX, submitY, submitW, submitH);
            ctx.fillStyle = "#ffffff";
            ctx.fillText("Submit verdict", submitX + submitW / 2, submitY + 8);
        } else {
            ctx.fillStyle = "#444444";
            ctx.fillRect(submitX, submitY, submitW, submitH);
            ctx.fillStyle = "#cccccc";
            ctx.fillText("Verdict locked", submitX + submitW / 2, submitY + 8);
        }

        // outcome / stats
        let infoY = submitY + 34;
        ctx.textAlign = "left";

        if (evaluated) {
            ctx.fillStyle = "#ffcc99";
            ctx.fillText("Case outcome:", 16, infoY);
            infoY += 16;

            ctx.fillStyle = "#dddddd";
            const maxWidth = rect.width - 32;
            const lineHeight = 16;

            const wrap = (text, x, yy) => {
                const words = text.split(" ");
                let line = "";
                for (let i = 0; i < words.length; i++) {
                    const testLine = line + words[i] + " ";
                    const metrics = ctx.measureText(testLine);
                    if (metrics.width > maxWidth && i > 0) {
                        ctx.fillText(line, x, yy);
                        line = words[i] + " ";
                        yy += lineHeight;
                    } else {
                        line = testLine;
                    }
                }
                if (line) ctx.fillText(line, x, yy);
                return yy + lineHeight;
            };

            infoY = wrap(
                verdict.summary || "No summary.",
                16,
                infoY,
                maxWidth,
                lineHeight
            );
        } else {
            ctx.fillStyle = "#8888ff";
            ctx.fillText(
                "Verdict not yet submitted. You may still change your mind.",
                16,
                infoY
            );
            infoY += 16;
        }

        infoY += 4;
        ctx.fillStyle = "#aaaaaa";
        ctx.fillText(
            `Cases decided: ${state.caseStats.totalDecided}, ` +
            `reasonable calls: ${state.caseStats.correctCriminalCalls}`,
            16,
            infoY
        );

        ctx.restore();
    }
}