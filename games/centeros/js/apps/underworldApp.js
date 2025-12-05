import { state } from "../state.js";

export class UnderworldApp {
    constructor() {
        this.items = [
            {
                id: "wp1",
                type: "lib",
                label: "libwp1",
                desc: "Basic WPA1 cracking library. Already installed.",
                cost: 0,
                wpa: 1
            },
            {
                id: "wp2",
                type: "lib",
                label: "libwp2",
                desc: "Enhanced WPA2 cracking routines.",
                cost: 4,
                wpa: 2
            },
            {
                id: "wp3",
                type: "lib",
                label: "libwp3",
                desc: "Advanced WPA3 cracking suite.",
                cost: 8,
                wpa: 3
            },
            {
                id: "eightminer",
                type: "app",
                label: "Eightminer",
                desc: "Local E€E miner. Generates coins, raises Heat.",
                cost: 1
            },
            {
                id: "remote",
                type: "app",
                label: "RemoteAccesser",
                desc: "Harness remote machines. Random E€E each in-game hour.",
                cost: 16
            }
        ];
        this.message = "";
    }

    /**
     * Helper: Safely checks if an item is already installed.
     * Prevents crashes if state objects (like state.miner) are undefined.
     */
    isInstalled(item) {
        if (item.type === "lib") {
            return !!state.libs && !!state.libs[item.id];
        }
        if (item.id === "eightminer") {
            return !!state.miner && !!state.miner.owned;
        }
        if (item.id === "remote") {
            return !!state.remote && !!state.remote.owned;
        }
        return false;
    }

    /**
     * Helper: Handles the purchase logic to keep handleClick clean.
     */
    buyItem(item) {
        // 1. Double check installation
        if (this.isInstalled(item)) {
            this.message = `${item.label} is already installed.`;
            return;
        }

        // 2. Check funds
        if (item.cost > 0 && state.eightcoin < item.cost) {
            this.message = `Not enough E€E for ${item.label}.`;
            return;
        }

        // 3. Deduct Cost
        if (item.cost > 0) {
            state.eightcoin -= item.cost;
        }

        // 4. Install Item
        if (item.type === "lib") {
            if (!state.libs) state.libs = {};
            state.libs[item.id] = true;
        } else if (item.id === "eightminer") {
            if (!state.miner) state.miner = {};
            state.miner.owned = true;
        } else if (item.id === "remote") {
            if (!state.remote) state.remote = {};
            state.remote.owned = true;
        }

        this.message = `${item.label} purchased and installed.`;
    }

    handleClick(localX, localY, contentRect) {
        // convert canvas coords to local window coords
        const x = localX - contentRect.x;
        const y = localY - contentRect.y;

        if (y < 0) return;

        const rowHeight = 56;
        const startY = 32;

        for (let i = 0; i < this.items.length; i++) {
            const rowTop = startY + i * rowHeight;
            const rowBottom = rowTop + rowHeight;

            if (y < rowTop || y > rowBottom) continue;

            const item = this.items[i];

            const buttonW = 90;
            const buttonH = 24;
            const buttonX = contentRect.width - buttonW - 24;
            const buttonY = rowTop + 6;

            if (x >= buttonX && x <= buttonX + buttonW &&
                y >= buttonY && y <= buttonY + buttonH) {

                this.buyItem(item);
                return;
            }
        }
    }

    update(dt) {}

    render(ctx, rect) {
        // Clear background
        ctx.fillStyle = "#1b161f";
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

        ctx.save();
        ctx.translate(rect.x, rect.y);

        // Header Info
        ctx.font = "12px system-ui";
        ctx.fillStyle = "#bbbbbb";
        ctx.textBaseline = "top";
        ctx.textAlign = "left";
        ctx.fillText(`Balance: E€E ${state.eightcoin.toFixed(1)}`, 16, 2);

        // List
        const rowHeight = 56;
        const startY = 32;

        this.items.forEach((item, index) => {
            const y = startY + index * rowHeight;
            const installed = this.isInstalled(item);
            const affordable = state.eightcoin >= item.cost;

            // Row Background
            ctx.fillStyle = "rgba(255,255,255,0.03)";
            ctx.fillRect(8, y - 8, rect.width - 16, rowHeight - 4);

            // 1. Label
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "left";
            const label = item.type === "lib"
                ? `${item.label}  (WPA${item.wpa})`
                : item.label;
            ctx.fillText(label, 16, y);

            // 2. Description
            ctx.fillStyle = "#aaaaaa";
            ctx.fillText(item.desc, 16, y + 18);

            // 3. Cost Label
            ctx.textAlign = "right";
            ctx.fillStyle = "#ffcc66";
            const costLabel = item.cost === 0 ? "Included" : `Cost: ${item.cost} E€E`;
            ctx.fillText(costLabel, rect.width - 130, y);

            // 4. Action Button
            const buttonW = 90;
            const buttonH = 24;
            const buttonX = rect.width - buttonW - 24;
            const buttonY = y + 6;

            ctx.textAlign = "center";

            if (installed) {
                // Style: Installed
                ctx.fillStyle = "#444444";
                ctx.fillRect(buttonX, buttonY, buttonW, buttonH);
                ctx.fillStyle = "#dddddd";
                ctx.fillText("Installed", buttonX + buttonW / 2, buttonY + 6);
            } else if (!affordable && item.cost > 0) {
                // Style: Locked
                ctx.fillStyle = "#333333";
                ctx.fillRect(buttonX, buttonY, buttonW, buttonH);
                ctx.fillStyle = "#777777";
                ctx.fillText("Locked", buttonX + buttonW / 2, buttonY + 6);
            } else {
                // Style: Buyable
                ctx.fillStyle = "#2d7a3e";
                ctx.fillRect(buttonX, buttonY, buttonW, buttonH);
                ctx.fillStyle = "#ffffff";
                ctx.fillText("Buy", buttonX + buttonW / 2, buttonY + 6);
            }
        });

        // Feedback Message
        if (this.message) {
            ctx.textAlign = "left";
            ctx.fillStyle = "#ff9966";
            ctx.fillText(this.message, 16, rect.height - 20);
        }

        ctx.restore();
    }
}