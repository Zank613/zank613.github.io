import { BaseApp } from "../core/baseApp.js";
import { themeManager, THEMES } from "../os/theme.js";

export class SettingsApp extends BaseApp {
    constructor() {
        super();
        this.tabs = ["Appearance", "Taskbar", "System Info"];
        this.activeTab = "Appearance";
        this.tabsRects = [];
        this.radioButtons = [];
    }

    handleClick(globalX, globalY, contentRect) {
        const { x, y } = this.getLocalCoords(globalX, globalY, contentRect);

        // 1. Tab Clicks
        for (const tab of this.tabsRects) {
            if (this.isInside(x, y, tab.x, tab.y, tab.w, tab.h)) {
                this.activeTab = tab.label;
                return;
            }
        }

        // 2. Radio Button Clicks
        for (const rb of this.radioButtons) {
            if (this.isInside(x, y, rb.x, rb.y, rb.w, rb.h)) {
                if (rb.group === 'theme') themeManager.setTheme(rb.id);
                else if (rb.group === 'font') themeManager.setFont(rb.id);
                else if (rb.group === 'controls') themeManager.setWindowControls(rb.id);
                else if (rb.group === 'taskbar') {
                    const event = new CustomEvent("centeros-settings-change", { detail: { type: "taskbar", value: rb.id } });
                    window.dispatchEvent(event);
                }
                return;
            }
        }
    }

    render(ctx, rect) {
        super.render(ctx, rect);
        const colors = this.getColors();
        const fonts = this.getFonts();

        this.tabsRects = [];
        this.radioButtons = [];

        ctx.save();
        ctx.translate(rect.x, rect.y);

        const w = rect.width;
        const h = rect.height;
        const sidebarW = 140;

        // Sidebar
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.fillRect(0, 0, sidebarW, h);

        ctx.strokeStyle = colors.windowBorder;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sidebarW, 0);
        ctx.lineTo(sidebarW, h);
        ctx.stroke();

        // Tabs
        let tabY = 20;
        for (const tab of this.tabs) {
            const isActive = this.activeTab === tab;

            if (isActive) {
                ctx.fillStyle = colors.highlight;
                ctx.fillRect(0, tabY, sidebarW, 36);
                ctx.fillStyle = "#ffffff";
            } else {
                ctx.fillStyle = colors.titleText;
            }

            ctx.font = fonts.ui;
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.fillText(tab, 16, tabY + 18);

            this.tabsRects.push({ label: tab, x: 0, y: tabY, w: sidebarW, h: 36 });
            tabY += 46;
        }

        ctx.translate(sidebarW, 0);

        // Drawing starts at 0 relative to content area
        const contentX = 0;

        if (this.activeTab === "Appearance") {
            this.renderAppearanceTab(ctx, contentX, colors, fonts, sidebarW);
        } else if (this.activeTab === "Taskbar") {
            this.renderTaskbarTab(ctx, contentX, colors, fonts, sidebarW);
        } else if (this.activeTab === "System Info") {
            this.renderSystemInfoTab(ctx, contentX, colors, fonts);
        }

        ctx.restore();
    }

    renderAppearanceTab(ctx, startX, colors, fonts, offsetX) {
        let y = 30;
        const col1_X = startX + 30;  // Visual X (30)
        const col2_X = startX + 280; // Visual X (280)

        const col1_hitX = col1_X + offsetX; // 170
        const col2_hitX = col2_X + offsetX; // 420

        // 1. Theme Section
        ctx.fillStyle = colors.titleText;
        ctx.font = fonts.title;
        ctx.textAlign = "left";
        ctx.fillText("Theme", col1_X, y);
        y += 30;

        const currentTheme = themeManager.current.id;
        const themeOpts = [
            { id: 'ORIGINAL', label: 'CenterOS Original' },
            { id: 'CYBER', label: 'Cyber Dark' },
            { id: 'RETRO', label: 'Windows 95-ish' }
        ];

        themeOpts.forEach(t => {
            const isSelected = currentTheme.toUpperCase() === t.id;
            this.renderRadioButton(ctx, col1_X, y, t.label, isSelected, colors, fonts);
            this.radioButtons.push({ group: 'theme', id: t.id, x: col1_hitX, y: y - 10, w: 200, h: 24 });
            y += 30;
        });

        // 2. System Font Section
        y += 10;
        ctx.fillStyle = colors.titleText;
        ctx.font = fonts.title;
        ctx.fillText("System Font", col1_X, y);
        y += 30;

        const currentFont = themeManager.fontFamily;
        const fontOpts = [
            { id: 'system-ui', label: 'Modern (System)' },
            { id: 'Tahoma, sans-serif', label: 'Classic (Tahoma)' },
            { id: 'Courier New, monospace', label: 'Terminal (Mono)' },
            { id: 'Georgia, serif', label: 'Formal (Serif)' }
        ];

        fontOpts.forEach(f => {
            this.renderRadioButton(ctx, col1_X, y, f.label, currentFont === f.id, colors, fonts);
            this.radioButtons.push({ group: 'font', id: f.id, x: col1_hitX, y: y - 10, w: 200, h: 24 });
            y += 30;
        });

        // 3. Window Controls Section (Col 2)
        let y2 = 30;

        ctx.fillStyle = colors.titleText;
        ctx.font = fonts.title;
        ctx.fillText("Window Controls", col2_X, y2);
        y2 += 30;

        const currentControls = themeManager.getWindowControls();
        const controlOpts = [
            { id: 'centeros', label: 'CenterOS (Circles)' },
            { id: 'classic', label: 'Classic (Redmond)' },
            { id: 'retro', label: 'Retro (Pixel)' }
        ];

        controlOpts.forEach(c => {
            this.renderRadioButton(ctx, col2_X, y2, c.label, currentControls === c.id, colors, fonts);
            this.radioButtons.push({ group: 'controls', id: c.id, x: col2_hitX, y: y2 - 10, w: 200, h: 24 });
            y2 += 30;
        });
    }

    renderTaskbarTab(ctx, startX, colors, fonts, offsetX) {
        let y = 30;
        const x = startX + 30; // Visual X
        const hitX = x + offsetX; // Hit X

        ctx.fillStyle = colors.titleText;
        ctx.font = fonts.title;
        ctx.textAlign = "left";
        ctx.fillText("Taskbar Position", x, y);
        y += 30;

        const opts = [
            { id: "bottom", label: "Bottom" },
            { id: "top", label: "Top" },
            { id: "left", label: "Left" },
            { id: "right", label: "Right" }
        ];

        for (const opt of opts) {
            ctx.fillStyle = colors.taskbarBg;
            ctx.fillRect(x, y, 120, 30);
            ctx.strokeStyle = colors.windowBorder;
            ctx.strokeRect(x, y, 120, 30);

            ctx.fillStyle = colors.titleText;
            ctx.font = fonts.ui;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(opt.label, x + 60, y + 15);

            this.radioButtons.push({ group: 'taskbar', id: opt.id, x: hitX, y: y, w: 120, h: 30 });
            y += 45;
        }
    }

    renderSystemInfoTab(ctx, startX, colors, fonts) {
        let y = 30;
        const x = startX + 30;

        ctx.fillStyle = colors.titleTextActive;
        ctx.font = "bold 18px system-ui";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText("CenterOS v1.1", x, y);
        y += 40;

        ctx.font = fonts.ui;
        ctx.fillStyle = colors.titleText;

        const info = [
            "Kernel: LTS2007",
            "User: User1351",
            "Security Level: High",
            " ",
            "A secure environment from Center.",
            "Authorized personnel only."
        ];

        for(const line of info) {
            ctx.fillText(line, x, y);
            y += 24;
        }

        ctx.strokeStyle = colors.highlight;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y + 20, 60, 60);
        ctx.fillStyle = colors.highlight;
        ctx.font = "bold 24px monospace";
        ctx.textAlign = "center";
        ctx.fillText("C", x + 30, y + 58);
    }

    renderRadioButton(ctx, x, y, label, isSelected, colors, fonts) {
        ctx.strokeStyle = colors.contentText;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x + 10, y, 7, 0, Math.PI * 2);
        ctx.stroke();

        if (isSelected) {
            ctx.fillStyle = colors.highlight;
            ctx.beginPath();
            ctx.arc(x + 10, y, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = colors.contentText;
        ctx.font = fonts.ui;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(label, x + 28, y + 1);
    }
}