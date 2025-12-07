import { BaseApp } from "../core/baseApp.js";
import { themeManager, THEMES } from "../os/theme.js";

export class SettingsApp extends BaseApp {
    constructor() {
        super();
        this.activeTab = "display";
        this.buttons = [];
        this.fontOptions = [
            { id: "system-ui", label: "Modern (System)" },
            { id: "Tahoma, sans-serif", label: "Classic (Tahoma)" },
            { id: "Courier New, monospace", label: "Terminal (Mono)" },
            { id: "Georgia, serif", label: "Formal (Serif)" }
        ];
        this.taskbarOptions = [
            { id: "bottom", label: "Bottom" },
            { id: "top", label: "Top" },
            { id: "left", label: "Left" },
            { id: "right", label: "Right" }
        ];
    }

    handleClick(globalX, globalY, contentRect) {
        const { x, y } = this.getLocalCoords(globalX, globalY, contentRect);

        for (const btn of this.buttons) {
            if (this.isInside(x, y, btn.x, btn.y, btn.w, btn.h)) {
                this.handleAction(btn.action, btn.payload);
                return;
            }
        }
    }

    handleAction(action, payload) {
        if (action === "tab") {
            this.activeTab = payload;
        } else if (action === "theme") {
            themeManager.setTheme(payload);
            const event = new CustomEvent("centeros-settings-change", { detail: { type: "theme", value: payload } });
            window.dispatchEvent(event);
        } else if (action === "font") {
            themeManager.setFont(payload);
            const event = new CustomEvent("centeros-settings-change", { detail: { type: "font", value: payload } });
            window.dispatchEvent(event);
        } else if (action === "taskbar") {
            const event = new CustomEvent("centeros-settings-change", { detail: { type: "taskbar", value: payload } });
            window.dispatchEvent(event);
        }
    }

    render(ctx, rect) {
        super.render(ctx, rect);
        this.buttons = [];
        const colors = this.getColors();
        const fonts = this.getFonts();

        // Draw Sidebar
        const sidebarW = 130;
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.fillRect(rect.x, rect.y, sidebarW, rect.height);

        ctx.strokeStyle = colors.windowBorder;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(rect.x + sidebarW + 0.5, rect.y);
        ctx.lineTo(rect.x + sidebarW + 0.5, rect.y + rect.height);
        ctx.stroke();

        // Render Tabs
        const tabs = [{ id: "display", label: "Appearance" }, { id: "taskbar", label: "Taskbar" }, { id: "about", label: "System Info" }];
        let tabY = 16;
        for (const tab of tabs) {
            const isActive = this.activeTab === tab.id;
            const lx = 8, ly = tabY, lw = sidebarW - 16, lh = 32;
            const ax = rect.x + lx, ay = rect.y + ly;

            if (isActive) {
                ctx.fillStyle = colors.highlight;
                ctx.fillRect(ax, ay, lw, lh);
                ctx.fillStyle = "#ffffff";
            } else {
                ctx.fillStyle = colors.titleText;
            }

            ctx.font = fonts.ui;
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.fillText(tab.label, ax + 10, ay + lh / 2);

            this.buttons.push({ x: lx, y: ly, w: lw, h: lh, action: "tab", payload: tab.id });
            tabY += 40;
        }

        // Render Content
        const contentLocalX = sidebarW + 20;
        const contentLocalY = 20;
        const contentW = rect.width - sidebarW - 40;

        ctx.save();
        ctx.translate(rect.x + contentLocalX, rect.y + contentLocalY);

        if (this.activeTab === "display") this.renderDisplayTab(ctx, contentW, fonts, colors, contentLocalX, contentLocalY);
        else if (this.activeTab === "taskbar") this.renderTaskbarTab(ctx, contentW, fonts, colors, contentLocalX, contentLocalY);
        else if (this.activeTab === "about") this.renderAboutTab(ctx, contentW, fonts, colors);

        ctx.restore();
    }

    renderDisplayTab(ctx, w, fonts, colors, offsetX, offsetY) {
        let y = 0;
        ctx.fillStyle = colors.titleTextActive;
        ctx.font = fonts.title;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText("Theme", 0, y);
        y += 24;

        for (const key of Object.keys(THEMES)) {
            const theme = THEMES[key];
            const isActive = themeManager.current.id === theme.id;
            this.drawRadio(ctx, 0, y, theme.name, isActive, colors, fonts);
            this.buttons.push({ x: offsetX, y: offsetY + y, w: 200, h: 20, action: "theme", payload: key });
            y += 26;
        }

        y += 16;
        ctx.fillStyle = colors.titleTextActive;
        ctx.font = fonts.title;
        ctx.fillText("System Font", 0, y);
        y += 24;

        for (const f of this.fontOptions) {
            const isActive = themeManager.fontFamily === f.id;
            this.drawRadio(ctx, 0, y, f.label, isActive, colors, fonts);
            this.buttons.push({ x: offsetX, y: offsetY + y, w: 200, h: 20, action: "font", payload: f.id });
            y += 26;
        }
    }

    renderTaskbarTab(ctx, w, fonts, colors, offsetX, offsetY) {
        let y = 0;
        ctx.fillStyle = colors.titleTextActive;
        ctx.font = fonts.title;
        ctx.fillText("Taskbar Position", 0, y);
        y += 24;

        for (const opt of this.taskbarOptions) {
            const btnW = 120, btnH = 30;
            ctx.fillStyle = colors.taskbarBg;
            ctx.fillRect(0, y, btnW, btnH);
            ctx.strokeStyle = colors.windowBorder;
            ctx.strokeRect(0, y, btnW, btnH);

            ctx.fillStyle = colors.titleText;
            ctx.font = fonts.ui;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(opt.label, btnW / 2, y + btnH / 2);

            this.buttons.push({ x: offsetX, y: offsetY + y, w: btnW, h: btnH, action: "taskbar", payload: opt.id });
            y += 40;
        }
    }

    renderAboutTab(ctx, w, fonts, colors) {
        let y = 0;
        ctx.fillStyle = colors.titleTextActive;
        ctx.font = "bold 16px system-ui";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText("CenterOS v1.1", 0, y);
        y += 30;
        ctx.font = fonts.ui;
        ctx.fillStyle = colors.titleText;
        ctx.fillText("Kernel: LTS2007", 0, y); y += 20;
        ctx.fillText("User: User1351", 0, y); y += 30;
        ctx.fillText("A secure environment from Center.", 0, y);
    }

    drawRadio(ctx, x, y, label, isActive, colors, fonts) {
        const r = 8;
        const cy = y + 10;
        ctx.strokeStyle = colors.titleText;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x + r, cy, r, 0, Math.PI * 2);
        ctx.stroke();

        if (isActive) {
            ctx.fillStyle = colors.highlight;
            ctx.beginPath();
            ctx.arc(x + r, cy, r - 3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.fillStyle = colors.titleText;
        ctx.font = fonts.ui;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(label, x + r * 3, cy);
    }
}