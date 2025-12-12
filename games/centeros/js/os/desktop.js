import { themeManager } from "./theme.js";
import { isAppInstalled } from "../state.js";
import { fs } from "./fileSystem.js";
import { notificationManager } from "./notificationManager.js";
import { contextMenuManager } from "./contextMenuManager.js";
import { startMenu } from "./startMenu.js";
import { audioManager } from "./audioManager.js";
import { appRegistry } from "./appRegistry.js";

export class Desktop {
    constructor(networkManager, atmosphereManager) {
        this.networkManager = networkManager;
        this.atmosphereManager = atmosphereManager;
        this.windowManager = null;

        this.wallpaper = new Image();
        this.wallpaper.src = "wallpaper.jpg";
        this.wallpaperLoaded = false;
        this.wallpaper.onload = () => this.wallpaperLoaded = true;

        this.allIcons = [];
        this.desktopIcons = [];

        this.taskbarPosition = "bottom";
        this.taskbarSize = 40;
        this.taskbarRect = { x:0, y:0, w:0, h:0 };
        this.renderedWindows = [];

        window.addEventListener("centeros-app-installed", () => {
            this.refreshIconPositions();
        });
    }

    setWindowManager(wm) {
        this.windowManager = wm;
        this.updateLayout();
    }

    setTaskbarPosition(pos) {
        this.taskbarPosition = pos;
        this.updateLayout();
    }

    updateLayout() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const s = this.taskbarSize;

        if (this.taskbarPosition === "bottom") this.taskbarRect = { x:0, y:h-s, w:w, h:s };
        else if (this.taskbarPosition === "top") this.taskbarRect = { x:0, y:0, w:w, h:s };
        else if (this.taskbarPosition === "left") this.taskbarRect = { x:0, y:0, w:s, h:h };
        else if (this.taskbarPosition === "right") this.taskbarRect = { x:w-s, y:0, w:s, h:h };

        if (this.windowManager) {
            let wa = { x:0, y:0, width:w, height:h };
            if (this.taskbarPosition === "bottom") wa.height -= s;
            if (this.taskbarPosition === "top") { wa.y += s; wa.height -= s; }
            if (this.taskbarPosition === "left") { wa.x += s; wa.width -= s; }
            if (this.taskbarPosition === "right") wa.width -= s;
            this.windowManager.setWorkArea(wa);
        }

        this.refreshIconPositions();
    }

    registerIcon(iconDef) {
        this.allIcons.push(iconDef);
        this.refreshIconPositions();
    }

    setCustomPanelRenderer(fn) {
        this.customPanelRenderer = fn;
    }

    refreshIconPositions() {
        const installed = this.allIcons.filter(icon => isAppInstalled(icon.id));
        const startX = (this.taskbarPosition === 'left' ? this.taskbarSize : 0) + 24;
        const startY = (this.taskbarPosition === 'top' ? this.taskbarSize : 0) + 24;
        const colWidth = 84;
        const rowHeight = 84;

        this.desktopIcons = installed.map((icon, index) => {
            const col = index % 3;
            const row = Math.floor(index / 3);
            return {
                ...icon,
                x: startX + col * colWidth,
                y: startY + row * rowHeight,
                type: 'app'
            };
        });

        const files = fs.desktop.children;
        const fileStartX = startX + 3 * colWidth + 40;
        files.forEach((file, index) => {
            if (file.type === "folder") return;
            const col = index % 4;
            const row = Math.floor(index / 4);
            this.desktopIcons.push({
                ...file,
                label: file.name,
                x: fileStartX + col * colWidth,
                y: startY + row * rowHeight,
                type: 'file',
                fileRef: file,
                color: "#aaaaaa"
            });
        });
    }

    handleRightClick(x, y) {

        audioManager.playClick();

        // 1. Check Icons
        for (const icon of this.desktopIcons) {
            const r = 48; // icon size
            if (x >= icon.x && x <= icon.x + r && y >= icon.y && y <= icon.y + r) {

                const actions = [
                    { label: "Open", action: () => this.handleIconClick(icon) }
                ];

                if (icon.type === 'file') {
                    actions.push({
                        label: "Delete",
                        action: () => {
                            fs.desktop.deleteChild(icon.fileRef.id);
                            this.refreshIconPositions();
                        }
                    });
                } else if (icon.type === 'app') {
                    actions.push({
                        label: "Uninstall",
                        condition: (icon.id !== "settings"),
                        action: () => {
                            // TODO: Logic to remove from state.installedApps
                            console.log("Uninstalling " + icon.label);
                        }
                    });
                }

                contextMenuManager.open(x, y, actions);
                return true;
            }
        }

        // 2. Wallpaper Click
        contextMenuManager.open(x, y, [
            { label: "Refresh Desktop", action: () => this.refreshIconPositions() },
            { label: "Personalize", action: () => {
                    const event = new CustomEvent("force-open-app", { detail: { id: "settings" } });
                    window.dispatchEvent(event);
                }},
            { label: "Taskbar Settings", action: () => { /* Switch top/bottom */ } }
        ]);
        return true;
    }

    // Helper to reuse click logic
    handleIconClick(icon) {

        audioManager.playClick();

        if (icon.type === 'app') {
            const event = new CustomEvent("force-open-app", { detail: { id: icon.id } });
            window.dispatchEvent(event);
        } else {
            this.handleFileOpen(icon.fileRef);
        }
    }

    handleClick(x, y) {

        audioManager.playClick();

        const tr = this.taskbarRect;
        if (x >= tr.x && x <= tr.x + tr.w && y >= tr.y && y <= tr.y + tr.h) {
            this.handleTaskbarClick(x, y);
            return true;
        }

        for (const icon of this.desktopIcons) {
            const r = 48;
            if (x >= icon.x && x <= icon.x + r && y >= icon.y && y <= icon.y + r) {
                if (icon.type === 'app') {
                    const event = new CustomEvent("force-open-app", { detail: { id: icon.id } });
                    window.dispatchEvent(event);
                } else {
                    this.handleFileOpen(icon.fileRef);
                }
                return true;
            }
        }
        return false;
    }

    handleTaskbarClick(x, y) {
        const tr = this.taskbarRect;
        const isHorizontal = (this.taskbarPosition === 'top' || this.taskbarPosition === 'bottom');
        const startBtnSize = 40;

        // Start Menu (Left/Top)
        const isStart = isHorizontal ? (x < tr.x + startBtnSize) : (y < tr.y + startBtnSize);
        if (isStart) {
            startMenu.toggle();
            return;
        }

        if (isHorizontal) {
            const rightEdge = tr.x + tr.w;

            if (x >= rightEdge - 50 && x <= rightEdge) {
                console.log("Bell clicked!"); // Debug to prove it hits
                notificationManager.togglePanel();
                return;
            }

            // 2. WiFi Click
            const wifiX = rightEdge - 85;
            if (x >= wifiX - 20 && x <= wifiX + 20) {
                this.openApp("net");
                return;
            }
        }

        // Window List Clicks
        for (const item of this.renderedWindows) {
            if (x >= item.x && x <= item.x + item.w && y >= item.y && y <= item.y + item.h) {
                if (item.win.id === this.windowManager.activeWindowId && !item.win.isMinimized) {
                    this.windowManager.minimizeWindow(item.win.id);
                } else {
                    this.windowManager.focusWindow(item.win.id);
                }
                return;
            }
        }
    }

    handleFileOpen(file) {
        const assignedAppId = appRegistry.getAppIdForExtension(file.extension);

        if (assignedAppId && isAppInstalled(assignedAppId)) {
            this.openApp(assignedAppId, {
                content: file.content,
                fileId: file.id,
                filePath: "desktop/" + file.name
            });
        } else {
            // Fallback to notepad
            this.openApp("notepad", { content: file.content });
        }
    }

    openApp(id, data) {
        const event = new CustomEvent("force-open-app", { detail: { id, data } });
        window.dispatchEvent(event);
    }

    render(ctx, canvasWidth, canvasHeight) {

        const drivers = fs.sys.find("drivers");
        const hasDisplayDriver = drivers && drivers.find("display.sys");

        if (!hasDisplayDriver) {
            // Driver missing: Render pure black
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);

            ctx.fillStyle = "#ffffff";
            ctx.font = "16px monospace";
            ctx.textAlign = "center";
            ctx.fillText("No Signal - Display Driver Not Found", canvasWidth/2, canvasHeight/2);
            return; // Don't render icons or taskbar
        }

        const colors = themeManager.get();

        if (this.wallpaperLoaded) {
            ctx.drawImage(this.wallpaper, 0, 0, canvasWidth, canvasHeight);
        } else {
            ctx.fillStyle = "#101318";
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }

        this.renderIcons(ctx);
        this.renderTaskbar(ctx, colors);
    }

    renderIcons(ctx) {
        for (const icon of this.desktopIcons) {
            this.renderIcon(ctx, icon);
        }
    }

    renderIcon(ctx, icon) {
        const style = themeManager.getStyle();
        const colors = themeManager.get();

        ctx.save();
        ctx.translate(icon.x, icon.y);

        let label = icon.label || "Unknown";
        if (label.length > 9) label = label.substring(0,8) + "..";

        if (style === "retro") {
            ctx.fillStyle = colors.windowBg;
            ctx.fillRect(4, 4, 40, 40);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(4, 4, 40, 1);
            ctx.fillRect(4, 4, 1, 40);
            ctx.fillStyle = "#808080";
            ctx.fillRect(4, 43, 40, 1);
            ctx.fillRect(43, 4, 1, 40);
            ctx.fillStyle = icon.color || "#cccccc";
            ctx.fillRect(8, 8, 32, 32);
            ctx.fillStyle = colors.contentText || "#ffffff";
            ctx.font = "11px system-ui";
            ctx.textAlign = "center";
            ctx.fillText(label, 24, 54);
        } else {
            ctx.fillStyle = "rgba(0,0,0,0.3)";
            ctx.fillRect(4, 4, 40, 40);
            ctx.fillStyle = icon.color || "#cccccc";
            ctx.fillRect(8, 8, 32, 32);
            ctx.fillStyle = "#ffffff";
            ctx.font = "11px system-ui";
            ctx.textAlign = "center";
            ctx.shadowColor = "black";
            ctx.shadowBlur = 4;
            ctx.fillText(label, 24, 54);
        }
        ctx.restore();
    }

    renderTaskbar(ctx, colors) {
        const tr = this.taskbarRect;
        const isHorizontal = (this.taskbarPosition === 'top' || this.taskbarPosition === 'bottom');

        const startSize = 40;

        ctx.save();
        ctx.fillStyle = colors.taskbarBg;
        ctx.fillRect(tr.x, tr.y, tr.w, tr.h);

        ctx.strokeStyle = colors.taskbarBorder;
        ctx.lineWidth = 1;
        if (this.taskbarPosition === 'bottom') ctx.strokeRect(tr.x, tr.y, tr.w, 0);
        if (this.taskbarPosition === 'top') ctx.strokeRect(tr.x, tr.y + tr.h, tr.w, 0);
        if (this.taskbarPosition === 'left') ctx.strokeRect(tr.x + tr.w, tr.y, 0, tr.h);
        if (this.taskbarPosition === 'right') ctx.strokeRect(tr.x, tr.y, 0, tr.h);

        // Start Button
        ctx.fillStyle = colors.highlight;
        if (isHorizontal) ctx.fillRect(tr.x + 2, tr.y + 2, startSize, tr.h - 4);

        // Draw Logo
        ctx.fillStyle = "#000";
        ctx.font = "bold 18px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const btnCx = tr.x + 2 + startSize/2;
        const btnCy = tr.y + 2 + (tr.h-4)/2;
        ctx.fillText("c", btnCx, btnCy);

        this.renderedWindows = [];
        if (this.windowManager) {
            const wins = this.windowManager.windows;
            const itemW = isHorizontal ? 120 : tr.w - 4;
            const itemH = isHorizontal ? tr.h - 4 : 40;
            const gap = 2;
            let offset = startSize + 6;

            for (const win of wins) {
                const isActive = win.id === this.windowManager.activeWindowId && !win.isMinimized;
                let ix, iy;
                if (isHorizontal) {
                    ix = tr.x + offset;
                    iy = tr.y + 2;
                } else {
                    ix = tr.x + 2;
                    iy = tr.y + offset;
                }

                ctx.fillStyle = isActive ? colors.taskbarItemBgActive : colors.taskbarItemBg;
                ctx.fillRect(ix, iy, itemW, itemH);
                ctx.fillStyle = isActive ? colors.taskbarItemTextActive : colors.taskbarItemText;
                ctx.font = "11px system-ui";
                ctx.textAlign = "left";
                ctx.textBaseline = "middle";

                ctx.save();
                ctx.beginPath();
                ctx.rect(ix, iy, itemW, itemH);
                ctx.clip();
                ctx.fillText(win.title, ix + 8, iy + itemH/2);
                ctx.restore();

                if (isActive) {
                    ctx.fillStyle = colors.highlight;
                    if (isHorizontal) ctx.fillRect(ix, iy + itemH - 2, itemW, 2);
                    else ctx.fillRect(ix, iy, 2, itemH);
                }

                this.renderedWindows.push({ win, x: ix, y: iy, w: itemW, h: itemH });
                offset += (isHorizontal ? itemW : itemH) + gap;
            }
        }

        // Draw Custom Panel
        if (isHorizontal) {
            if (this.customPanelRenderer) {
                this.customPanelRenderer(ctx, tr.w, tr.h, this.taskbarSize);
            }

            const centerY = tr.y + tr.h/2;
            const rightEdge = tr.x + tr.w;

            // --- WIFI ICON ---
            const wifiX = rightEdge - 85;
            ctx.fillStyle = "#ffffff";
            ctx.beginPath(); ctx.arc(wifiX, centerY + 4, 2, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(wifiX, centerY + 4, 6, Math.PI * 1.25, Math.PI * 1.75); ctx.stroke();
            const net = this.networkManager.getConnectedNetwork();
            if (net) { ctx.beginPath(); ctx.arc(wifiX, centerY + 4, 10, Math.PI * 1.25, Math.PI * 1.75); ctx.stroke(); }

            // --- BELL ICON ---
            const bellX = rightEdge - 25;
            const bellY = centerY;

            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(bellX, bellY - 2, 6, Math.PI, 0);
            ctx.lineTo(bellX + 8, bellY + 6);
            ctx.lineTo(bellX - 8, bellY + 6);
            ctx.fill();
            ctx.beginPath(); ctx.arc(bellX, bellY + 6, 2, 0, Math.PI*2); ctx.fill();

            // Notification Badge
            const count = notificationManager.getUnreadCount();
            if (count > 0) {
                ctx.fillStyle = "#ff4444";
                ctx.beginPath(); ctx.arc(bellX + 6, bellY - 6, 4, 0, Math.PI*2); ctx.fill();
            }

            // Focus Assist Badge
            if (notificationManager.doNotDisturb) {
                ctx.fillStyle = "#000"; // Cutout
                ctx.beginPath(); ctx.arc(bellX + 2, bellY + 2, 3, 0, Math.PI*2); ctx.fill();
            }
        }
        ctx.restore();
    }
}