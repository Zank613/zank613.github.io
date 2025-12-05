import { state } from "../state.js";
import { requirePoliceCode } from "../world/security.js";

export class CitizenDbApp {
    constructor() {
        this.lastResults = [];
        this.message = "Press SEARCH to query tonight's citizens using the case report.";

        // for click detection
        this.resultRowRects = []; // [{id, x,y,w,h}]
    }

    handleClick(localX, localY, contentRect) {
        const x = localX - contentRect.x;
        const y = localY - contentRect.y;

        // SEARCH button
        const btnX = 16;
        const btnY = 130;
        const btnW = 120;
        const btnH = 28;

        if (x >= btnX && x <= btnX + btnW &&
            y >= btnY && y <= btnY + btnH) {
            this.runSearch();
            return;
        }

        // Check result rows
        for (const row of this.resultRowRects) {
            if (x >= row.x && x <= row.x + row.w &&
                y >= row.y && y <= row.y + row.h) {

                state.world.selectedCitizenId = row.citizenId;
                this.message = `Selected ${row.label} as current subject.`;
                return;
            }
        }
    }

    handleKey(e) {

    }

    update(dt) {}

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

            // Height filter
            if (f.height && f.height.kind !== "missing") {
                const min = f.height.value_cm_min;
                const max = f.height.value_cm_max;
                if (typeof min === "number" && typeof max === "number") {
                    if (p.height_cm < min || p.height_cm > max) return false;
                }
            }

            // Weight filter
            if (f.weight && f.weight.kind !== "missing") {
                const minW = f.weight.value_kg_min;
                const maxW = f.weight.value_kg_max;
                if (typeof minW === "number" && typeof maxW === "number") {
                    if (p.weight_kg < minW || p.weight_kg > maxW) return false;
                }
            }

            // Age filter
            if (f.age && f.age.kind !== "missing") {
                const minA = f.age.value_years_min;
                const maxA = f.age.value_years_max;
                if (typeof minA === "number" && typeof maxA === "number") {
                    if (p.age < minA || p.age > maxA) return false;
                }
            }

            // Eye colour
            if (f.eye_color && f.eye_color.kind !== "missing" && f.eye_color.value) {
                if (p.eye_color.toLowerCase() !== f.eye_color.value.toLowerCase()) {
                    return false;
                }
            }

            // Hair colour
            if (f.hair_color && f.hair_color.kind !== "missing" && f.hair_color.value) {
                if (p.hair_color.toLowerCase() !== f.hair_color.value.toLowerCase()) {
                    return false;
                }
            }

            return true;
        });

        this.lastResults = matches;
        if (matches.length === 0) {
            this.message = "No citizens match the current description.";
        } else if (matches.length === 1) {
            this.message = "Single strong match found. Click them to select.";
        } else {
            this.message = `${matches.length} possible matches. Click one to select.`;
        }
    }

    render(ctx, rect) {
        ctx.save();
        ctx.translate(rect.x, rect.y);

        ctx.fillStyle = "#151821";
        ctx.fillRect(0, 0, rect.width, rect.height);

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
            ctx.fillText("No active case. There is nothing to query yet.", 16, 40);
            ctx.restore();
            return;
        }

        const f = report.fields;

        let y = 40;
        ctx.fillStyle = "#ffcc66";
        ctx.fillText("Current filters (from report):", 16, y);
        y += 18;

        const drawRow = (label, field) => {
            const text = (field && field.text) || "Unknown / not in report";
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

        // search button
        const btnX = 16;
        const btnY = 130;
        const btnW = 120;
        const btnH = 28;

        ctx.fillStyle = "#2d7a3e";
        ctx.fillRect(btnX, btnY, btnW, btnH);
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText("SEARCH", btnX + btnW / 2, btnY + 8);

        // message
        ctx.textAlign = "left";
        ctx.fillStyle = "#ffcc99";
        ctx.fillText(this.message, 16, 170);

        // selected citizen info
        const selectedId = state.world.selectedCitizenId;
        if (selectedId) {
            const c = state.world.citizens.find(c => c.id === selectedId);
            if (c) {
                ctx.fillStyle = "#aaccff";
                ctx.fillText(
                    `Selected: ${c.name} ${c.surname} (id: ${c.id})`,
                    16,
                    188
                );
            }
        }

        // results list
        y = 214;
        const results = this.lastResults;
        this.resultRowRects = [];

        ctx.fillStyle = "#ccccff";
        ctx.fillText("Results:", 16, y);
        y += 16;

        if (!results || results.length === 0) {
            ctx.fillStyle = "#8888aa";
            ctx.fillText("(no matches)", 16, y);
            ctx.restore();
            return;
        }

        for (const c of results) {
            if (y > rect.height - 40) break;

            const isSelected = c.id === selectedId;

            const rowX = 16;
            const rowY = y - 2;
            const rowW = rect.width - 32;
            const rowH = 32;

            if (isSelected) {
                ctx.fillStyle = "rgba(100, 150, 255, 0.2)";
                ctx.fillRect(rowX, rowY, rowW, rowH);
            } else {
                ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
                ctx.fillRect(rowX, rowY, rowW, rowH);
            }

            ctx.fillStyle = "#ffffff";
            ctx.fillText(`${c.name} ${c.surname}  (id: ${c.id})`, 24, y);
            y += 14;

            ctx.fillStyle = "#aaaaaa";
            ctx.fillText(
                `H:${c.physical.height_cm}cm  W:${c.physical.weight_kg}kg  Age:${c.physical.age}`,
                24,
                y
            );
            y += 18;

            this.resultRowRects.push({
                citizenId: c.id,
                label: `${c.name} ${c.surname}`,
                x: rowX,
                y: rowY,
                w: rowW,
                h: rowH
            });
        }

        ctx.restore();
    }
}