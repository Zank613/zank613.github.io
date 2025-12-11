import { themeManager } from "./theme.js";
import { audioManager } from "./audioManager.js";

export class ContextMenuManager {
    constructor() {
        this.activeMenu = null; // { x, y, items: [{label, action, disabled}] }
        this.width = 160;
        this.itemHeight = 28;
    }

    /**
     * Opens a menu at specific coordinates.
     * @param {number} x - Global Mouse X
     * @param {number} y - Global Mouse Y
     * @param {Array} items - List of objects { label: "Text", action: () => {}, condition?: boolean }
     */
    open(x, y, items) {
        // Filter out items where condition is explicitly false
        const validItems = items.filter(i => i.condition !== false);

        if (validItems.length === 0) return;

        // Boundary check
        const screenW = window.innerWidth;
        const screenH = window.innerHeight;

        const menuH = validItems.length * this.itemHeight + 10; // +padding

        let drawX = x;
        let drawY = y;

        if (drawX + this.width > screenW) drawX = screenW - this.width;
        if (drawY + menuH > screenH) drawY = drawY - menuH;

        this.activeMenu = {
            x: drawX,
            y: drawY,
            items: validItems
        };
    }

    close() {
        this.activeMenu = null;
    }

    handleClick(x, y) {
        if (!this.activeMenu) return false;

        // Check if click is inside the menu
        const menuH = this.activeMenu.items.length * this.itemHeight + 10;
        const mx = this.activeMenu.x;
        const my = this.activeMenu.y;

        if (x >= mx && x <= mx + this.width && y >= my && y <= my + menuH) {
            // Calculate which item was clicked
            const relativeY = y - my - 5;
            const index = Math.floor(relativeY / this.itemHeight);

            if (index >= 0 && index < this.activeMenu.items.length) {
                const item = this.activeMenu.items[index];
                if (!item.disabled) {
                    audioManager.playClick();
                    item.action();
                    this.close();
                }
            }
            return true;
        }

        this.close();
        return false;
    }

    render(ctx) {
        if (!this.activeMenu) return;

        const colors = themeManager.get();
        const m = this.activeMenu;
        const h = m.items.length * this.itemHeight + 10;

        ctx.save();

        // Shadow
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 10;

        // Background
        ctx.fillStyle = colors.windowBg;
        ctx.fillRect(m.x, m.y, this.width, h);
        ctx.shadowBlur = 0;

        // Border
        ctx.strokeStyle = colors.windowBorder;
        ctx.lineWidth = 1;
        ctx.strokeRect(m.x, m.y, this.width, h);

        // Items
        let y = m.y + 5;
        ctx.font = "12px system-ui";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";

        m.items.forEach((item) => {

            // Text
            ctx.fillStyle = item.disabled ? "#555" : colors.titleText;
            ctx.fillText(item.label, m.x + 12, y + this.itemHeight/2);

            y += this.itemHeight;
        });

        ctx.restore();
    }
}

export const contextMenuManager = new ContextMenuManager();