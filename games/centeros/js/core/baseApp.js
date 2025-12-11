import { themeManager } from "../os/theme.js";

export class BaseApp {
    constructor() {
        this.windowManager = null;
        this.scrollY = 0;       // Current vertical scroll position
        this.contentHeight = 0; // Total height of the content
    }

    setWindowManager(wm) {
        this.windowManager = wm;
    }

    // Returns Memory in MB
    getMemoryUsage() {
        // Base overhead for any GUI window (~15-20 MB) + slight fluctuation
        return 15 + Math.random() * 2;
    }

    // Returns CPU in % (0.0 to 100.0)
    getCpuUsage() {
        // Idle background apps use very little CPU
        return 0.1 + Math.random() * 0.3;
    }


    // Default Copy behavior: Return null (nothing to copy)
    onCopy() {
        return null;
    }


    // Default Paste behavior: Do nothing
    onPaste(text) {

    }

    update(dt) {}

    render(ctx, rect) {
        const colors = this.getColors();
        this.clear(ctx, rect, colors.windowBg);
    }

    handleKey(e) {}

    handleClick(x, y, rect) {}

    /**
     * New: Handle mouse wheel events.
     * @param {number} deltaY - The scroll amount from the event
     * @param {Object} rect - The visible content area
     */
    handleWheel(deltaY, rect) {
        if (this.contentHeight <= rect.height) return;

        this.scrollY += deltaY;

        // Clamp scroll
        const maxScroll = this.contentHeight - rect.height;
        if (this.scrollY < 0) this.scrollY = 0;
        if (this.scrollY > maxScroll) this.scrollY = maxScroll;
    }

    // --- Helpers ---

    getColors() { return themeManager.get(); }
    getFonts() { return themeManager.getFonts(); }

    /**
     * Clears the background.
     */
    clear(ctx, rect, color) {
        ctx.fillStyle = color || this.getColors().windowBg;
        // We draw at y + scrollY because the context is shifted up by -scrollY
        ctx.fillRect(rect.x, rect.y + this.scrollY, rect.width, rect.height);
    }

    /**
     * Returns coordinates relative to the content area, ACCOUNTING FOR SCROLL.
     * If you scroll down 50px, and click at y=100 on screen, that is actually y=150 in the content.
     */
    getLocalCoords(globalX, globalY, contentRect) {
        return {
            x: globalX - contentRect.x,
            y: (globalY - contentRect.y) + this.scrollY
        };
    }

    isInside(localX, localY, x, y, w, h) {
        return localX >= x && localX <= x + w && localY >= y && localY <= y + h;
    }
}