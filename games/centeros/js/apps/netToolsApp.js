import { BaseApp } from "../core/baseApp.js";
import { networkManager } from "../os/networkManager.js";

export class NetToolsApp extends BaseApp {
    constructor() {
        super();
        this.itemsRects = [];
        this.timer = 0;
    }

    update(dt) {
        this.timer += dt;
        if(this.timer > 1.0) this.timer = 0;
    }

    handleClick(globalX, globalY, contentRect) {
        const { x, y } = this.getLocalCoords(globalX, globalY, contentRect);

        for (const item of this.itemsRects) {
            if (this.isInside(x, y, item.x, item.y, item.w, item.h)) {
                if (networkManager.isKnown(item.netId)) {
                    networkManager.connect(item.netId);
                }
                return;
            }
        }
    }

    render(ctx, rect) {
        super.render(ctx, rect);

        const colors = this.getColors();
        const fonts = this.getFonts();

        ctx.fillStyle = colors.titleText;
        ctx.font = "bold 14px system-ui";
        ctx.textAlign = "left";
        ctx.fillText("Available Networks", rect.x + 16, rect.y + 24);

        const current = networkManager.getConnectedNetwork();
        const networks = networkManager.networks;
        this.itemsRects = [];

        let y = 48;
        const rowH = 46;

        for (const net of networks) {
            const isConnected = current && current.id === net.id;
            const isKnown = networkManager.isKnown(net.id);

            // Row Background
            if (isConnected) {
                ctx.fillStyle = "rgba(40, 200, 60, 0.15)";
                ctx.fillRect(rect.x + 8, rect.y + y, rect.width - 16, rowH);
            } else if (!isKnown) {
                ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
                ctx.fillRect(rect.x + 8, rect.y + y, rect.width - 16, rowH);
            }

            // SSID & Frequency
            ctx.fillStyle = isConnected ? "#88ff88" : (isKnown ? colors.contentText : "#777");
            ctx.font = fonts.ui;
            const freqText = net.frequency ? `[${net.frequency}]` : "";
            ctx.fillText(`${net.ssid} ${freqText}`, rect.x + 16, rect.y + y + 14);

            // Status Text
            ctx.font = "11px system-ui";
            let status = "Locked";
            if (isConnected) {
                const signal = net.strength === 3 ? "Excellent" : (net.strength === 2 ? "Good" : "Weak");
                status = `Connected | Signal: ${signal}`;
            }
            else if (isKnown) {
                const max = net.maxSpeedMbps ? `Max: ${net.maxSpeedMbps}Mbps` : "";
                status = `Click to Connect | ${max}`;
            }

            ctx.fillStyle = isConnected ? "#88ff88" : (isKnown ? "#aaaaaa" : "#555");
            ctx.fillText(status, rect.x + 16, rect.y + y + 30);

            // Signal Bars
            ctx.fillStyle = isKnown ? colors.highlight : "#555";
            for(let i=0; i<net.strength; i++) {
                ctx.fillRect(rect.x + rect.width - 40 + (i*6), rect.y + y + 15 + (2-i)*4, 4, 14 - (2-i)*4);
            }

            // Save click region
            this.itemsRects.push({
                netId: net.id,
                x: 8, y: y, w: rect.width - 16, h: rowH
            });

            y += rowH + 4;
        }

        // Set total height for scroll
        this.contentHeight = y + 20;
    }
}