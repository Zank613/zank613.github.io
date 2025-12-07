import { themeManager } from "./theme.js";
import { isAppInstalled } from "../state.js";
import { fs } from "./fileSystem.js";

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

    handleClick(x, y) {
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
        const isHorizontal = (this.taskbarPosition === 'top' || this.taskbarPosition === 'bottom');
        const startBtnSize = 40;

        // Start Menu (Left/Top)
        const isStart = isHorizontal ? (x < this.taskbarRect.x + startBtnSize) : (y < this.taskbarRect.y + startBtnSize);
        if (isStart) {
            console.log("Start Menu Clicked (ToDo)");
            return;
        }

        if (isHorizontal) {
            const wifiX = this.taskbarRect.w - 85;
            if (x >= wifiX - 15 && x <= wifiX + 15) {
                this.openApp("net");
                return;
            }
        }

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
        if (file.isEncrypted) {
            this.openApp("notepad", { content: `LOCKED: ${file.originalType}` });
        } else {
            this.openApp("notepad", { content: file.content });
        }
    }

    openApp(id, data) {
        const event = new CustomEvent("force-open-app", { detail: { id, data } });
        window.dispatchEvent(event);
    }

    render(ctx, canvasWidth, canvasHeight) {
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

        ctx.save();
        ctx.fillStyle = colors.taskbarBg;
        ctx.fillRect(tr.x, tr.y, tr.w, tr.h);

        ctx.strokeStyle = colors.taskbarBorder;
        ctx.lineWidth = 1;
        if (this.taskbarPosition === 'bottom') ctx.strokeRect(tr.x, tr.y, tr.w, 0);
        if (this.taskbarPosition === 'top') ctx.strokeRect(tr.x, tr.y + tr.h, tr.w, 0);
        if (this.taskbarPosition === 'left') ctx.strokeRect(tr.x + tr.w, tr.y, 0, tr.h);
        if (this.taskbarPosition === 'right') ctx.strokeRect(tr.x, tr.y, 0, tr.h);

        ctx.fillStyle = colors.highlight;
        const startSize = 36;
        if (isHorizontal) ctx.fillRect(tr.x + 2, tr.y + 2, startSize, tr.h - 4);
        else ctx.fillRect(tr.x + 2, tr.y + 2, tr.w - 4, startSize);

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

        // Draw Custom Panel (Clock, Stress, etc.)
        if (isHorizontal) {
            if (this.customPanelRenderer) {
                this.customPanelRenderer(ctx, tr.w, tr.h, this.taskbarSize);
            }

            const wifiX = tr.w - 85;
            const wifiY = (this.taskbarPosition === 'bottom') ? tr.y + tr.h/2 : tr.y + tr.h/2;

            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(wifiX, wifiY + 2, 2, 0, Math.PI*2); // Dot
            ctx.fill();

            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(wifiX, wifiY + 2, 6, Math.PI * 1.25, Math.PI * 1.75); // Small arc
            ctx.stroke();

            const net = this.networkManager.getConnectedNetwork();
            if (net) {
                ctx.beginPath();
                ctx.arc(wifiX, wifiY + 2, 10, Math.PI * 1.25, Math.PI * 1.75); // Big arc
                ctx.stroke();
            }
        }
        ctx.restore();
    }
}