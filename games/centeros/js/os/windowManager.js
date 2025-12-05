export class WindowManager {
    constructor() {
        this.windows = [];
        this.activeWindowId = null;
        this._nextId = 1;

        this._draggingWindow = null;
        this._dragOffsetX = 0;
        this._dragOffsetY = 0;
    }

    // appPreferredSize = { width, height } or undefined
    createWindow(appId, title, canvasWidth, canvasHeight, appInstance, appPreferredSize, panelHeight = 40) {
        const margin = 16;
        const titleBarHeight = 24;

        const minW = 360;
        const minH = 220;

        const maxW = Math.max(minW, canvasWidth - margin * 2);
        const maxH = Math.max(
            minH,
            canvasHeight - panelHeight - margin * 2
        );

        let w = appPreferredSize?.width ?? Math.floor(canvasWidth * 0.65);
        let h = appPreferredSize?.height ?? Math.floor(canvasHeight * 0.6);

        w = Math.max(minW, Math.min(w, maxW));
        h = Math.max(minH, Math.min(h, maxH));

        const x = Math.round((canvasWidth - w) / 2);
        const y = Math.round((canvasHeight - panelHeight - h) / 2);

        const win = {
            id: this._nextId++,
            appId,
            title,
            x,
            y,
            width: w,
            height: h,
            titleBarHeight,
            appInstance,
            isDragging: false
        };

        this.windows.push(win);
        this.activeWindowId = win.id;
    }

    _getWindowById(id) {
        return this.windows.find(w => w.id === id) || null;
    }

    _bringToFront(win) {
        const idx = this.windows.indexOf(win);
        if (idx >= 0) {
            this.windows.splice(idx, 1);
            this.windows.push(win);
        }
        this.activeWindowId = win.id;
    }

    _hitTestWindow(x, y) {
        // topmost window wins
        for (let i = this.windows.length - 1; i >= 0; i--) {
            const w = this.windows[i];
            if (x >= w.x && x <= w.x + w.width &&
                y >= w.y && y <= w.y + w.height) {
                return w;
            }
        }
        return null;
    }

    pointerDown(x, y) {
        const win = this._hitTestWindow(x, y);
        if (!win) {
            this.activeWindowId = null;
            return;
        }

        this._bringToFront(win);

        const titleBarHeight = win.titleBarHeight;
        const closeSize = 18;
        const padding = 4;

        const withinTitleBar = (y >= win.x && y <= win.y + titleBarHeight); // bug guard
        const inTitleBar = (y >= win.y && y <= win.y + titleBarHeight);

        // close button rect
        const closeX = win.x + win.width - closeSize - padding;
        const closeY = win.y + (titleBarHeight - closeSize) / 2;

        const inClose =
            x >= closeX && x <= closeX + closeSize &&
            y >= closeY && y <= closeY + closeSize;

        if (inClose) {
            // close the window
            const idx = this.windows.indexOf(win);
            if (idx >= 0) {
                this.windows.splice(idx, 1);
            }
            this.activeWindowId = this.windows.length
                ? this.windows[this.windows.length - 1].id
                : null;
            return;
        }

        if (inTitleBar || withinTitleBar) {
            // start dragging
            this._draggingWindow = win;
            this._dragOffsetX = x - win.x;
            this._dragOffsetY = y - win.y;
            win.isDragging = true;
            return;
        }

        // otherwise pass click to app
        const contentRect = this._getContentRect(win);
        if (win.appInstance && win.appInstance.handleClick) {
            win.appInstance.handleClick(x, y, contentRect);
        }
    }

    pointerMove(x, y, canvasWidth, canvasHeight, panelHeight) {
        if (!this._draggingWindow) return;

        const win = this._draggingWindow;

        let newX = x - this._dragOffsetX;
        let newY = y - this._dragOffsetY;

        const margin = 8;
        const maxX = canvasWidth - win.width - margin;
        const maxY = canvasHeight - panelHeight - margin;

        newX = Math.max(margin, Math.min(newX, maxX));
        newY = Math.max(margin, Math.min(newY, maxY));

        win.x = newX;
        win.y = newY;
    }

    pointerUp() {
        if (this._draggingWindow) {
            this._draggingWindow.isDragging = false;
            this._draggingWindow = null;
        }
    }

    handleKey(e) {
        const win = this.windows.find(w => w.id === this.activeWindowId);
        if (win && win.appInstance && win.appInstance.handleKey) {
            win.appInstance.handleKey(e);
        }
    }

    update(dt) {
        for (const w of this.windows) {
            if (w.appInstance && w.appInstance.update) {
                w.appInstance.update(dt);
            }
        }
    }

    _getContentRect(win) {
        const padding = 8;
        const titleBarHeight = win.titleBarHeight;

        return {
            x: win.x + padding,
            y: win.y + titleBarHeight + padding,
            width: win.width - padding * 2,
            height: win.height - titleBarHeight - padding * 2
        };
    }

    render(ctx) {
        for (const w of this.windows) {
            this._renderWindow(ctx, w);
        }
    }

    _renderWindow(ctx, win) {
        const r = {
            x: win.x,
            y: win.y,
            width: win.width,
            height: win.height
        };

        // window background
        ctx.save();
        ctx.fillStyle = "#222732";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 1;
        ctx.fillRect(r.x, r.y, r.width, r.height);
        ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.width - 1, r.height - 1);

        // title bar
        const titleBarHeight = win.titleBarHeight;
        ctx.fillStyle = (win.id === this.activeWindowId) ? "#363c4a" : "#2a303d";
        ctx.fillRect(r.x, r.y, r.width, titleBarHeight);

        ctx.font = "12px system-ui";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#f0f0f0";
        ctx.fillText(win.title, r.x + 8, r.y + titleBarHeight / 2);

        // close button
        const closeSize = 16;
        const padding = 4;
        const closeX = r.x + r.width - closeSize - padding;
        const closeY = r.y + (titleBarHeight - closeSize) / 2;

        ctx.fillStyle = "#c94c4c";
        ctx.fillRect(closeX, closeY, closeSize, closeSize);
        ctx.fillStyle = "#ffffff";
        ctx.font = "10px system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("×", closeX + closeSize / 2, closeY + closeSize / 2);

        // content
        const contentRect = this._getContentRect(win);
        if (win.appInstance && win.appInstance.render) {
            win.appInstance.render(ctx, contentRect);
        }

        ctx.restore();
    }
}