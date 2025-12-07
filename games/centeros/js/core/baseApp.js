import { themeManager } from "../os/theme.js";

export class BaseApp {
    constructor() {}

    update(dt) {}

    render(ctx, rect) {
        const colors = this.getColors();
        this.clear(ctx, rect, colors.windowBg);
    }

    handleKey(e) {}

    handleClick(x, y, rect) {}

    // Helpers

    getColors() { return themeManager.get(); }
    getFonts() { return themeManager.getFonts(); }

    clear(ctx, rect, color) {
        ctx.fillStyle = color || this.getColors().windowBg;
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    }

    // Helper to get coordinates relative to the window content area
    getLocalCoords(globalX, globalY, contentRect) {
        return {
            x: globalX - contentRect.x,
            y: globalY - contentRect.y
        };
    }

    // Helper to check if a local point is inside a rectangle
    isInside(localX, localY, x, y, w, h) {
        return localX >= x && localX <= x + w && localY >= y && localY <= y + h;
    }
}