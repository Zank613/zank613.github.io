import { state } from "../state.js";
import { evaluateCaseVerdict } from "../world/caseWorld.js";
import { BaseApp } from "../core/baseApp.js";

export class CaseManagerApp extends BaseApp {
    constructor() {
        super();
        this.tabs = ["Official Cases", "Accepted Jobs", "Stats"];
        this.activeTab = "Official Cases";

        // Selection States
        this.selectedCaseId = null;
        this.selectedJobId = null;
        this.selectedAction = null;
        this.selectedThreat = null;

        // UI Region Caches
        this.tabsRects = [];
        this.actionButtons = [];
        this.threatButtons = [];
        this.submitButton = null;
    }

    /**
     * Helper to find a specific job post from the fake internet site.
     */
    getJobDetails(jobId) {
        if (!state.world.sites || !state.world.sites["pleasefindthem.com"]) return null;
        const posts = state.world.sites["pleasefindthem.com"].posts || [];
        return posts.find(p => p.id === jobId);
    }

    handleClick(globalX, globalY, contentRect) {
        const { x, y } = this.getLocalCoords(globalX, globalY, contentRect);

        // 1. Check Tabs
        for (const tab of this.tabsRects) {
            if (this.isInside(x, y, tab.x, tab.y, tab.w, tab.h)) {
                this.activeTab = tab.label;
                // Reset selections when switching tabs
                this.selectedCaseId = null;
                this.selectedJobId = null;
                this.selectedAction = null;
                this.selectedThreat = null;
                this.scrollY = 0;
                return;
            }
        }

        // 2. Check Content
        const startY = 60;
        const rowH = 32;
        let list = [];

        if (this.activeTab === "Official Cases") {
            // Handle Official Case Interactions
            const officialCase = state.world.case;
            if (officialCase) {
                // Check Main Row Click
                if (this.isInside(x, y, 0, startY, contentRect.width, rowH)) {
                    this.selectedCaseId = (this.selectedCaseId === officialCase.id) ? null : officialCase.id;
                    return;
                }

                // If expanded, check internal buttons
                if (this.selectedCaseId === officialCase.id) {
                    // Check Action Buttons
                    for (const b of this.actionButtons) {
                        if (this.isInside(x, y, b.x, b.y, b.w, b.h)) {
                            this.selectedAction = b.id;
                            return;
                        }
                    }
                    // Check Threat Buttons
                    for (const b of this.threatButtons) {
                        if (this.isInside(x, y, b.x, b.y, b.w, b.h)) {
                            this.selectedThreat = b.id;
                            return;
                        }
                    }
                    // Check Submit Button
                    const s = this.submitButton;
                    if (s && this.isInside(x, y, s.x, s.y, s.w, s.h)) {
                        if (this.selectedAction && this.selectedThreat) {
                            evaluateCaseVerdict(this.selectedAction, this.selectedThreat, "submit");
                        }
                        return;
                    }
                }
            }
        }
        else if (this.activeTab === "Accepted Jobs") {
            // Handle Accepted Jobs Interactions
            list = state.acceptedJobs.map(id => this.getJobDetails(id)).filter(j => j);

            let rowY = startY;
            for (let i = 0; i < list.length; i++) {
                const item = list[i];
                if (this.isInside(x, y, 0, rowY, contentRect.width, rowH)) {
                    this.selectedJobId = (this.selectedJobId === item.id) ? null : item.id;
                    return;
                }

                rowY += rowH;
                // If this item is expanded, skip the detail height for the next item's check
                if (this.selectedJobId === item.id) {
                    rowY += 220;
                }
            }
        }
    }

    render(ctx, rect) {
        // Clear background with scroll handling
        super.render(ctx, rect);

        const colors = this.getColors();
        const fonts = this.getFonts();

        // Reset hit regions
        this.tabsRects = [];
        this.actionButtons = [];
        this.threatButtons = [];
        this.submitButton = null;

        ctx.save();
        ctx.translate(rect.x, rect.y);

        // We add this.scrollY to draw them "down" as we scroll, keeping them fixed relative to the window
        const tabY = 8 + this.scrollY;
        let tabX = 8;
        const tabH = 30;

        // Tab Bar Background
        ctx.fillStyle = colors.windowBg;
        ctx.fillRect(0, this.scrollY, rect.width, 50);
        ctx.fillStyle = colors.windowBorder;
        ctx.fillRect(0, this.scrollY + 49, rect.width, 1);

        for (const tab of this.tabs) {
            ctx.font = "12px system-ui";
            const w = ctx.measureText(tab).width + 24;
            const isSelected = this.activeTab === tab;

            ctx.fillStyle = isSelected ? colors.highlight : colors.taskbarItemBg;
            ctx.fillRect(tabX, tabY, w, tabH);

            // Draw Tab Border
            ctx.strokeStyle = colors.windowBorder;
            ctx.strokeRect(tabX, tabY, w, tabH);

            ctx.fillStyle = isSelected ? "#ffffff" : colors.taskbarItemText;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(tab, tabX + w/2, tabY + tabH/2);

            // Store hit region using the SCROLLED Y
            this.tabsRects.push({ label: tab, x: tabX, y: tabY, w: w, h: tabH });
            tabX += w + 4;
        }

        const startY = 60; // Start below the tab bar
        let y = startY;
        const rowH = 32;

        if (this.activeTab === "Official Cases") {
            const officialCase = state.world.case;
            if (officialCase) {
                const isSelected = this.selectedCaseId === officialCase.id;

                // Draw Case Header Row
                ctx.fillStyle = isSelected ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.05)";
                ctx.fillRect(0, y, rect.width, rowH);
                ctx.strokeStyle = colors.windowBorder;
                ctx.strokeRect(0, y, rect.width, rowH);

                ctx.fillStyle = isSelected ? "#ffffff" : colors.contentText;
                ctx.textAlign = "left";

                // Safety check for report
                const title = officialCase.report?.complaint_title || "Unknown Case";
                const status = officialCase.verdict?.evaluated ? "[RESOLVED]" : "[ACTIVE]";

                ctx.fillText(`${status} ${title}`, 10, y + rowH/2);
                y += rowH;

                // Draw Details if Expanded
                if (isSelected) {
                    y = this.renderOfficialCaseDetails(ctx, rect, y, officialCase, colors, fonts);
                }
            } else {
                ctx.fillStyle = colors.contentText;
                ctx.textAlign = "center";
                ctx.fillText("No official case active tonight.", rect.width/2, y + 40);
                y += 40;
            }
        }

        else if (this.activeTab === "Accepted Jobs") {
            const acceptedJobs = state.acceptedJobs || [];

            if (acceptedJobs.length > 0) {
                for(const jobId of acceptedJobs) {
                    const job = this.getJobDetails(jobId);
                    if (!job) continue;

                    const isSelected = this.selectedJobId === job.id;

                    // Header Row
                    ctx.fillStyle = isSelected ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.05)";
                    ctx.fillRect(0, y, rect.width, rowH);
                    ctx.strokeStyle = colors.windowBorder;
                    ctx.strokeRect(0, y, rect.width, rowH);

                    ctx.fillStyle = isSelected ? "#ffffff" : colors.contentText;
                    ctx.textAlign = "left";
                    ctx.fillText(`[JOB] ${job.title} (${job.reward} E€E)`, 10, y + rowH/2);
                    y += rowH;

                    // Details
                    if (isSelected) {
                        y = this.renderAcceptedJobDetails(ctx, rect, y, job, colors, fonts);
                    }
                }
            } else {
                ctx.fillStyle = colors.contentText;
                ctx.textAlign = "center";
                ctx.fillText("No jobs accepted from PleaseFindThem.com.", rect.width/2, y + 40);
                y += 40;
            }
        }

        else if (this.activeTab === "Stats") {
            ctx.fillStyle = colors.titleText;
            ctx.textAlign = "left";
            ctx.font = fonts.title;
            ctx.fillText("Investigator Performance", 10, y + 20);
            y += 40;

            ctx.font = fonts.ui;
            ctx.fillStyle = colors.contentText;

            const total = state.caseStats.totalDecided || 0;
            const correct = state.caseStats.correctCriminalCalls || 0;
            const percent = total > 0 ? ((correct / total) * 100).toFixed(1) : "0.0";

            ctx.fillText(`Total Cases Closed: ${total}`, 10, y); y += 20;
            ctx.fillText(`Accurate Assessments: ${correct}`, 10, y); y += 20;
            ctx.fillText(`Accuracy Rating: ${percent}%`, 10, y); y += 40;

            ctx.fillStyle = colors.highlight;
            ctx.fillText(`Last Verdict Summary:`, 10, y); y += 20;
            ctx.fillStyle = colors.contentText;

            const summary = state.caseStats.lastVerdictSummary || "N/A";
            // Simple wrap for summary
            const words = summary.split(" ");
            let line = "";
            for(let w of words) {
                if (ctx.measureText(line + w).width > rect.width - 20) {
                    ctx.fillText(line, 10, y);
                    line = "";
                    y += 16;
                }
                line += w + " ";
            }
            ctx.fillText(line, 10, y);
            y += 40;
        }

        // Set total content height so BaseApp knows when to show scrollbar
        this.contentHeight = y + 20;

        ctx.restore();
    }

    renderAcceptedJobDetails(ctx, rect, startY, job, colors, fonts) {
        let y = startY;
        const h = 220;

        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(0, y, rect.width, h);

        y += 20;
        ctx.fillStyle = colors.titleText;
        ctx.font = fonts.title;
        ctx.fillText("Job Requirements", 10, y);
        y += 20;

        ctx.font = fonts.ui;
        ctx.fillStyle = colors.contentText;
        ctx.fillText(`Target Citizen ID:`, 10, y);
        ctx.fillStyle = "#fff";
        ctx.fillText(job.citizenId, 120, y);
        y += 20;

        ctx.fillStyle = colors.contentText;
        ctx.fillText(`Payment:`, 10, y);
        ctx.fillStyle = "#ffcc66";
        ctx.fillText(`${job.reward} E€E`, 120, y);
        y += 20;

        ctx.fillStyle = colors.contentText;
        ctx.fillText("Client Message:", 10, y);
        y += 20;

        // Wrap Content
        ctx.fillStyle = "#cccccc";
        const words = job.content.split(" ");
        let line = "";
        for(let w of words) {
            if (ctx.measureText(line + w).width > rect.width - 40) {
                ctx.fillText(line, 20, y);
                line = "";
                y += 16;
            }
            line += w + " ";
        }
        ctx.fillText(line, 20, y);
        y += 30;

        ctx.fillStyle = "#44ff44";
        ctx.fillText("ACTION: Use Citizen_DB & ID_DB to identify target.", 10, y);

        return startY + h;
    }

    renderOfficialCaseDetails(ctx, rect, startY, officialCase, colors, fonts) {
        let y = startY;

        // Background
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.fillRect(0, y, rect.width, 420); // Height of detail view

        y += 24;
        ctx.fillStyle = colors.titleText;
        ctx.font = fonts.title;
        ctx.fillText("Incident Report", 10, y);
        y += 20;

        ctx.font = fonts.ui;
        ctx.fillStyle = colors.contentText;

        // Complaint Text Wrap
        const reportText = officialCase.report?.complaint_text || "Data corrupted.";
        const words = reportText.split(" ");
        let line = "";
        for(let w of words) {
            if (ctx.measureText(line + w).width > rect.width - 30) {
                ctx.fillText(line, 15, y);
                line = "";
                y += 16;
            }
            line += w + " ";
        }
        ctx.fillText(line, 15, y);
        y += 24;

        // Target Info
        ctx.fillStyle = colors.titleText;
        ctx.fillText("Target Information:", 10, y); y += 16;
        ctx.fillStyle = "#4caf50";
        ctx.fillText(`Citizen ID: ${officialCase.targetCitizenId || "UNKNOWN"}`, 20, y); y += 16;

        // Evidence Log
        y += 8;
        ctx.fillStyle = colors.titleText;
        ctx.fillText("Evidence Log:", 10, y); y += 16;

        const evidence = officialCase.evidence || [];

        if (evidence.length === 0) {
            ctx.fillStyle = "#888";
            ctx.fillText("- No digital evidence found.", 20, y); y += 16;
        } else {
            for (const ev of evidence) {
                // Ensure ev is a string or object we can render
                const txt = typeof ev === 'string' ? ev : `Evidence: ${ev.type || 'Unknown'}`;
                ctx.fillStyle = colors.contentText;
                ctx.fillText(`- ${txt}`, 20, y);
                y += 16;
            }
        }

        y += 20;
        ctx.fillStyle = colors.highlight;
        ctx.fillText("Submit Verdict", 10, y);
        y += 20;

        if (officialCase.verdict && officialCase.verdict.evaluated) {
            // Already submitted
            ctx.fillStyle = "#888";
            ctx.fillText("Verdict has been submitted and locked.", 20, y);
            y += 20;
            ctx.fillStyle = "#fff";
            ctx.fillText(`Result: ${officialCase.verdict.summary}`, 20, y);
        } else {
            const btnW = 80;
            const btnH = 24;
            const gap = 10;
            let bx = 20;

            const actions = [{id:"flag",l:"FLAG"},{id:"monitor",l:"MONITOR"},{id:"ignore",l:"IGNORE"}];
            for (const a of actions) {
                const sel = this.selectedAction === a.id;
                ctx.fillStyle = sel ? "#2d7a3e" : "#30374a";
                ctx.fillRect(bx, y, btnW, btnH);
                ctx.strokeStyle = colors.windowBorder;
                ctx.strokeRect(bx, y, btnW, btnH);

                ctx.fillStyle = "#fff";
                ctx.textAlign = "center";
                ctx.fillText(a.l, bx+btnW/2, y+btnH/2);

                // Store button rect relative to CONTENT SCROLL
                this.actionButtons.push({id: a.id, x: bx, y, w: btnW, h: btnH});
                bx += btnW + gap;
            }

            y += 40;
            bx = 20;
            ctx.textAlign = "left";

            const threats = [{id:"low",l:"LOW"},{id:"medium",l:"MEDIUM"},{id:"high",l:"HIGH"}];
            for (const t of threats) {
                const sel = this.selectedThreat === t.id;
                ctx.fillStyle = sel ? "#945ad1" : "#30374a";
                ctx.fillRect(bx, y, btnW, btnH);
                ctx.strokeStyle = colors.windowBorder;
                ctx.strokeRect(bx, y, btnW, btnH);

                ctx.fillStyle = "#fff";
                ctx.textAlign = "center";
                ctx.fillText(t.l, bx+btnW/2, y+btnH/2);

                this.threatButtons.push({id: t.id, x: bx, y, w: btnW, h: btnH});
                bx += btnW + gap;
            }

            y += 40;
            const subW = 140;
            const subX = 20;
            const canSubmit = this.selectedAction && this.selectedThreat;

            ctx.fillStyle = canSubmit ? "#2d7a3e" : "#444";
            ctx.fillRect(subX, y, subW, 28);
            ctx.fillStyle = canSubmit ? "#fff" : "#888";
            ctx.textAlign = "center";
            ctx.fillText("SUBMIT REPORT", subX + subW/2, y + 14);

            this.submitButton = {x: subX, y, w: subW, h: 28};
        }

        // Return the Y position where we stopped drawing
        return startY + 420;
    }
}