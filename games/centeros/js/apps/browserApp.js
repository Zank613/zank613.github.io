import { state } from "../state.js";
import { BaseApp } from "../core/baseApp.js";

const SITE_ROUTES = {
    "home": "sites/home.html",
    "pleasefindthem.com": "sites/pleasefindthem.html",
    "darkesttrench.w3": "sites/darkesttrench.html",
    "thecitypulse.w3": "sites/pleasefindthem.html",
    "center.center": "sites/center.html",
    "anonboard.net": "sites/pleasefindthem.html",
    "marketwatch.w3": "sites/pleasefindthem.html"
};

const DARK_SITES = new Set(["darkesttrench.w3"]);
const SITE_RISK = {
    "home": 0.0,
    "center.center": 0.0,
    "pleasefindthem.com": 0.4,
    "darkesttrench.w3": 0.9,
    "anonboard.net": 0.6,
    "marketwatch.w3": 0.2
};

class BrowserTab {
    constructor(url = "home") {
        this.url = url;
        this.title = "New Tab";
        this.history = [url];
        this.historyIndex = 0;
        this.loading = false;
        this.progress = 0;
        this.error = null;
        this.scrollY = 0;
        this.message = "";
        this.secureStatus = "secure";

        // Content Data
        this.blocks = [];
        this.linkRegions = [];
        this.anchorMap = {};

        this.loadingInterval = null;
    }
}

export class BrowserApp extends BaseApp {
    constructor() {
        super();
        this.tabs = [];
        this.activeTabIndex = 0;

        // UI State
        this.addressFocused = false;
        this.addressBuffer = "";
        this.bookmarks = new Set(["home", "pleasefindthem.com"]);

        this.ui = {};

        // Start with one tab
        this.addTab("home");
    }

    // TAB MANAGEMENT

    get activeTab() {
        return this.tabs[this.activeTabIndex];
    }

    addTab(url = "home") {
        const tab = new BrowserTab(url);
        this.tabs.push(tab);
        this.activeTabIndex = this.tabs.length - 1;
        this.loadUrl(tab, url);
    }

    closeTab(index) {
        if (this.tabs.length === 1) {
            this.navigate(this.tabs[0], "home");
            return;
        }
        this.tabs.splice(index, 1);
        if (this.activeTabIndex >= index) {
            this.activeTabIndex = Math.max(0, this.activeTabIndex - 1);
        }
    }

    switchTab(index) {
        if (index >= 0 && index < this.tabs.length) {
            this.activeTabIndex = index;
            this.scrollY = this.activeTab.scrollY;
            this.addressBuffer = this.activeTab.url;
            this.addressFocused = false;
        }
    }

    // NAVIGATION

    navigate(tab, url, pushHistory = true) {
        if (!url) return;

        if (pushHistory) {
            if (tab.historyIndex < tab.history.length - 1) {
                tab.history = tab.history.slice(0, tab.historyIndex + 1);
            }
            tab.history.push(url);
            tab.historyIndex = tab.history.length - 1;
        }

        tab.url = url;
        tab.scrollY = 0;
        this.scrollY = 0;
        tab.error = null;
        tab.title = url;

        if (tab === this.activeTab && !this.addressFocused) {
            this.addressBuffer = url;
        }

        this.loadUrl(tab, url);
    }

    goBack() {
        const tab = this.activeTab;
        if (tab.historyIndex > 0) {
            tab.historyIndex--;
            this.navigate(tab, tab.history[tab.historyIndex], false);
        }
    }

    goForward() {
        const tab = this.activeTab;
        if (tab.historyIndex < tab.history.length - 1) {
            tab.historyIndex++;
            this.navigate(tab, tab.history[tab.historyIndex], false);
        }
    }

    refresh() {
        this.loadUrl(this.activeTab, this.activeTab.url);
    }

    // CORE LOGIC

    async loadUrl(tab, urlKey) {
        if (urlKey === "browser://bookmarks") {
            tab.loading = false;
            tab.title = "Bookmarks";
            tab.blocks = [];
            tab.linkRegions = [];
            this.renderBookmarksPage(tab);
            return;
        }

        tab.loading = true;
        tab.progress = 0.1;
        tab.message = `Connecting to ${urlKey}...`;
        tab.blocks = [];
        tab.linkRegions = [];
        tab.secureStatus = "secure";

        if (tab.loadingInterval) clearInterval(tab.loadingInterval);
        tab.loadingInterval = setInterval(() => {
            tab.progress += Math.random() * 0.2;
            if (tab.progress > 0.8) clearInterval(tab.loadingInterval);
        }, 100);

        const path = SITE_ROUTES[urlKey];
        if (!path) {
            this.finishLoad(tab, null, "ERR_NAME_NOT_RESOLVED", "Host unreachable.", "danger");
            return;
        }

        const risk = this.assessConnectionRisk(urlKey);

        if (DARK_SITES.has(urlKey)) {
            tab.secureStatus = "warning";
            if (!this.isAroundRouterInstalled()) {
                this.finishLoad(tab, null, "ERR_PROTOCOL_REQUIRED", "AroundRouter Handshake Failed.", "danger");
                return;
            }
            if (this.getVpnTier() < 2) {
                tab.secureStatus = "danger";
                tab.message = "⚠ UNMASKED TRAFFIC DETECTED";
            } else {
                tab.message = `Encrypted Tunnel (VPN${this.getVpnTier()})`;
            }

            if (Math.random() < risk.trespasserRisk) {
                window.dispatchEvent(new CustomEvent("centeros-trespasser-risk", { detail: { source: "browser", url: urlKey } }));
            }
        } else if (urlKey === "center.center") {
            tab.message = "Verified Corporate Signature.";
            tab.secureStatus = "secure";
        } else {
            tab.message = "TLS Handshake Established.";
        }

        this.bumpHeat(risk.heatOnConnect);

        try {
            const resp = await fetch(path);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const htmlText = await resp.text();

            this.parseHtml(tab, htmlText);
            this.injectDynamicContent(tab, urlKey);
            this.finishLoad(tab);

            if (Math.random() < risk.traceChance) {
                window.dispatchEvent(new CustomEvent("centeros-trigger-trace", {
                    detail: { source: "browser", difficulty: risk.traceDifficulty || 1 }
                }));
            }
        } catch (e) {
            this.finishLoad(tab, null, "ERR_CONNECTION_TIMED_OUT", "Connection timed out.", "danger");
        }
    }

    finishLoad(tab, html = null, error = null, msg = "", status = "secure") {
        if (tab.loadingInterval) clearInterval(tab.loadingInterval);
        tab.loading = false;
        tab.progress = 1.0;
        tab.error = error;
        if (msg) tab.message = msg;
        if (status) tab.secureStatus = status;
    }

    isAroundRouterInstalled() { return !!(state.router && state.router.owned); }
    getVpnTier() { return (state.vpn && state.vpn.tier) || 0; }
    bumpHeat(amount) { if(amount) state.policeHeat = Math.max(0, Math.min(100, state.policeHeat + amount)); }

    assessConnectionRisk(urlKey) {
        const baseRisk = SITE_RISK[urlKey] ?? 0.1;
        const vpnTier = this.getVpnTier();
        const routerOwned = this.isAroundRouterInstalled();
        let routerFactor = 1.0;
        if (routerOwned && DARK_SITES.has(urlKey)) routerFactor = 0.75;
        const effectiveRisk = baseRisk * (1.0 - (vpnTier * 0.1)) * routerFactor;
        return {
            heatOnConnect: effectiveRisk * 5,
            traceChance: Math.max(0, effectiveRisk - 0.4),
            traceDifficulty: 1 + Math.floor(effectiveRisk * 4),
            trespasserRisk: urlKey === "darkesttrench.w3" && !routerOwned ? 0.3 : 0.0
        };
    }

    parseHtml(tab, htmlText) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, "text/html");

        const titleTag = doc.querySelector("title");
        if (titleTag) tab.title = titleTag.textContent;

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
        tab.blocks = blocks;
        tab.anchorMap = anchorMap;
    }

    injectDynamicContent(tab, urlKey) {
        window.dispatchEvent(new CustomEvent("centeros-refresh-sites"));
        const siteData = state.world.sites[urlKey];
        if (!siteData) return;

        if (urlKey === "pleasefindthem.com" && siteData.posts) {
            tab.blocks.push({ type: "heading", level: 2, text: "Recent Threads" });
            siteData.posts.forEach(p => {
                tab.blocks.push({ type: "paragraph", text: `------------------------------------------------`, color: "#555" });
                tab.blocks.push({ type: "heading", level: 2, text: p.title });
                tab.blocks.push({ type: "paragraph", text: `User: ${p.author} [Reward: ${p.reward} E€E]` });
                tab.blocks.push({ type: "paragraph", text: p.content });

                if (!p.isFlavor) {
                    const isAccepted = state.acceptedJobs.includes(p.id);
                    if (isAccepted) tab.blocks.push({ type: "paragraph", text: "[ JOB ACTIVE ]", color: "#00ff00" });
                    else tab.blocks.push({ type: "link", text: `>> ACCEPT CONTRACT`, href: `cmd:accept_job:${p.id}`, color: "#ffcc00" });
                }
            });
        }

        if (urlKey === "darkesttrench.w3" && siteData.entries) {
            tab.blocks.push({ type: "heading", level: 1, text: "Live Feeds" });
            siteData.entries.forEach(e => {
                if (e.type === "wiki") {
                    const color = e.dangerLevel > 4 ? "#ff4444" : "#aaaaaa";
                    tab.blocks.push({ type: "paragraph", text: `[RISK LEVEL ${e.dangerLevel}]`, color });
                    tab.blocks.push({ type: "heading", level: 2, text: e.title });
                    tab.blocks.push({ type: "paragraph", text: e.content });
                    tab.blocks.push({ type: "paragraph", text: "" });
                }
            });
        }

        if (urlKey === "anonboard.net" && siteData.threads) {
            tab.blocks = [];
            tab.blocks.push({ type: "heading", level: 1, text: "/b/ - Random" });
            tab.blocks.push({ type: "paragraph", text: "Anonymous Imageboard. Rules: None." });
            siteData.threads.forEach(t => {
                tab.blocks.push({ type: "paragraph", text: `------------------------------------------------`, color: "#444" });
                tab.blocks.push({ type: "heading", level: 2, text: t.title });
                tab.blocks.push({ type: "paragraph", text: `Anonymous No.${Math.floor(Math.random()*999999)}` });
                tab.blocks.push({ type: "paragraph", text: t.content, color: "#aaccff" });
                t.replies.forEach(r => {
                    tab.blocks.push({ type: "paragraph", text: `>> ${r.id} ${r.user}: ${r.text}`, color: "#888" });
                });
            });
        }

        if (urlKey === "marketwatch.w3" && siteData.stocks) {
            tab.blocks = [];
            tab.blocks.push({ type: "heading", level: 1, text: "MarketWatch" });
            tab.blocks.push({ type: "paragraph", text: "Live Ticker [DELAY: 0ms]" });
            siteData.stocks.forEach(s => {
                const color = s.change >= 0 ? "#00ff00" : "#ff0000";
                const sign = s.change >= 0 ? "+" : "";
                tab.blocks.push({ type: "heading", level: 2, text: `${s.symbol} : ${s.price}` });
                tab.blocks.push({ type: "paragraph", text: `${s.name} | Change: ${sign}${s.change}%`, color });
            });
        }
    }

    renderBookmarksPage(tab) {
        tab.blocks = [];
        tab.blocks.push({ type: "heading", level: 1, text: "Bookmarks Manager" });
        tab.blocks.push({ type: "paragraph", text: "------------------------------------------------" });

        if (this.bookmarks.size === 0) {
            tab.blocks.push({ type: "paragraph", text: "No bookmarks saved." });
        } else {
            this.bookmarks.forEach(url => {
                tab.blocks.push({ type: "link", text: `★ ${url}`, href: url });
                tab.blocks.push({ type: "paragraph", text: "" }); // Spacing
            });
        }
    }

    // INPUT HANDLING
    handleWheel(deltaY, rect) {
        const tab = this.activeTab;
        // Check content height against viewport
        if (this.contentHeight <= rect.height) return;

        tab.scrollY += deltaY;

        const maxScroll = this.contentHeight - rect.height;
        if (tab.scrollY < 0) tab.scrollY = 0;
        if (tab.scrollY > maxScroll) tab.scrollY = maxScroll;

        // Sync BaseApp scrollY for consistency
        this.scrollY = tab.scrollY;
    }

    handleKey(e) {
        if (e.type !== "keydown") return;
        if (this.addressFocused) {
            if (e.key === "Enter") {
                const raw = this.addressBuffer.trim();
                if (raw) this.navigate(this.activeTab, raw);
                this.addressFocused = false;
            } else if (e.key === "Backspace") {
                this.addressBuffer = this.addressBuffer.slice(0, -1);
            } else if (e.key.length === 1) {
                this.addressBuffer += e.key;
            } else if (e.key === "Escape") {
                this.addressFocused = false;
                this.addressBuffer = this.activeTab.url;
            }
        }
    }

    handleClick(globalX, globalY, contentRect) {
        const { x, y } = this.getLocalCoords(globalX, globalY, contentRect);

        const staticY = y - this.scrollY;
        const ui = this.ui;

        // 1. Tab Bar
        const tabH = 34;
        if (staticY < tabH) {
            if (this.isInside(x, staticY, ui.addTab.x, ui.addTab.y, ui.addTab.w, ui.addTab.h)) {
                this.addTab(); return;
            }
            for (let i = 0; i < this.tabs.length; i++) {
                const tx = 2 + i * 160;
                if (this.isInside(x, staticY, tx + 140, 8, 16, 16)) { this.closeTab(i); return; }
                if (this.isInside(x, staticY, tx, 0, 158, tabH)) { this.switchTab(i); return; }
            }
            return;
        }

        // 2. Navigation Bar
        if (staticY < tabH + 40) {
            if (this.isInside(x, staticY, ui.back.x, ui.back.y, ui.back.w, ui.back.h)) { this.goBack(); return; }
            if (this.isInside(x, staticY, ui.fwd.x, ui.fwd.y, ui.fwd.w, ui.fwd.h)) { this.goForward(); return; }
            if (this.isInside(x, staticY, ui.refresh.x, ui.refresh.y, ui.refresh.w, ui.refresh.h)) { this.refresh(); return; }
            if (this.isInside(x, staticY, ui.home.x, ui.home.y, ui.home.w, ui.home.h)) { this.navigate(this.activeTab, "home"); return; }
            if (this.isInside(x, staticY, ui.bmList.x, ui.bmList.y, ui.bmList.w, ui.bmList.h)) { this.navigate(this.activeTab, "browser://bookmarks"); return; }

            if (this.isInside(x, staticY, ui.star.x, ui.star.y, ui.star.w, ui.star.h)) {
                const url = this.activeTab.url;
                if (this.bookmarks.has(url)) this.bookmarks.delete(url);
                else this.bookmarks.add(url);
                return;
            }

            if (this.isInside(x, staticY, ui.address.x, ui.address.y, ui.address.w, ui.address.h)) {
                this.addressFocused = true;
                this.addressBuffer = this.activeTab.url;
                return;
            }
            return;
        }

        // 3. Content Clicks
        const tab = this.activeTab;
        for (const link of tab.linkRegions) {
            if (this.isInside(x, y, link.x, link.y, link.w, link.h)) {
                if (link.href.startsWith("cmd:")) {
                    const parts = link.href.split(":");
                    if (parts[1] === "accept_job" && !state.acceptedJobs.includes(parts[2])) {
                        state.acceptedJobs.push(parts[2]);
                        tab.message = "Contract Accepted. Check Postman.";
                        const job = state.world.sites["pleasefindthem.com"]?.posts.find(p => p.id === parts[2]);
                        if (job) window.dispatchEvent(new CustomEvent("centeros-job-accepted", { detail: { job } }));
                        this.refresh();
                    }
                } else if (SITE_ROUTES[link.href] || link.href === "browser://bookmarks") {
                    this.navigate(tab, link.href);
                } else if (link.href.startsWith("#")) {
                    const idx = tab.anchorMap[link.href];
                    if (idx != null) {
                        let estY = 80;
                        for(let i=0; i<idx && i<tab.blocks.length; i++) estY += 24;
                        tab.scrollY = Math.max(0, estY - 80);
                        this.scrollY = tab.scrollY;
                    }
                }
                return;
            }
        }
    }

    render(ctx, rect) {
        const tab = this.activeTab;
        this.scrollY = tab.scrollY;

        super.render(ctx, rect);
        const colors = this.getColors();

        const tabH = 34;
        const navH = 40;
        const statusH = 24;
        const contentTop = tabH + navH;

        // 1. RENDER CONTENT
        tab.linkRegions = [];
        let y = contentTop + 20;
        ctx.textAlign = "left"; ctx.textBaseline = "top";

        if (tab.url === "center.center") {
            const logoX = rect.x + 40; const logoY = rect.y + y;
            ctx.strokeStyle = colors.highlight; ctx.lineWidth = 2; ctx.strokeRect(logoX, logoY, 60, 60);
            ctx.fillStyle = colors.highlight; ctx.font = "bold 24px monospace"; ctx.textAlign = "center"; ctx.fillText("C", logoX + 30, logoY + 38);
            y += 80; ctx.textAlign = "left";
        }

        for (const block of tab.blocks) {
            const drawY = rect.y + y;
            if(block.type === "heading") {
                ctx.fillStyle = "#fff"; ctx.font = block.level===1 ? "bold 22px system-ui" : "bold 16px system-ui";
                ctx.fillText(block.text, rect.x + 20, drawY); y += block.level===1 ? 40 : 30;
            } else if (block.type === "paragraph") {
                ctx.fillStyle = block.color || "#ccc"; ctx.font = "13px system-ui"; const lineHeight = 20;
                const words = block.text.split(" "); let line = "";
                for(let w of words) {
                    if (ctx.measureText(line + w).width > rect.width - 60) { ctx.fillText(line, rect.x + 20, rect.y + y); line = ""; y += lineHeight; }
                    line += w + " ";
                }
                ctx.fillText(line, rect.x + 20, rect.y + y); y += lineHeight + 10;
            } else if (block.type === "link") {
                ctx.fillStyle = block.color || "#6ab0ff"; ctx.font = "13px system-ui"; const w = ctx.measureText(block.text).width;
                ctx.fillText(block.text, rect.x + 20, rect.y + y); ctx.fillRect(rect.x + 20, rect.y + y + 16, w, 1);
                tab.linkRegions.push({ x: 20, y: y, w, h: 16, href: block.href }); y += 24;
            }
        }
        this.contentHeight = y + statusH + 20;

        // 2. RENDER UI OVERLAY
        const staticY = rect.y + this.scrollY;

        // Mask content under UI
        ctx.fillStyle = colors.windowBg;
        ctx.fillRect(rect.x, staticY, rect.width, contentTop);

        // Tab Bar
        ctx.fillStyle = "#0c0e12";
        ctx.fillRect(rect.x, staticY, rect.width, tabH);

        for (let i = 0; i < this.tabs.length; i++) {
            const t = this.tabs[i];
            const tx = rect.x + 2 + i * 160;
            const isActive = i === this.activeTabIndex;

            ctx.fillStyle = isActive ? "#323642" : "#1b1d24";
            ctx.beginPath();
            ctx.roundRect(tx, staticY + 4, 158, tabH - 4, [8, 8, 0, 0]);
            ctx.fill();

            ctx.fillStyle = isActive ? "#fff" : "#888";
            ctx.font = "12px system-ui";
            ctx.fillText(t.title.substring(0, 18), tx + 12, staticY + 12);

            ctx.fillStyle = isActive ? "#ff5555" : "#555";
            ctx.font = "bold 12px monospace";
            ctx.fillText("x", tx + 145, staticY + 12);
        }

        const addX = rect.x + 2 + this.tabs.length * 160 + 5;
        this.ui.addTab = { x: 2 + this.tabs.length * 160 + 5, y: 4, w: 24, h: 24 };
        ctx.fillStyle = "#444";
        ctx.beginPath(); ctx.arc(addX + 12, staticY + 16, 10, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.fillText("+", addX + 12, staticY + 16);

        // Nav Bar
        const navY = staticY + tabH;
        ctx.fillStyle = "#20222a";
        ctx.fillRect(rect.x, navY, rect.width, navH);

        this.ui.back = { x: 10, y: tabH + 8, w: 24, h: 24 };
        this.ui.fwd = { x: 40, y: tabH + 8, w: 24, h: 24 };
        this.ui.refresh = { x: 70, y: tabH + 8, w: 24, h: 24 };
        this.ui.home = { x: 100, y: tabH + 8, w: 24, h: 24 };
        this.ui.bmList = { x: 130, y: tabH + 8, w: 24, h: 24 };

        const addrX = 165;
        const addrW = rect.width - addrX - 40;
        this.ui.address = { x: addrX, y: tabH + 5, w: addrW, h: 30 };
        this.ui.star = { x: addrX + addrW - 25, y: tabH + 8, w: 18, h: 18 };

        ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "16px system-ui";
        const drawBtn = (u, t, e=true) => { ctx.fillStyle = e?"#fff":"#555"; ctx.fillText(t, rect.x + u.x + 12, staticY + u.y + 12); };

        drawBtn(this.ui.back, "◀", tab.historyIndex > 0);
        drawBtn(this.ui.fwd, "▶", tab.historyIndex < tab.history.length - 1);
        drawBtn(this.ui.refresh, "⟳");
        drawBtn(this.ui.home, "⌂");
        drawBtn(this.ui.bmList, "🔖");

        const ax = rect.x + this.ui.address.x;
        const ay = staticY + this.ui.address.y;

        ctx.fillStyle = "#15171d";
        ctx.beginPath(); ctx.roundRect(ax, ay, this.ui.address.w, this.ui.address.h, 15); ctx.fill();

        let lockColor = "#888";
        if (tab.secureStatus === "secure") lockColor = "#4caf50";
        if (tab.secureStatus === "warning") lockColor = "#ff9800";
        if (tab.secureStatus === "danger") lockColor = "#f44336";

        ctx.fillStyle = lockColor; ctx.textAlign = "left";
        ctx.fillText("🔒", ax + 10, ay + 15);

        ctx.fillStyle = this.addressFocused ? "#fff" : "#aaa";
        ctx.font = "13px system-ui";
        const txt = this.addressFocused ? this.addressBuffer : tab.url;
        ctx.fillText(txt, ax + 30, ay + 15);

        const isBookmarked = this.bookmarks.has(tab.url);
        ctx.fillStyle = isBookmarked ? "#ffd700" : "#555";
        ctx.textAlign = "center";
        ctx.font = "14px system-ui";
        ctx.fillText("★", rect.x + this.ui.star.x + 9, staticY + this.ui.star.y + 9);

        // Status Bar
        const statY = staticY + rect.height - statusH;
        ctx.fillStyle = "#2b2e37"; ctx.fillRect(rect.x, statY, rect.width, statusH);
        ctx.fillStyle = "#888"; ctx.font = "11px system-ui"; ctx.textAlign = "left";
        ctx.fillText(tab.message, rect.x + 10, statY + 12);

        if (tab.loading) { ctx.fillStyle = "#4d9fff"; ctx.fillRect(rect.x, rect.y + contentTop + this.scrollY, rect.width * tab.progress, 2); }

        if (tab.error) {
            ctx.save();
            ctx.fillStyle = "#151821";
            ctx.fillRect(rect.x, rect.y + this.scrollY, rect.width, rect.height);
            ctx.translate(rect.x, rect.y + contentTop + 20 + this.scrollY);
            ctx.fillStyle = "#ff5555"; ctx.font = "bold 20px system-ui"; ctx.fillText("Connection Error", 40, 40);
            ctx.fillStyle = "#aaa"; ctx.font = "14px system-ui"; ctx.fillText(`Code: ${tab.error}`, 40, 70);
            ctx.restore();
        }
    }
}