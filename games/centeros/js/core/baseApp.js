import { themeManager } from "../os/theme.js";

export class BaseApp {
    constructor() {
        this.windowManager = null; // Reference to WM
    }

    // Called by main.js when app is launched
    setWindowManager(wm) {
        this.windowManager = wm;
    }

    update(dt) {}

    render(ctx, rect) {
        const colors = this.getColors();
        this.clear(ctx, rect, colors.windowBg);
    }

    handleKey(e) {}

    handleClick(x, y, rect) {}

    // --- Helpers ---

    getColors() { return themeManager.get(); }
    getFonts() { return themeManager.getFonts(); }

    clear(ctx, rect, color) {
        ctx.fillStyle = color || this.getColors().windowBg;
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    }

    getLocalCoords(globalX, globalY, contentRect) {
        return {
            x: globalX - contentRect.x,
            y: globalY - contentRect.y
        };
    }

    isInside(localX, localY, x, y, w, h) {
        return localX >= x && localX <= x + w && localY >= y && localY <= y + h;
    }
}