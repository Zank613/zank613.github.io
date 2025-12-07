import { state } from "../state.js";
import { BaseApp } from "../core/baseApp.js";

const SITE_ROUTES = {
    "home": "sites/pleasefindthem.html",
    "pleasefindthem.com": "sites/pleasefindthem.html",
    "darkesttrench.w3": "sites/darkesttrench.html",
    "thecitypulse.w3": "sites/pleasefindthem.html"
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
        this.pageTitle = "New Tab";

        this.blocks = [];
        this.linkRegions = [];
        this.anchorMap = {};

        this.history = [];
        this.historyIndex = -1;
        this.loading = false;
        this.loadingProgress = 0;
        this.error = null;
        this.message = "";

        this.addressFocused = false;
        this.addressBuffer = this.currentUrl;
        this.bookmarks = new Set();
        this.secureStatus = "secure";

        this.ui = {};

        this.navigateTo("home", true);
    }

    isAroundRouterInstalled() { return !!(state.router && state.router.owned); }
    getVpnTier() { return (state.vpn && state.vpn.tier) || 0; }

    bumpHeat(amount) {
        if (!amount) return;
        state.policeHeat = Math.max(0, Math.min(100, (state.policeHeat || 0) + amount));
    }

    navigateTo(urlKey, pushHistory = true) {
        if (!urlKey) return;

        if (pushHistory) {
            if (this.historyIndex < this.history.length - 1) {
                this.history = this.history.slice(0, this.historyIndex + 1);
            }
            this.history.push(urlKey);
            this.historyIndex = this.history.length - 1;
        }

        this.currentUrl = urlKey;
        this.scrollY = 0;
        this.error = null;
        this.pageTitle = urlKey;
        if (!this.addressFocused) this.addressBuffer = this.currentUrl;

        this.loadUrl(urlKey);
    }

    goBack() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.navigateTo(this.history[this.historyIndex], false);
        }
    }

    goForward() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.navigateTo(this.history[this.historyIndex], false);
        }
    }

    refresh() {
        this.loadUrl(this.currentUrl);
    }

    async loadUrl(urlKey) {
        this.loading = true;
        this.loadingProgress = 0.1;
        this.message = `Connecting to ${urlKey}...`;
        this.blocks = [];
        this.linkRegions = [];
        this.secureStatus = "secure";

        const loadingInterval = setInterval(() => {
            this.loadingProgress += Math.random() * 0.2;
            if (this.loadingProgress > 0.8) clearInterval(loadingInterval);
        }, 100);

        const path = SITE_ROUTES[urlKey];
        if (!path) {
            clearInterval(loadingInterval);
            this.loading = false;
            this.error = `ERR_NAME_NOT_RESOLVED`;
            this.message = "Host unreachable.";
            this.secureStatus = "danger";
            return;
        }

        const profile = this.assessConnectionRisk(urlKey);

        if (DARK_SITES.has(urlKey)) {
            this.secureStatus = "warning";
            if (!this.isAroundRouterInstalled()) {
                clearInterval(loadingInterval);
                this.loading = false;
                this.error = "ERR_PROTOCOL_REQUIRED";
                this.message = "AroundRouter Handshake Failed.";
                this.secureStatus = "danger";
                return;
            }
            if (this.getVpnTier() < 2) {
                this.secureStatus = "danger";
                this.message = "⚠ UNMASKED TRAFFIC DETECTED";
            } else {
                this.message = `Encrypted Tunnel (VPN${this.getVpnTier()})`;
            }

            if (Math.random() < profile.trespasserRisk) {
                window.dispatchEvent(new CustomEvent("centeros-trespasser-risk", {
                    detail: { source: "browser", url: urlKey }
                }));
            }
        } else {
            this.message = "TLS Handshake Established.";
        }

        this.bumpHeat(profile.heatOnConnect);

        try {
            const resp = await fetch(path);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const htmlText = await resp.text();

            clearInterval(loadingInterval);
            this.loading = false;
            this.loadingProgress = 1.0;

            this.parseHtml(htmlText);
            this.injectDynamicContent(urlKey);

            if (Math.random() < profile.traceChance) {
                const difficulty = profile.traceDifficulty || 1;
                window.dispatchEvent(new CustomEvent("centeros-trigger-trace", {
                    detail: { source: "browser", difficulty }
                }));
            }

        } catch (e) {
            clearInterval(loadingInterval);
            this.loading = false;
            this.error = "ERR_CONNECTION_TIMED_OUT";
            this.secureStatus = "danger";
        }
    }

    assessConnectionRisk(urlKey) {
        const baseRisk = SITE_RISK[urlKey] ?? 0.1;
        const vpnTier = this.getVpnTier();
        const routerOwned = this.isAroundRouterInstalled();

        let routerFactor = 1.0;
        if (routerOwned && DARK_SITES.has(urlKey)) routerFactor = 0.75;

        const effectiveRisk = baseRisk * (1.0 - (vpnTier * 0.1)) * routerFactor;

        return {
            errorChance: 0,
            heatOnConnect: effectiveRisk * 5,
            heatOnError: 5,
            traceChance: Math.max(0, effectiveRisk - 0.4),
            traceDifficulty: 1 + Math.floor(effectiveRisk * 4),
            trespasserRisk: urlKey === "darkesttrench.w3" && !routerOwned ? 0.3 : 0.0
        };
    }

    parseHtml(htmlText) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, "text/html");

        const titleTag = doc.querySelector("title");
        if (titleTag) this.pageTitle = titleTag.textContent;

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
            const id = node.id ? node.id.trim() : null;
            const blockIndex = blocks.length;
            if (id) anchorMap["#" + id] = blockIndex;

            if (tag === "h1") blocks.push({ type: "heading", level: 1, text: node.textContent.trim() });
            else if (tag === "h2") blocks.push({ type: "heading", level: 2, text: node.textContent.trim() });
            else if (tag === "p") blocks.push({ type: "paragraph", text: gatherText(node).trim() });
            else if (tag === "a") blocks.push({ type: "link", text: node.textContent.trim(), href: node.getAttribute("href") || "" });
            else if (node.children) Array.from(node.children).forEach(walk);
        };

        Array.from(body.children).forEach(walk);
        this.blocks = blocks;
        this.anchorMap = anchorMap;
    }

    injectDynamicContent(urlKey) {
        window.dispatchEvent(new CustomEvent("centeros-refresh-sites"));
        const siteData = state.world.sites[urlKey];
        if (!siteData) return;

        if (urlKey === "pleasefindthem.com" && siteData.posts) {
            this.blocks.push({ type: "heading", level: 2, text: "Recent Threads" });
            siteData.posts.forEach(p => {
                this.blocks.push({ type: "paragraph", text: `------------------------------------------------`, color: "#555" });
                this.blocks.push({ type: "heading", level: 2, text: p.title });
                this.blocks.push({ type: "paragraph", text: `User: ${p.author} [Reward: ${p.reward} E€E]` });
                this.blocks.push({ type: "paragraph", text: p.content });

                const isAccepted = state.acceptedJobs.includes(p.id);
                if (isAccepted) this.blocks.push({ type: "paragraph", text: "[ JOB ACTIVE ]", color: "#00ff00" });
                else this.blocks.push({ type: "link", text: `>> ACCEPT CONTRACT`, href: `cmd:accept_job:${p.id}`, color: "#ffcc00" });
            });
        }

        if (urlKey === "darkesttrench.w3" && siteData.entries) {
            this.blocks.push({ type: "heading", level: 1, text: "Live Feeds" });
            siteData.entries.forEach(e => {
                if (e.type === "wiki") {
                    const color = e.dangerLevel > 4 ? "#ff4444" : "#aaaaaa";
                    this.blocks.push({ type: "paragraph", text: `[RISK LEVEL ${e.dangerLevel}]`, color });
                    this.blocks.push({ type: "heading", level: 2, text: e.title });
                    this.blocks.push({ type: "paragraph", text: e.content });
                    this.blocks.push({ type: "paragraph", text: "" });
                }
            });
        }
    }

    handleKey(e) {
        if (e.type !== "keydown") return;
        if (this.addressFocused) {
            if (e.key === "Enter") {
                const raw = this.addressBuffer.trim();
                if (raw) {
                    if(SITE_ROUTES[raw]) this.navigateTo(raw, true);
                    else this.message = "DNS Lookup Failed.";
                }
                this.addressFocused = false;
            } else if (e.key === "Backspace") {
                this.addressBuffer = this.addressBuffer.slice(0, -1);
            } else if (e.key.length === 1) {
                this.addressBuffer += e.key;
            } else if (e.key === "Escape") {
                this.addressFocused = false;
                this.addressBuffer = this.currentUrl;
            }
        }
    }

    handleClick(globalX, globalY, contentRect) {
        const { x, y } = this.getLocalCoords(globalX, globalY, contentRect);
        const ui = this.ui;

        // 1. Navigation Bar Clicks (Static Y)
        // Since getLocalCoords adds scrollY, we subtract it to check static UI elements
        const staticY = y - this.scrollY;

        if (this.isInside(x, staticY, ui.back.x, ui.back.y, ui.back.w, ui.back.h)) {
            this.goBack(); return;
        }
        if (this.isInside(x, staticY, ui.fwd.x, ui.fwd.y, ui.fwd.w, ui.fwd.h)) {
            this.goForward(); return;
        }
        if (this.isInside(x, staticY, ui.refresh.x, ui.refresh.y, ui.refresh.w, ui.refresh.h)) {
            this.refresh(); return;
        }
        if (this.isInside(x, staticY, ui.home.x, ui.home.y, ui.home.w, ui.home.h)) {
            this.navigateTo("home", true); return;
        }
        if (this.isInside(x, staticY, ui.address.x, ui.address.y, ui.address.w, ui.address.h)) {
            this.addressFocused = true;
            this.addressBuffer = this.currentUrl;
            return;
        }

        // 2. Content Clicks (Scrolled Y)
        for (const link of this.linkRegions) {
            if (this.isInside(x, y, link.x, link.y, link.w, link.h)) {
                if (link.href.startsWith("cmd:")) {
                    const parts = link.href.split(":");
                    if (parts[1] === "accept_job" && !state.acceptedJobs.includes(parts[2])) {
                        state.acceptedJobs.push(parts[2]);
                        this.message = "Contract Accepted.";
                        this.refresh();
                    }
                } else if (SITE_ROUTES[link.href]) {
                    this.navigateTo(link.href, true);
                } else if (link.href.startsWith("#")) {
                    const idx = this.anchorMap[link.href];
                    if (idx != null) {
                        let estY = 80;
                        for(let i=0; i<idx && i<this.blocks.length; i++) estY += 24;
                        this.scrollY = Math.max(0, estY - 80);
                    }
                }
                return;
            }
        }
    }

    render(ctx, rect) {
        super.render(ctx, rect);

        const tabH = 34;
        const navH = 40;
        const statusH = 24;
        const contentTop = tabH + navH;

        // Static Y position for drawing
        const staticY = rect.y + this.scrollY;

        // 1. Draw Tab Bar
        ctx.fillStyle = "#0c0e12";
        ctx.fillRect(rect.x, staticY, rect.width, tabH);

        // Active Tab
        ctx.fillStyle = "#20222a";
        ctx.beginPath();
        ctx.moveTo(rect.x + 8, staticY + tabH);
        ctx.lineTo(rect.x + 8, staticY + 8);
        ctx.lineTo(rect.x + 180, staticY + 8);
        ctx.lineTo(rect.x + 180, staticY + tabH);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.font = "12px system-ui";
        ctx.textAlign = "left";
        ctx.fillText(this.pageTitle.substring(0, 20), rect.x + 20, staticY + 22);

        // 2. Draw Navigation Bar
        const navY = staticY + tabH;
        ctx.fillStyle = "#20222a";
        ctx.fillRect(rect.x, navY, rect.width, navH);

        // Define UI Regions in LOCAL COORDINATES (relative to content top-left)
        // Note: The click handler will check against these local X/Y values.
        this.ui = {
            back: { x: 10, y: tabH + 8, w: 24, h: 24 },
            fwd: { x: 40, y: tabH + 8, w: 24, h: 24 },
            refresh: { x: 70, y: tabH + 8, w: 24, h: 24 },
            home: { x: 100, y: tabH + 8, w: 24, h: 24 },
            address: { x: 135, y: tabH + 5, w: rect.width - 150, h: 30 }
        };

        // Render Buttons (Drawing requires adding rect.x / staticY)
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "16px system-ui";

        // Helper to draw
        const drawUi = (elem, text) => {
            ctx.fillText(text, rect.x + elem.x + 12, staticY + elem.y + 12);
        };

        ctx.fillStyle = this.historyIndex > 0 ? "#fff" : "#555";
        drawUi(this.ui.back, "◀");

        ctx.fillStyle = this.historyIndex < this.history.length - 1 ? "#fff" : "#555";
        drawUi(this.ui.fwd, "▶");

        ctx.fillStyle = "#fff";
        drawUi(this.ui.refresh, "⟳");
        drawUi(this.ui.home, "⌂");

        // Render Address Bar
        const addr = this.ui.address;
        const drawAddrX = rect.x + addr.x;
        const drawAddrY = staticY + addr.y;

        ctx.fillStyle = "#15171d";
        ctx.beginPath();
        ctx.roundRect(drawAddrX, drawAddrY, addr.w, addr.h, 15);
        ctx.fill();

        ctx.textAlign = "left";
        ctx.font = "13px system-ui";
        const txt = this.addressFocused ? this.addressBuffer : this.currentUrl;

        let lockColor = "#888";
        if (this.secureStatus === "secure") lockColor = "#4caf50";
        if (this.secureStatus === "warning") lockColor = "#ff9800";
        if (this.secureStatus === "danger") lockColor = "#f44336";

        ctx.fillStyle = lockColor;
        ctx.fillText("🔒", drawAddrX + 10, drawAddrY + 16);

        ctx.fillStyle = this.addressFocused ? "#fff" : "#aaa";
        ctx.fillText(txt, drawAddrX + 30, drawAddrY + 16);

        // 3. Render Status Bar
        const statY = staticY + rect.height - statusH;
        ctx.fillStyle = "#2b2e37";
        ctx.fillRect(rect.x, statY, rect.width, statusH);

        ctx.fillStyle = "#888";
        ctx.font = "11px system-ui";
        ctx.textAlign = "left";
        ctx.fillText(this.message, rect.x + 10, statY + 12);

        // 4. Content Area
        const contentY = rect.y + contentTop;

        if (this.loading) {
            ctx.fillStyle = "#4d9fff";
            ctx.fillRect(rect.x, contentY, rect.width * this.loadingProgress, 2);
        }

        if (this.error) {
            ctx.save();
            ctx.translate(rect.x, contentY + 20);
            ctx.fillStyle = "#ff5555";
            ctx.font = "bold 20px system-ui";
            ctx.fillText("Connection Error", 40, 40);
            ctx.fillStyle = "#aaa";
            ctx.font = "14px system-ui";
            ctx.fillText(`Code: ${this.error}`, 40, 70);
            ctx.restore();
            return;
        }

        this.linkRegions = [];
        let y = contentTop + 20;

        ctx.textAlign = "left";
        ctx.textBaseline = "top";

        for (const block of this.blocks) {
            const drawY = rect.y + y;

            if(block.type === "heading") {
                ctx.fillStyle = "#fff";
                ctx.font = block.level===1 ? "bold 22px system-ui" : "bold 16px system-ui";
                ctx.fillText(block.text, rect.x + 20, drawY);
                y += block.level===1 ? 40 : 30;
            }
            else if (block.type === "paragraph") {
                ctx.fillStyle = block.color || "#ccc";
                ctx.font = "13px system-ui";
                const lineHeight = 20;

                const words = block.text.split(" ");
                let line = "";
                for(let w of words) {
                    if (ctx.measureText(line + w).width > rect.width - 60) {
                        ctx.fillText(line, rect.x + 20, rect.y + y);
                        line = "";
                        y += lineHeight;
                    }
                    line += w + " ";
                }
                ctx.fillText(line, rect.x + 20, rect.y + y);
                y += lineHeight + 10;
            }
            else if (block.type === "link") {
                ctx.fillStyle = block.color || "#6ab0ff";
                ctx.font = "13px system-ui";
                const w = ctx.measureText(block.text).width;

                ctx.fillText(block.text, rect.x + 20, rect.y + y);
                ctx.fillRect(rect.x + 20, rect.y + y + 16, w, 1);

                this.linkRegions.push({ x: 20, y: y, w, h: 16, href: block.href });
                y += 24;
            }
        }

        this.contentHeight = y + statusH + 20;
    }
}