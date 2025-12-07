import { state } from "../state.js";
import { requirePoliceCode } from "../world/security.js";
import { BaseApp } from "../core/baseApp.js";

export class CitizenDbApp extends BaseApp {
    constructor() {
        super();
        this.lastResults = [];
        this.message = "Press SEARCH to query tonight's citizens using the case report.";
        this.resultRowRects = [];
    }

    handleClick(globalX, globalY, contentRect) {
        const { x, y } = this.getLocalCoords(globalX, globalY, contentRect);

        // SEARCH button
        if (this.isInside(x, y, 16, 130, 120, 28)) {
            this.runSearch();
            return;
        }

        // Check result rows
        for (const row of this.resultRowRects) {
            if (this.isInside(x, y, row.x, row.y, row.w, row.h)) {
                state.world.selectedCitizenId = row.citizenId;
                this.message = `Selected ${row.label} as current subject.`;
                return;
            }
        }
    }

    runSearch() {
        const worldCase = state.world.case;
        const citizens = state.world.citizens || [];

        if (!worldCase) {
            this.lastResults = [];
            this.message = "No active case. Wait for the next night.";
            return;
        }

        const f = worldCase.report.fields;

        const matches = citizens.filter(c => {
            const p = c.physical;

            if (f.height && f.height.kind !== "missing") {
                if (p.height_cm < f.height.value_cm_min || p.height_cm > f.height.value_cm_max) return false;
            }
            if (f.weight && f.weight.kind !== "missing") {
                if (p.weight_kg < f.weight.value_kg_min || p.weight_kg > f.weight.value_kg_max) return false;
            }
            if (f.age && f.age.kind !== "missing") {
                if (p.age < f.age.value_years_min || p.age > f.age.value_years_max) return false;
            }
            if (f.eye_color && f.eye_color.kind !== "missing" && f.eye_color.value) {
                if (p.eye_color.toLowerCase() !== f.eye_color.value.toLowerCase()) return false;
            }
            if (f.hair_color && f.hair_color.kind !== "missing" && f.hair_color.value) {
                if (p.hair_color.toLowerCase() !== f.hair_color.value.toLowerCase()) return false;
            }
            return true;
        });

        this.lastResults = matches;
        this.message = matches.length === 0 ? "No citizens match." :
            matches.length === 1 ? "Single match found." :
                `${matches.length} possible matches.`;
    }

    render(ctx, rect) {
        this.clear(ctx, rect, "#151821");

        ctx.save();
        ctx.translate(rect.x, rect.y);

        const access = requirePoliceCode("Citizen_DB");
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
        ctx.fillText("Citizen_DB", 16, 12);

        const worldCase = state.world.case;
        const report = worldCase ? worldCase.report : null;

        ctx.font = "12px system-ui";
        ctx.fillStyle = "#bbbbbb";

        if (!worldCase) {
            ctx.fillText("No active case.", 16, 40);
            ctx.restore();
            return;
        }

        const f = report.fields;
        let y = 40;
        ctx.fillStyle = "#ffcc66";
        ctx.fillText("Current filters:", 16, y);
        y += 18;

        const drawRow = (label, field) => {
            const text = (field && field.text) || "Unknown";
            ctx.fillStyle = "#bbbbbb";
            ctx.fillText(label + ": ", 16, y);
            ctx.fillStyle = "#ffffff";
            ctx.fillText(text, 140, y);
            y += 16;
        };

        drawRow("Height", f.height);
        drawRow("Weight", f.weight);
        drawRow("Eye Colour", f.eye_color);
        drawRow("Hair Colour", f.hair_color);
        drawRow("Age", f.age);

        // Search Button
        ctx.fillStyle = "#2d7a3e";
        ctx.fillRect(16, 130, 120, 28);
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText("SEARCH", 16 + 60, 130 + 8);

        // Message
        ctx.textAlign = "left";
        ctx.fillStyle = "#ffcc99";
        ctx.fillText(this.message, 16, 170);

        // Selected Info
        const selectedId = state.world.selectedCitizenId;
        if (selectedId) {
            const c = state.world.citizens.find(c => c.id === selectedId);
            if (c) {
                ctx.fillStyle = "#aaccff";
                ctx.fillText(`Selected: ${c.name} ${c.surname} (${c.id})`, 16, 188);
            }
        }

        // Results
        y = 214;
        ctx.fillStyle = "#ccccff";
        ctx.fillText("Results:", 16, y);
        y += 16;

        this.resultRowRects = [];
        for (const c of this.lastResults) {
            if (y > rect.height - 40) break;
            const isSelected = c.id === selectedId;
            const rowH = 32;

            ctx.fillStyle = isSelected ? "rgba(100, 150, 255, 0.2)" : "rgba(255, 255, 255, 0.03)";
            ctx.fillRect(16, y - 2, rect.width - 32, rowH);

            ctx.fillStyle = "#ffffff";
            ctx.fillText(`${c.name} ${c.surname}  (${c.id})`, 24, y);
            y += 14;
            ctx.fillStyle = "#aaaaaa";
            ctx.fillText(`H:${c.physical.height_cm}cm  W:${c.physical.weight_kg}kg  Age:${c.physical.age}`, 24, y);
            y += 18;

            this.resultRowRects.push({ citizenId: c.id, label: `${c.name} ${c.surname}`, x: 16, y: y - 32 - 2, w: rect.width - 32, h: rowH });
        }

        ctx.restore();
    }
}