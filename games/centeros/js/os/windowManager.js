import { themeManager } from "./theme.js";
import {state} from "../state.js";
import { audioManager } from "./audioManager.js";

export class WindowManager {
    constructor() {
        this.windows = [];
        this.activeWindowId = null;
        this._nextId = 1;
        this._dragState = null;
        this.minWidth = 200;
        this.minHeight = 150;
        this.resizeHandleSize = 6;
        this.workArea = { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
    }

    setWorkArea(rect) {
        this.workArea = rect;
        this.windows.forEach(w => this.clampWindow(w));
    }

    createWindow(appId, title, canvasWidth, canvasHeight, appInstance, appPreferredSize) {
        const existing = this.windows.find(w => w.appId === appId);
        if (existing) {
            this.focusWindow(existing.id);
            if (existing.isMinimized) existing.isMinimized = false;
            return;
        }

        const w = appPreferredSize?.width || 600;
        const h = appPreferredSize?.height || 400;

        // Center initial position
        let x = this.workArea.x + (this.workArea.width - w) / 2 + (this.windows.length * 20);
        let y = this.workArea.y + (this.workArea.height - h) / 2 + (this.windows.length * 20);

        const win = {
            id: this._nextId++,
            appId,
            title,
            x, y, width: w, height: h,
            isMaximized: false,
            isMinimized: false,
            preMaxRect: null,
            appInstance,
            titleBarHeight: 28
        };

        this.clampWindow(win);
        this.windows.push(win);
        this.focusWindow(win.id);
    }

    // Helper to keep window inside work area
    clampWindow(win) {
        if (win.isMaximized) return;

        // X boundaries
        if (win.x < this.workArea.x) win.x = this.workArea.x;
        if (win.x + win.width > this.workArea.x + this.workArea.width) {
            win.x = this.workArea.x + this.workArea.width - win.width;
        }

        // Y boundaries
        if (win.y < this.workArea.y) win.y = this.workArea.y;
        if (win.y + win.height > this.workArea.y + this.workArea.height) {
            win.y = this.workArea.y + this.workArea.height - win.height;
        }
    }

    focusWindow(id) {
        const win = this.windows.find(w => w.id === id);
        if (win) {
            this.activeWindowId = id;
            win.isMinimized = false;
            this.windows.splice(this.windows.indexOf(win), 1);
            this.windows.push(win);
        }
    }

    minimizeWindow(id) {
        const win = this.windows.find(w => w.id === id);
        if (win) {
            win.isMinimized = true;
            if (this.activeWindowId === id) {
                this.activeWindowId = null;
                const visible = this.windows.filter(w => !w.isMinimized);
                if (visible.length > 0) {
                    this.activeWindowId = visible[visible.length - 1].id;
                }
            }
        }
    }

    toggleMaximize(id) {
        const win = this.windows.find(w => w.id === id);
        if (!win) return;

        if (win.isMaximized) {
            win.x = win.preMaxRect.x;
            win.y = win.preMaxRect.y;
            win.width = win.preMaxRect.width;
            win.height = win.preMaxRect.height;
            win.isMaximized = false;
            win.preMaxRect = null;
        } else {
            win.preMaxRect = { x: win.x, y: win.y, width: win.width, height: win.height };
            win.x = this.workArea.x;
            win.y = this.workArea.y;
            win.width = this.workArea.width;
            win.height = this.workArea.height;
            win.isMaximized = true;
        }
    }

    closeWindow(id) {
        this.windows = this.windows.filter(w => w.id !== id);
        if (this.activeWindowId === id) {
            this.activeWindowId = this.windows.length ? this.windows[this.windows.length - 1].id : null;
        }
    }

    _getResizeEdge(win, x, y) {
        if (win.isMaximized) return null;
        const m = this.resizeHandleSize;
        const right = win.x + win.width;
        const bottom = win.y + win.height;

        const onLeft = x >= win.x - m && x <= win.x + m;
        const onRight = x >= right - m && x <= right + m;
        const onTop = y >= win.y - m && y <= win.y + m;
        const onBottom = y >= bottom - m && y <= bottom + m;

        if (onTop && onLeft) return 'nw';
        if (onTop && onRight) return 'ne';
        if (onBottom && onLeft) return 'sw';
        if (onBottom && onRight) return 'se';
        if (onTop) return 'n';
        if (onBottom) return 's';
        if (onLeft) return 'w';
        if (onRight) return 'e';
        return null;
    }

    _hitTestControls(win, x, y) {
        const btnSize = 20;
        const margin = 4;
        let rightX = win.x + win.width - margin - btnSize;
        const btnY = win.y + (win.titleBarHeight - btnSize) / 2;

        if (x >= rightX && x <= rightX + btnSize && y >= btnY && y <= btnY + btnSize) return 'close';
        rightX -= (btnSize + margin);
        if (x >= rightX && x <= rightX + btnSize && y >= btnY && y <= btnY + btnSize) return 'maximize';
        rightX -= (btnSize + margin);
        if (x >= rightX && x <= rightX + btnSize && y >= btnY && y <= btnY + btnSize) return 'minimize';
        return null;
    }

    pointerDown(x, y) {
        for (let i = this.windows.length - 1; i >= 0; i--) {
            const win = this.windows[i];
            if (win.isMinimized) continue;

            const edge = this._getResizeEdge(win, x, y);
            const inRect = x >= win.x && x <= win.x + win.width && y >= win.y && y <= win.y + win.height;
            const inTitle = inRect && y <= win.y + win.titleBarHeight;

            if (edge || inRect) {

                audioManager.playClick();

                this.focusWindow(win.id);

                if (edge) {
                    this._dragState = {
                        type: 'resize', winId: win.id, startX: x, startY: y,
                        initialRect: { x: win.x, y: win.y, w: win.width, h: win.height }, edge
                    };
                    return true;
                }

                if (inTitle) {
                    const control = this._hitTestControls(win, x, y);
                    if (control === 'close') { this.closeWindow(win.id); return true; }
                    if (control === 'maximize') { this.toggleMaximize(win.id); return true; }
                    if (control === 'minimize') { this.minimizeWindow(win.id); return true; }

                    if (!win.isMaximized) {
                        this._dragState = {
                            type: 'move', winId: win.id, startX: x, startY: y,
                            initialRect: { x: win.x, y: win.y }
                        };
                    }
                    return true;
                }

                const contentRect = this._getContentRect(win);
                if (win.appInstance && win.appInstance.handleClick) {
                    win.appInstance.handleClick(x, y, contentRect);
                }
                return true;
            }
        }
        this.activeWindowId = null;
        return false;
    }

    pointerMove(x, y, canvas) {
        let cursor = "default";
        if (this._dragState) {
            const ds = this._dragState;
            const win = this.windows.find(w => w.id === ds.winId);
            if (!win) { this._dragState = null; return; }

            if (ds.type === 'move') {
                win.x = ds.initialRect.x + (x - ds.startX);
                win.y = ds.initialRect.y + (y - ds.startY);
                this.clampWindow(win);

            } else if (ds.type === 'resize') {
                const dx = x - ds.startX;
                const dy = y - ds.startY;
                const init = ds.initialRect;
                if (ds.edge.includes('e')) win.width = Math.max(this.minWidth, init.w + dx);
                if (ds.edge.includes('s')) win.height = Math.max(this.minHeight, init.h + dy);
                if (ds.edge.includes('w')) {
                    const newW = Math.max(this.minWidth, init.w - dx);
                    win.x = init.x + (init.w - newW);
                    win.width = newW;
                }
                if (ds.edge.includes('n')) {
                    const newH = Math.max(this.minHeight, init.h - dy);
                    win.y = init.y + (init.h - newH);
                    win.height = newH;
                }
            }
            cursor = ds.type === 'resize' ? 'move' : 'default';
        } else {
            for (let i = this.windows.length - 1; i >= 0; i--) {
                const win = this.windows[i];
                if (win.isMinimized) continue;
                const edge = this._getResizeEdge(win, x, y);
                if (edge) {
                    cursor = (edge === 'n' || edge === 's') ? 'ns-resize' :
                        (edge === 'e' || edge === 'w') ? 'ew-resize' :
                            (edge === 'ne' || edge === 'sw') ? 'nesw-resize' : 'nwse-resize';
                    break;
                }
            }
        }
        canvas.style.cursor = cursor;
    }

    pointerUp() { this._dragState = null; }

    handleWheel(e) {
        const win = this.windows.find(w => w.id === this.activeWindowId);
        if (win && win.appInstance && win.appInstance.handleWheel) {
            const contentRect = this._getContentRect(win);
            win.appInstance.handleWheel(e.deltaY, contentRect);
        }
    }

    handleKey(e) {
        const win = this.windows.find(w => w.id === this.activeWindowId);
        if (!win || !win.appInstance) return;

        const app = win.appInstance;

        // --- COPY (Ctrl + C) ---
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
            const content = app.onCopy();
            if (content) {
                state.clipboard = content;
                console.log("Copied to clipboard:", content);
            }
            e.preventDefault(); // Stop browser from trying to copy
            return;
        }

        // --- PASTE (Ctrl + V) ---
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
            if (state.clipboard) {
                app.onPaste(state.clipboard);
            }
            e.preventDefault();
            return;
        }

        // Pass normal keys to app
        if (app.handleKey) {
            app.handleKey(e);
        }
    }

    handleRightClick(x, y) {
        // Check windows from top to bottom
        for (let i = this.windows.length - 1; i >= 0; i--) {
            const win = this.windows[i];
            if (win.isMinimized) continue;

            const contentRect = this._getContentRect(win);

            // Check if inside window content area
            if (x >= contentRect.x && x <= contentRect.x + contentRect.width &&
                y >= contentRect.y && y <= contentRect.y + contentRect.height) {

                // Focus the window first
                this.focusWindow(win.id);

                // Pass to App
                if (win.appInstance && win.appInstance.handleRightClick) {
                    const localCoords = win.appInstance.getLocalCoords(x, y, contentRect);
                    return win.appInstance.handleRightClick(x, y, localCoords.x, localCoords.y);
                }
                return true; // Consumed click on window chrome, but no menu
            }

            // Check Title Bar
            if (x >= win.x && x <= win.x + win.width && y >= win.y && y <= win.y + win.height) {
                return true;
            }
        }
        return false;
    }

    update(dt) {
        for (const w of this.windows) {
            if (w.appInstance && w.appInstance.update) w.appInstance.update(dt);
        }
    }

    _getContentRect(win) {
        return {
            x: win.x + 1,
            y: win.y + win.titleBarHeight,
            width: win.width - 2,
            height: win.height - win.titleBarHeight - 1
        };
    }

    render(ctx) {
        const colors = themeManager.get();
        const fonts = themeManager.getFonts();

        for (const win of this.windows) {
            if (win.isMinimized) continue;
            const isActive = win.id === this.activeWindowId;
            const r = { x: win.x, y: win.y, w: win.width, h: win.height };

            // Window Frame
            ctx.shadowColor = "rgba(0,0,0,0.5)";
            ctx.shadowBlur = isActive ? 20 : 5;
            ctx.fillStyle = colors.windowBg;
            ctx.fillRect(r.x, r.y, r.w, r.h);
            ctx.shadowBlur = 0;

            ctx.strokeStyle = isActive ? colors.windowBorderActive : colors.windowBorder;
            ctx.lineWidth = 1;
            ctx.strokeRect(r.x, r.y, r.w, r.h);

            // Title Bar
            ctx.fillStyle = isActive ? colors.titleBarActive : colors.titleBar;
            ctx.fillRect(r.x, r.y, r.w, win.titleBarHeight);

            // Title Text
            ctx.fillStyle = isActive ? colors.titleTextActive : colors.titleText;
            ctx.font = fonts.title;
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.fillText(win.title, r.x + 8, r.y + win.titleBarHeight / 2);

            // Window Controls
            this._renderControls(ctx, win, colors);

            // Content
            const contentRect = this._getContentRect(win);
            ctx.save();
            ctx.beginPath();
            ctx.rect(contentRect.x, contentRect.y, contentRect.width, contentRect.height);
            ctx.clip();

            if (win.appInstance) {
                const scrollY = win.appInstance.scrollY || 0;
                ctx.translate(0, -scrollY);
                if (win.appInstance.render) win.appInstance.render(ctx, contentRect);
                ctx.translate(0, scrollY);
            }

            // Scrollbar
            if (win.appInstance && win.appInstance.contentHeight > contentRect.height) {
                const totalH = win.appInstance.contentHeight;
                const visibleH = contentRect.height;
                const scrollY = win.appInstance.scrollY || 0;
                const barWidth = 6;
                const trackH = visibleH;
                const thumbH = Math.max(20, (visibleH / totalH) * trackH);
                const thumbY = (scrollY / (totalH - visibleH)) * (trackH - thumbH);
                const barX = contentRect.x + contentRect.width - barWidth - 2;
                const barY = contentRect.y;

                ctx.fillStyle = "rgba(0,0,0,0.2)";
                ctx.fillRect(barX, barY, barWidth, trackH);
                ctx.fillStyle = colors.highlight || "#888";
                ctx.fillRect(barX, barY + thumbY, barWidth, thumbH);
            }
            ctx.restore();
        }
    }

    _renderControls(ctx, win, colors) {
        const style = themeManager.getWindowControls();
        const centerY = win.y + win.titleBarHeight / 2;

        const closeCX = win.x + win.width - 14;
        const maxCX = win.x + win.width - 38;
        const minCX = win.x + win.width - 62;

        if (style === 'centeros') {
            const drawBtn = (x, color) => {
                ctx.fillStyle = color;
                ctx.beginPath(); ctx.arc(x, centerY, 6, 0, Math.PI * 2); ctx.fill();
            };
            drawBtn(closeCX, colors.buttonClose);
            drawBtn(maxCX, colors.buttonMax);
            drawBtn(minCX, colors.buttonMin);
        }
        else if (style === 'classic') {
            ctx.font = "bold 14px monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = colors.titleText;

            ctx.fillText("✕", closeCX, centerY);
            const maxSymbol = win.isMaximized ? "❐" : "□";
            ctx.fillText(maxSymbol, maxCX, centerY - 1);
            ctx.fillText("─", minCX, centerY - 2);
        }
        else if (style === 'retro') {
            ctx.font = "12px monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            const btnSize = 16;

            const drawPixelBtn = (text, x) => {
                ctx.fillStyle = colors.windowBorder;
                ctx.fillRect(x - btnSize/2, centerY - btnSize/2, btnSize, btnSize);
                ctx.fillStyle = colors.windowBg;
                ctx.fillRect(x - btnSize/2 + 1, centerY - btnSize/2 + 1, btnSize - 2, btnSize - 2);
                ctx.fillStyle = colors.titleText;
                ctx.fillText(text, x, centerY + 1);
            };

            drawPixelBtn("x", closeCX);
            drawPixelBtn(win.isMaximized ? "v" : "^", maxCX);
            drawPixelBtn("_", minCX);
        }
    }
}