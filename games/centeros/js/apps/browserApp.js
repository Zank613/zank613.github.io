import { state } from "../state.js";
import { BaseApp } from "../core/baseApp.js";

const SITE_ROUTES = {
    "home": "sites/pleasefindthem.html",
    "pleasefindthem.com": "sites/pleasefindthem.html",
    "darkesttrench.w3": "sites/darkesttrench.html"
};

const DARK_SITES = new Set(["darkesttrench.w3"]);
const SITE_RISK = {
    "home": 0.0,
    "pleasefindthem.com": 0.4,
    "darkesttrench.w3": 0.9
};

export class BrowserApp extends BaseApp {
    constructor() {
        super();
        this.currentUrl = "home";
        this.blocks = [];
        this.linkRegions = [];
        this.anchorMap = {};
        this.message = "";
        this.loading = false;
        this.error = null;
        this.scrollOffset = 0;
        this.maxScroll = 0;
        this.history = [];
        this.historyIndex = -1;
        this.addressFocused = false;
        this.addressBuffer = this.currentUrl;
        this.bookmarks = new Set();
        this.showBookmarks = false;
        this.bookmarkRegions = [];

        this.uiRects = { address: null, star: null, bookmarks: null };

        this.navigateTo(this.currentUrl, true);
    }

    isAroundRouterInstalled() { return !!(state.router && state.router.owned); }
    getVpnTier() { return (state.vpn && state.vpn.tier) || 0; }

    bumpHeat(amount) {
        if (!amount) return;
        state.policeHeat = Math.max(0, Math.min(100, (state.policeHeat || 0) + amount));
    }

    maybeTriggerBrowserTrace(chance, baseDifficulty = 1) {
        if (!chance || chance <= 0) return;
        if (Math.random() >= chance) return;
        const difficulty = baseDifficulty || (Math.floor((state.policeHeat || 0) / 30) + 1);
        window.dispatchEvent(new CustomEvent("centeros-trigger-trace", {
            detail: { source: "browser", difficulty }
        }));
    }

    assessConnectionRisk(urlKey) {
        const baseRisk = SITE_RISK[urlKey] ?? 0.1;
        const vpnTier = this.getVpnTier();
        const routerOwned = this.isAroundRouterInstalled();
        const heat = state.policeHeat || 0;

        let vpnFactor = 1.0;
        if (vpnTier === 1) vpnFactor = 0.8;
        else if (vpnTier === 2) vpnFactor = 0.6;
        else if (vpnTier === 3) vpnFactor = 0.45;
        else if (vpnTier >= 4) vpnFactor = 0.35;

        let routerFactor = 1.0;
        if (routerOwned && DARK_SITES.has(urlKey)) {
            routerFactor = 0.75;
        }

        const effectiveRisk = baseRisk * vpnFactor * routerFactor * (0.5 + (heat / 100));

        return {
            errorChance: Math.min(0.55, effectiveRisk * 0.6),
            errorMessage: "Connection Reset.",
            heatOnConnect: 0.5 + effectiveRisk * 4,
            heatOnError: 2 + effectiveRisk * 6,
            traceChance: Math.max(0, effectiveRisk - 0.35),
            traceDifficulty: 1 + Math.floor(effectiveRisk * 4)
        };
    }

    isBookmarked(urlKey) { return this.bookmarks.has(urlKey); }

    toggleBookmark(urlKey) {
        if (!urlKey) return;
        if (this.bookmarks.has(urlKey)) {
            this.bookmarks.delete(urlKey);
            if (this.bookmarks.size === 0) this.showBookmarks = false;
        } else {
            this.bookmarks.add(urlKey);
        }
    }

    navigateTo(urlKey, pushHistory = true) {
        if (!urlKey) return;
        this.currentUrl = urlKey;
        this.scrollOffset = 0;
        this.message = "";
        this.error = null;

        if (!this.addressFocused) this.addressBuffer = this.currentUrl;

        if (pushHistory) {
            if (this.historyIndex < this.history.length - 1) {
                this.history = this.history.slice(0, this.historyIndex + 1);
            }
            this.history.push(urlKey);
            this.historyIndex = this.history.length - 1;
        }
        this.loadUrl(urlKey);
    }

    async loadUrl(urlKey) {
        const path = SITE_ROUTES[urlKey];
        this.loading = true;
        this.error = null;
        this.blocks = [];
        this.linkRegions = [];
        this.anchorMap = {};

        if (!path) {
            this.loading = false;
            this.error = `Unknown address: ${urlKey}`;
            return;
        }

        if (DARK_SITES.has(urlKey)) {
            if (!this.isAroundRouterInstalled()) {
                this.loading = false;
                this.error = "Access denied.\nAroundRouter not detected.";
                return;
            }
            if (this.getVpnTier() === 0) {
                this.message = "AroundRouter active, but no VPN.";
                this.bumpHeat(3);
            }
        }

        const profile = this.assessConnectionRisk(urlKey);
        this.bumpHeat(profile.heatOnConnect);

        if (Math.random() < profile.errorChance) {
            this.loading = false;
            this.error = profile.errorMessage;
            this.bumpHeat(profile.heatOnError);
            this.maybeTriggerBrowserTrace(profile.traceChance, profile.traceDifficulty);
            return;
        }

        try {
            const resp = await fetch(path);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const htmlText = await resp.text();
            this.parseHtml(htmlText);
            this.loading = false;
            this.maybeTriggerBrowserTrace(profile.traceChance * 0.4, profile.traceDifficulty);
        } catch (e) {
            this.loading = false;
            this.error = `Failed to load: ${urlKey}`;
        }
    }

    parseHtml(htmlText) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, "text/html");
        const body = doc.body;

        const blocks = [];
        const anchorMap = {};

        const gatherText = (node) => {
            let text = "";
            node.childNodes.forEach((child) => {
                if (child.nodeType === Node.TEXT_NODE) text += child.textContent;
                else if (child.nodeType === Node.ELEMENT_NODE) {
                    if (child.tagName.toLowerCase() === "br") text += "\n";
                    else text += gatherText(child);
                }
            });
            return text;
        };

        const walk = (node) => {
            if (node.nodeType !== 1) return;
            const tag = node.tagName.toLowerCase();
            const id = node.id && node.id.trim();

            if (tag === "h1" || tag === "h2") {
                const text = node.textContent.trim();
                const blockIndex = blocks.length;
                if (id) anchorMap["#" + id] = blockIndex;
                blocks.push({ type: "heading", level: tag === "h1" ? 1 : 2, text });
            } else if (tag === "p") {
                const text = gatherText(node).trim();
                const blockIndex = blocks.length;
                if (id) anchorMap["#" + id] = blockIndex;
                blocks.push({ type: "paragraph", text });
            } else if (tag === "a") {
                const href = node.getAttribute("href") || "";
                const text = node.textContent.trim() || href;
                const blockIndex = blocks.length;
                if (id) anchorMap["#" + id] = blockIndex;
                blocks.push({ type: "link", text, href });
            } else if (node.children) {
                Array.from(node.children).forEach(walk);
            }
        };

        Array.from(body.children).forEach(walk);
        this.blocks = blocks;
        this.anchorMap = anchorMap;
    }

    handleKey(e) {
        if (e.type !== "keydown") return;

        if (this.addressFocused) {
            if (e.key === "Enter") {
                const raw = this.addressBuffer.trim();
                if (raw) {
                    if (SITE_ROUTES[raw]) this.navigateTo(raw, true);
                    else this.message = `Unknown address: ${raw}`;
                }
                this.addressFocused = false;
            } else if (e.key === "Backspace") {
                this.addressBuffer = this.addressBuffer.slice(0, -1);
            } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey) {
                this.addressBuffer += e.key;
            } else if (e.key === "Escape") {
                this.addressFocused = false;
                this.addressBuffer = this.currentUrl;
            }
            return;
        }

        if (e.key === "ArrowDown") this.scrollOffset = Math.min(this.scrollOffset + 20, this.maxScroll);
        if (e.key === "ArrowUp") this.scrollOffset = Math.max(this.scrollOffset - 20, 0);
        if (e.key === "l") { this.addressFocused = true; this.addressBuffer = this.currentUrl; }
    }

    handleClick(globalX, globalY, contentRect) {
        const { x, y } = this.getLocalCoords(globalX, globalY, contentRect);
        const hr = this.uiRects;

        // Address Bar
        if (hr.address && this.isInside(x, y, hr.address.x, hr.address.y, hr.address.w, hr.address.h)) {
            this.addressFocused = true;
            this.addressBuffer = this.currentUrl;
            return;
        }

        // Bookmark Star
        if (hr.star && this.isInside(x, y, hr.star.x, hr.star.y, hr.star.w, hr.star.h)) {
            this.toggleBookmark(this.currentUrl);
            return;
        }

        // Links
        for (const link of this.linkRegions) {
            if (this.isInside(x, y, link.x, link.y, link.w, link.h)) {
                if (SITE_ROUTES[link.href]) this.navigateTo(link.href, true);
                else if (link.href.startsWith("#")) {
                    const idx = this.anchorMap[link.href];
                    if (idx != null) this.scrollToBlock(idx);
                }
                return;
            }
        }
    }

    scrollToBlock(idx) {
        let y = 32; // Header offset
        for (let i = 0; i < idx && i < this.blocks.length; i++) {
            y += 20; // Very rough calc, real implementation would pre-calculate block heights
        }
        this.scrollOffset = Math.max(0, y - 50);
    }

    render(ctx, rect) {
        // Browser specific dark bg
        this.clear(ctx, rect, "#080808");

        ctx.save();
        ctx.translate(rect.x, rect.y);

        const headerHeight = 28;
        ctx.fillStyle = "#141414";
        ctx.fillRect(0, 0, rect.width, headerHeight);

        // Address Bar Geometry
        const padding = 8;
        const addressW = rect.width - 60;
        this.uiRects.address = { x: padding, y: 6, w: addressW, h: headerHeight - 12 };
        this.uiRects.star = { x: padding + addressW + 6, y: 6, w: 18, h: 18 };

        // Draw Address Box
        ctx.strokeStyle = this.addressFocused ? "#66aaff" : "#333333";
        ctx.fillStyle = "#000000";
        ctx.fillRect(this.uiRects.address.x, this.uiRects.address.y, this.uiRects.address.w, this.uiRects.address.h);
        ctx.strokeRect(this.uiRects.address.x, this.uiRects.address.y, this.uiRects.address.w, this.uiRects.address.h);

        // Text
        ctx.fillStyle = "#dddddd";
        ctx.font = "11px system-ui";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(this.addressFocused ? this.addressBuffer : this.currentUrl, this.uiRects.address.x + 4, 18);

        // Star
        ctx.fillStyle = this.isBookmarked(this.currentUrl) ? "#ffd700" : "#555555";
        ctx.textAlign = "center";
        ctx.font = "14px system-ui";
        ctx.fillText("★", this.uiRects.star.x + 9, 20);

        // Content
        if (this.loading) {
            ctx.fillStyle = "#dddddd";
            ctx.fillText("Loading...", 20, 50);
        } else if (this.error) {
            ctx.fillStyle = "#ff6666";
            ctx.fillText(this.error, 20, 50);
        } else {
            let y = headerHeight + 4 - this.scrollOffset;
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            this.linkRegions = [];

            for (const block of this.blocks) {
                if (block.type === "heading") {
                    ctx.fillStyle = "#fff";
                    ctx.font = block.level === 1 ? "14px system-ui" : "12px system-ui";
                    ctx.fillText(block.text, padding, y);
                    y += 24;
                } else if (block.type === "paragraph") {
                    ctx.fillStyle = "#ccc";
                    ctx.font = "11px system-ui";
                    ctx.fillText(block.text, padding, y);
                    // Approx wrap height logic omitted for brevity, assuming simple spacing
                    y += 16 * (Math.floor(block.text.length / 80) + 1) + 6;
                } else if (block.type === "link") {
                    ctx.fillStyle = "#6ab0ff";
                    ctx.font = "11px system-ui";
                    ctx.fillText(block.text, padding, y);
                    const w = ctx.measureText(block.text).width;
                    this.linkRegions.push({ x: padding, y, w, h: 14, href: block.href });
                    y += 16;
                }
            }
        }

        if (this.message) {
            ctx.fillStyle = "#ffaa66";
            ctx.textAlign = "left";
            ctx.textBaseline = "bottom";
            ctx.fillText(this.message, 10, rect.height - 4);
        }

        ctx.restore();
    }
}