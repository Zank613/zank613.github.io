import { state, installApp } from "../state.js";
import { BaseApp } from "../core/baseApp.js";

export class UnderworldApp extends BaseApp {
    constructor() {
        super();
        this.items = [
            { id: "wp1", type: "lib", label: "libwp1", desc: "Basic WPA1 cracking.", cost: 0, wpa: 1 },
            { id: "wp2", type: "lib", label: "libwp2", desc: "WPA2 cracking.", cost: 4, wpa: 2 },
            { id: "wp3", type: "lib", label: "libwp3", desc: "WPA3 cracking.", cost: 8, wpa: 3 },
            { id: "eightminer", type: "app", label: "Eightminer", desc: "Local E€E miner.", cost: 1 },
            { id: "remote", type: "app", label: "RemoteAccesser", desc: "Remote mining.", cost: 16 },
            { id: "aroundrouter", type: "router", label: "AroundRouter", desc: "Obfuscation router.", cost: 6 },
            { id: "vpn1", type: "vpn", tier: 1, label: "Core VPN", desc: "Baseline tunnel.", cost: 2 },
            { id: "vpn2", type: "vpn", tier: 2, label: "VPN 2", desc: "Multi-hop routing.", cost: 5 },
            { id: "vpn3", type: "vpn", tier: 3, label: "VPN 3", desc: "Obfuscated traffic.", cost: 9 },
            { id: "vpn4", type: "vpn", tier: 4, label: "VPN 4", desc: "Max protection.", cost: 14 },
            { id: "virusExterminator", type: "consumable", label: "VirusExterminator", desc: "Removes visual glitches.", cost: 3 }
        ];
        this.message = "";
        this.renderRect = {width: 0};
    }

    isInstalled(item) {
        if (item.type === "lib") return !!state.libs && !!state.libs[item.id];
        if (item.id === "eightminer") return !!state.miner?.owned;
        if (item.id === "remote") return !!state.remote?.owned;
        if (item.type === "router") return !!state.router?.owned;
        if (item.type === "vpn") return (state.vpn?.tier || 0) >= item.tier;
        return false;
    }

    buyItem(item) {
        if (this.isInstalled(item)) { this.message = "Already installed."; return; }
        if (state.eightcoin < item.cost) { this.message = "Not enough E€E."; return; }

        state.eightcoin -= item.cost;
        if (item.type === "lib") { state.libs = state.libs || {}; state.libs[item.id] = true; }
        else if (item.id === "eightminer") { state.miner = state.miner || {}; state.miner.owned = true; installApp("miner"); }
        else if (item.id === "remote") { state.remote = state.remote || {}; state.remote.owned = true; installApp("remote"); }
        else if (item.type === "router") { state.router = state.router || {}; state.router.owned = true; installApp("router"); }
        else if (item.type === "vpn") { state.vpn = state.vpn || { tier: 0 }; state.vpn.tier = Math.max(state.vpn.tier, item.tier); }
        else if (item.id === "virusExterminator") { state.virusTools = state.virusTools || { exterminatorCharges: 0 }; state.virusTools.exterminatorCharges++; }
        this.message = `${item.label} purchased.`;
    }

    handleClick(globalX, globalY, contentRect) {
        const { x, y } = this.getLocalCoords(globalX, globalY, contentRect);
        const rectWidth = this.renderRect.width;

        if (y < 32) return;

        const rowH = 56;
        for (let i = 0; i < this.items.length; i++) {
            const rowTop = 32 + i * rowH;

            const buttonW = 90;
            const buttonX = rectWidth - buttonW - 24;
            const buttonY = rowTop + 6;

            if (this.isInside(x, y, buttonX, buttonY, buttonW, 24)) {
                this.buyItem(this.items[i]);
                return;
            }
        }
    }

    render(ctx, rect) {
        this.clear(ctx, rect, "#1b161f");
        this.renderRect = rect;

        ctx.save();
        ctx.translate(rect.x, rect.y);

        ctx.font = "12px system-ui";
        ctx.fillStyle = "#bbbbbb";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(`Balance: E€E ${state.eightcoin.toFixed(1)}`, 16, 2);

        const rowH = 56;
        const startY = 32;

        this.items.forEach((item, index) => {
            const y = startY + index * rowH;
            const installed = this.isInstalled(item);
            const affordable = state.eightcoin >= item.cost;

            ctx.fillStyle = "rgba(255,255,255,0.03)";
            ctx.fillRect(8, y - 8, rect.width - 16, rowH - 4);

            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "left";
            ctx.fillText(item.label, 16, y);
            ctx.fillStyle = "#aaaaaa";
            ctx.fillText(item.desc, 16, y + 18);

            ctx.textAlign = "right";
            ctx.fillStyle = "#ffcc66";
            ctx.fillText(item.cost === 0 ? "Included" : `Cost: ${item.cost}`, rect.width - 130, y);

            const btnX = rect.width - 114, btnY = y + 6;
            const btnColor = installed ? "#444" : (!affordable ? "#333" : "#2d7a3e");

            ctx.fillStyle = btnColor;
            ctx.fillRect(btnX, btnY, 90, 24);
            ctx.fillStyle = installed ? "#ddd" : (!affordable ? "#777" : "#fff");
            ctx.textAlign = "center";
            ctx.fillText(installed ? "Installed" : (!affordable ? "Locked" : "Buy"), btnX + 45, btnY + 6);
        });

        // Set content height for scrolling
        this.contentHeight = startY + this.items.length * rowH + 40; // 40 for bottom padding

        if (this.message) {
            // Draw message at bottom of CONTENT, not bottom of window
            ctx.textAlign = "left";
            ctx.fillStyle = "#ff9966";
            ctx.fillText(this.message, 16, this.contentHeight - 20);
        }
        ctx.restore();
    }

}