import { state } from "../state.js";

// Map logical URLs/hostnames to local HTML asset paths.
const SITE_ROUTES = {
    "home": "sites/pleasefindthem.html",
    "pleasefindthem.com": "sites/pleasefindthem.html",
    "darkesttrench.w3": "sites/darkesttrench.html"
};

// Sites that live in the trench
const DARK_SITES = new Set([
    "darkesttrench.w3"
]);

// How risky each site is (0..1-ish)
const SITE_RISK = {
    "home": 0.0,
    "pleasefindthem.com": 0.4,
    "darkesttrench.w3": 0.9
};

export class BrowserApp {
    constructor() {
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

        // Address bar state
        this.addressFocused = false;
        this.addressBuffer = this.currentUrl;

        // Bookmarking
        this.bookmarks = new Set();   // Set of urlKeys
        this.showBookmarks = false;
        this.bookmarkRegions = [];    // clickable regions in the dropdown

        // UI rects for header elements (computed in render)
        this.uiRects = {
            address: null,
            star: null,
            bookmarks: null
        };

        this.navigateTo(this.currentUrl, true);
    }

    isAroundRouterInstalled() {
        return !!(state.router && state.router.owned);
    }

    getVpnTier() {
        return (state.vpn && state.vpn.tier) || 0; // 0..4
    }

    bumpHeat(amount) {
        if (!amount) return;
        const newHeat = Math.max(0, Math.min(100, (state.policeHeat || 0) + amount));
        state.policeHeat = newHeat;
    }

    maybeTriggerBrowserTrace(chance, baseDifficulty = 1) {
        if (!chance || chance <= 0) return;
        if (Math.random() >= chance) return;

        const difficulty = baseDifficulty || (Math.floor((state.policeHeat || 0) / 30) + 1);

        window.dispatchEvent(new CustomEvent("centeros-trigger-trace", {
            detail: {
                source: "browser",
                difficulty
            }
        }));
    }

    assessConnectionRisk(urlKey) {
        const baseRisk = SITE_RISK[urlKey] ?? 0.1;
        const vpnTier = this.getVpnTier();
        const routerOwned = this.isAroundRouterInstalled();
        const heat = state.policeHeat || 0;

        // Higher VPN tier = less risk multiplier
        let vpnFactor = 1.0;
        if (vpnTier === 1) vpnFactor = 0.8;
        else if (vpnTier === 2) vpnFactor = 0.6;
        else if (vpnTier === 3) vpnFactor = 0.45;
        else if (vpnTier >= 4) vpnFactor = 0.35;

        let routerFactor = 1.0;
        if (routerOwned && DARK_SITES.has(urlKey)) {
            routerFactor = 0.75;
        }

        const heatFactor = 0.5 + (heat / 100); // 0.5 .. 1.5

        const effectiveRisk = baseRisk * vpnFactor * routerFactor * heatFactor;

        const errorChance = Math.min(0.55, effectiveRisk * 0.6);
        const traceChance = Math.max(0, effectiveRisk - 0.35);

        const errorMessages = [
            "HTTP 522 - Origin connection timed out.",
            "502 - Bad gateway between you and the mirror.",
            "Route negotiation failed. Upstream node went silent.",
            "Mirror unreachable. Someone closed a door.",
            "TLS handshake aborted. Pattern looked wrong to someone."
        ];
        const errorMessage = errorMessages[Math.floor(Math.random() * errorMessages.length)];

        const heatOnConnect = 0.5 + effectiveRisk * 4;  // small bump for just looking
        const heatOnError   = 2 + effectiveRisk * 6;    // bigger bump on sketchy failure
        const difficulty    = 1 + Math.floor(effectiveRisk * 4); // 1..5-ish

        return {
            errorChance,
            errorMessage,
            heatOnConnect,
            heatOnError,
            traceChance,
            traceDifficulty: difficulty
        };
    }

    isBookmarked(urlKey) {
        return this.bookmarks.has(urlKey);
    }

    toggleBookmark(urlKey) {
        if (!urlKey) return;
        if (this.bookmarks.has(urlKey)) {
            this.bookmarks.delete(urlKey);
            if (this.bookmarks.size === 0) {
                this.showBookmarks = false;
            }
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

        if (!this.addressFocused) {
            this.addressBuffer = this.currentUrl;
        }

        if (pushHistory) {
            if (this.historyIndex < this.history.length - 1) {
                this.history = this.history.slice(0, this.historyIndex + 1);
            }
            this.history.push(urlKey);
            this.historyIndex = this.history.length - 1;
        }

        this.loadUrl(urlKey);
    }

    goBack() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            const urlKey = this.history[this.historyIndex];
            this.currentUrl = urlKey;
            this.scrollOffset = 0;
            this.loadUrl(urlKey);
            if (!this.addressFocused) {
                this.addressBuffer = this.currentUrl;
            }
        } else {
            this.message = "No previous page.";
        }
    }

    goForward() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            const urlKey = this.history[this.historyIndex];
            this.currentUrl = urlKey;
            this.scrollOffset = 0;
            this.loadUrl(urlKey);
            if (!this.addressFocused) {
                this.addressBuffer = this.currentUrl;
            }
        } else {
            this.message = "No next page.";
        }
    }

    async loadUrl(urlKey) {
        const path = SITE_ROUTES[urlKey];

        this.loading = true;
        this.error = null;
        this.blocks = [];
        this.linkRegions = [];
        this.anchorMap = {};
        this.maxScroll = 0;

        if (!path) {
            this.loading = false;
            this.error = `Unknown address: ${urlKey}`;
            return;
        }

        // Dark sites require AroundRouter at all
        if (DARK_SITES.has(urlKey)) {
            if (!this.isAroundRouterInstalled()) {
                this.loading = false;
                this.error = "Access denied.\nAroundRouter not detected.\nAcquire and install it from Underworld first.";
                return;
            }

            // Extra warning if you're going in naked
            if (this.getVpnTier() === 0) {
                this.message = "AroundRouter is active, but you're not tunneling through any VPN.";
                this.bumpHeat(3);
            }
        }

        // Assess risk and maybe error the connection
        const profile = this.assessConnectionRisk(urlKey);

        // Just trying to connect makes someone a bit suspicious
        this.bumpHeat(profile.heatOnConnect);

        // Fake network failure
        if (Math.random() < profile.errorChance) {
            this.loading = false;
            this.error = profile.errorMessage;
            this.bumpHeat(profile.heatOnError);
            this.maybeTriggerBrowserTrace(profile.traceChance, profile.traceDifficulty);
            return;
        }

        try {
            const resp = await fetch(path);
            if (!resp.ok) {
                throw new Error(`HTTP ${resp.status}`);
            }
            const htmlText = await resp.text();
            this.parseHtml(htmlText);
            this.loading = false;

            // On successful connection, still a small chance of a trace spike
            this.maybeTriggerBrowserTrace(profile.traceChance * 0.4, profile.traceDifficulty);
        } catch (e) {
            console.error("Browser loadUrl error:", e);
            this.loading = false;
            this.error = `Failed to load: ${urlKey}`;
            this.bumpHeat(2);
        }
    }

    parseHtml(htmlText) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, "text/html");
        const body = doc.body;

        const blocks = [];
        const anchorMap = {};

        function gatherText(node) {
            let text = "";
            node.childNodes.forEach((child) => {
                if (child.nodeType === Node.TEXT_NODE) {
                    text += child.textContent;
                } else if (child.nodeType === Node.ELEMENT_NODE) {
                    if (child.tagName.toLowerCase() === "br") {
                        text += "\n";
                    } else {
                        text += gatherText(child);
                    }
                }
            });
            return text;
        }

        function walk(node) {
            if (node.nodeType !== 1) return;

            const tag = node.tagName.toLowerCase();

            if (tag === "h1" || tag === "h2") {
                const text = node.textContent.trim();
                const blockIndex = blocks.length;
                const id = node.id && node.id.trim();
                if (id) {
                    anchorMap["#" + id] = blockIndex;
                }
                blocks.push({
                    type: "heading",
                    level: tag === "h1" ? 1 : 2,
                    text,
                    id: id || null
                });
            } else if (tag === "p") {
                const text = gatherText(node).trim();
                const blockIndex = blocks.length;
                const id = node.id && node.id.trim();
                if (id) {
                    anchorMap["#" + id] = blockIndex;
                }
                blocks.push({
                    type: "paragraph",
                    text,
                    id: id || null
                });
            } else if (tag === "a") {
                const href = node.getAttribute("href") || "";
                const text = node.textContent.trim() || href;
                const blockIndex = blocks.length;
                const id = node.id && node.id.trim();
                if (id) {
                    anchorMap["#" + id] = blockIndex;
                }
                blocks.push({
                    type: "link",
                    text,
                    href,
                    id: id || null
                });
            } else {
                if (node.children && node.children.length > 0) {
                    Array.from(node.children).forEach((child) => walk(child));
                }
            }
        }

        Array.from(body.children).forEach((child) => walk(child));

        this.blocks = blocks;
        this.anchorMap = anchorMap;
    }

    update(dt) {
        // no animations yet
    }

    handleKey(e) {
        if (e.type !== "keydown") return;

        // If address bar is focused, treat keys as text input
        if (this.addressFocused) {
            const key = e.key;

            if (key === "Enter") {
                const raw = this.addressBuffer.trim();
                if (raw.length === 0) {
                    this.addressFocused = false;
                    this.addressBuffer = this.currentUrl;
                    return;
                }
                if (SITE_ROUTES[raw]) {
                    this.addressFocused = false;
                    this.navigateTo(raw, true);
                    return;
                }
                const normalized = raw.replace(/\/+$/, "");
                if (SITE_ROUTES[normalized]) {
                    this.addressFocused = false;
                    this.navigateTo(normalized, true);
                    return;
                }
                this.message = `Unknown address: ${raw}`;
                this.addressFocused = false;
                this.addressBuffer = this.currentUrl;
                return;
            }

            if (key === "Escape") {
                this.addressFocused = false;
                this.addressBuffer = this.currentUrl;
                return;
            }

            if (key === "Backspace") {
                if (this.addressBuffer.length > 0) {
                    this.addressBuffer = this.addressBuffer.slice(0, -1);
                }
                return;
            }

            if (key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                this.addressBuffer += key;
                return;
            }

            return;
        }

        const key = e.key;

        if (key === "h" || key === "H") {
            this.navigateTo("home", true);
        } else if (key === "b" || key === "B") {
            this.goBack();
        } else if (key === "f" || key === "F") {
            this.goForward();
        } else if (key === "ArrowDown") {
            this.scrollOffset = Math.min(this.scrollOffset + 20, this.maxScroll);
        } else if (key === "ArrowUp") {
            this.scrollOffset = Math.max(this.scrollOffset - 20, 0);
        } else if (key === "PageDown") {
            this.scrollOffset = Math.min(this.scrollOffset + 80, this.maxScroll);
        } else if (key === "PageUp") {
            this.scrollOffset = Math.max(this.scrollOffset - 80, 0);
        } else if (key === "l" || key === "L") {
            this.addressFocused = true;
            this.addressBuffer = this.currentUrl;
        }
    }

    handleClick(localX, localY, contentRect) {
        const x = localX - contentRect.x;
        const y = localY - contentRect.y;

        const headerRects = this.uiRects;

        // Address bar click
        if (headerRects.address &&
            x >= headerRects.address.x && x <= headerRects.address.x + headerRects.address.w &&
            y >= headerRects.address.y && y <= headerRects.address.y + headerRects.address.h) {
            this.addressFocused = true;
            this.addressBuffer = this.currentUrl;
            this.showBookmarks = false;
            return;
        }

        // Star toggle
        if (headerRects.star &&
            x >= headerRects.star.x && x <= headerRects.star.x + headerRects.star.w &&
            y >= headerRects.star.y && y <= headerRects.star.y + headerRects.star.h) {

            this.toggleBookmark(this.currentUrl);
            this.message = this.isBookmarked(this.currentUrl)
                ? "Bookmarked."
                : "Bookmark removed.";
            return;
        }

        // Bookmarks dropdown toggle
        if (headerRects.bookmarks &&
            x >= headerRects.bookmarks.x && x <= headerRects.bookmarks.x + headerRects.bookmarks.w &&
            y >= headerRects.bookmarks.y && y <= headerRects.bookmarks.y + headerRects.bookmarks.h) {

            if (this.bookmarks.size > 0) {
                this.showBookmarks = !this.showBookmarks;
            } else {
                this.message = "No bookmarks saved.";
            }
            return;
        }

        // If bookmarks dropdown is visible, check it
        if (this.showBookmarks && this.bookmarkRegions.length > 0) {
            for (const reg of this.bookmarkRegions) {
                if (
                    x >= reg.x && x <= reg.x + reg.w &&
                    y >= reg.y && y <= reg.y + reg.h
                ) {
                    this.showBookmarks = false;
                    this.navigateTo(reg.urlKey, true);
                    return;
                }
            }
        } else {
            this.showBookmarks = false;
        }

        // Page content links
        for (const link of this.linkRegions) {
            if (
                x >= link.x && x <= link.x + link.w &&
                y >= link.y && y <= link.y + link.h
            ) {
                const href = link.href;
                if (SITE_ROUTES[href]) {
                    this.navigateTo(href, true);
                } else if (href && href.startsWith("#")) {
                    const idx = this.anchorMap[href];
                    if (idx != null) {
                        this.scrollToBlock(idx, contentRect.height);
                        this.message = "";
                    } else {
                        this.message = `Anchor not found: ${href}`;
                    }
                } else if (href) {
                    this.message = `Unknown link: ${href}`;
                }
                return;
            }
        }
    }

    scrollToBlock(blockIndex, viewHeight) {
        const padding = 12;
        const headerHeight = 28;
        const contentTop = headerHeight + 4;
        let cursorY = contentTop;

        for (let i = 0; i < this.blocks.length; i++) {
            const block = this.blocks[i];
            const lineHeight = 16;

            if (block.type === "heading") {
                const h = block.level === 1 ? 22 : 18;
                if (i === blockIndex) {
                    const desiredTop = cursorY - contentTop;
                    this.scrollOffset = Math.max(0, desiredTop);
                    return;
                }
                cursorY += h + 6;
            } else if (block.type === "paragraph" || block.type === "link") {
                const text = block.text || "";
                const lines = text.split("\n").length;
                const blockHeight = lines * lineHeight + 6;
                if (i === blockIndex) {
                    const desiredTop = cursorY - contentTop;
                    this.scrollOffset = Math.max(0, desiredTop);
                    return;
                }
                cursorY += blockHeight;
            } else {
                if (i === blockIndex) {
                    const desiredTop = cursorY - contentTop;
                    this.scrollOffset = Math.max(0, desiredTop);
                    return;
                }
            }
        }
    }

    render(ctx, rect) {
        ctx.fillStyle = "#080808";
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

        ctx.save();
        ctx.translate(rect.x, rect.y);

        const headerHeight = 28;

        // Header bar background
        ctx.fillStyle = "#141414";
        ctx.fillRect(0, 0, rect.width, headerHeight);

        // Address bar geometry
        const padding = 8;
        const starWidth = 18;
        const starMargin = 6;
        const bmBtnWidth = 18;

        const addressX = padding;
        const addressY = 6;
        const addressW = rect.width - padding * 2 - starWidth - bmBtnWidth - starMargin * 3;
        const addressH = headerHeight - 12;

        const starX = addressX + addressW + starMargin;
        const starY = (headerHeight - starWidth) / 2;
        const bmX = starX + starWidth + starMargin;
        const bmY = starY;

        // Store UI rects for click detection
        this.uiRects.address = { x: addressX, y: addressY, w: addressW, h: addressH };
        this.uiRects.star = { x: starX, y: starY, w: starWidth, h: starWidth };
        this.uiRects.bookmarks = { x: bmX, y: bmY, w: bmBtnWidth, h: bmBtnWidth };

        // Draw address bar box
        ctx.strokeStyle = this.addressFocused ? "#66aaff" : "#333333";
        ctx.lineWidth = 1;
        ctx.fillStyle = "#000000";
        ctx.fillRect(addressX, addressY, addressW, addressH);
        ctx.strokeRect(addressX + 0.5, addressY + 0.5, addressW - 1, addressH - 1);

        // Address text
        ctx.font = "11px system-ui";
        ctx.textBaseline = "middle";
        ctx.textAlign = "left";
        ctx.fillStyle = "#dddddd";
        const shownText = this.addressFocused ? this.addressBuffer : this.currentUrl;
        const textX = addressX + 6;
        const textY = addressY + addressH / 2;
        ctx.fillText(shownText, textX, textY);

        // Star
        const bookmarked = this.isBookmarked(this.currentUrl);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "14px system-ui";
        ctx.fillStyle = bookmarked ? "#ffd700" : "#555555";
        ctx.fillText("★", starX + starWidth / 2, starY + starWidth / 2);

        // Bookmarks button
        ctx.fillStyle = "#aaaaaa";
        ctx.font = "12px system-ui";
        ctx.fillText("≡", bmX + bmBtnWidth / 2, bmY + bmBtnWidth / 2);

        // Shortcuts text on the far right bottom of header
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.font = "9px system-ui";
        ctx.fillStyle = "#888888";
        ctx.fillText("H: Home  B/F: Back/Forward  L: URL", rect.width - 6, headerHeight - 6);

        // Content area
        const contentTop = headerHeight + 4;
        const contentBottom = rect.height - 24;
        const contentHeight = contentBottom - contentTop;

        this.linkRegions = [];
        this.bookmarkRegions = [];

        if (this.loading) {
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.fillStyle = "#dddddd";
            ctx.font = "11px system-ui";
            ctx.fillText("Loading...", padding, contentTop);
        } else if (this.error) {
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.fillStyle = "#ff6666";
            ctx.font = "11px system-ui";
            const lines = this.error.split("\n");
            let y = contentTop;
            for (const line of lines) {
                ctx.fillText(line, padding, y);
                y += 16;
            }
        } else {
            ctx.textBaseline = "top";

            let cursorY = contentTop - this.scrollOffset;
            const innerWidth = rect.width - padding * 2;
            const lineHeight = 14;

            for (let i = 0; i < this.blocks.length; i++) {
                const block = this.blocks[i];

                if (block.type === "heading") {
                    ctx.textAlign = "left";
                    ctx.fillStyle = "#ffffff";
                    ctx.font = block.level === 1 ? "14px system-ui" : "12px system-ui";

                    ctx.fillText(block.text, padding, cursorY);
                    cursorY += (block.level === 1 ? 22 : 18) + 6;
                } else if (block.type === "paragraph") {
                    ctx.textAlign = "left";
                    ctx.fillStyle = "#cccccc";
                    ctx.font = "11px system-ui";

                    cursorY = this.drawWrappedText(ctx, block.text, padding, cursorY, innerWidth, lineHeight);
                    cursorY += 6;
                } else if (block.type === "link") {
                    ctx.textAlign = "left";
                    ctx.font = "11px system-ui";
                    ctx.fillStyle = "#6ab0ff";

                    const linkText = block.text || block.href;
                    const lines = this.wrapText(ctx, linkText, innerWidth);
                    for (let li = 0; li < lines.length; li++) {
                        const line = lines[li];
                        const lx = padding;
                        const ly = cursorY;
                        ctx.fillText(line, lx, ly);

                        const metrics = ctx.measureText(line);
                        const w = metrics.width;
                        const h = lineHeight;

                        this.linkRegions.push({
                            x: lx,
                            y: ly,
                            w,
                            h,
                            href: block.href
                        });

                        cursorY += lineHeight;
                    }
                    cursorY += 6;
                }
            }

            const totalContentHeight = cursorY - (contentTop - this.scrollOffset);
            this.maxScroll = Math.max(0, totalContentHeight - contentHeight);
        }

        // Bookmarks dropdown
        if (this.showBookmarks && this.bookmarks.size > 0) {
            const list = Array.from(this.bookmarks);
            const dropdownWidth = Math.min(220, rect.width - padding * 2);
            const dropdownX = padding;
            const dropdownY = headerHeight + 4;
            const rowHeight = 18;
            const dropdownHeight = rowHeight * list.length + 8;

            ctx.fillStyle = "#101010";
            ctx.fillRect(dropdownX, dropdownY, dropdownWidth, dropdownHeight);
            ctx.strokeStyle = "#444444";
            ctx.strokeRect(dropdownX + 0.5, dropdownY + 0.5, dropdownWidth - 1, dropdownHeight - 1);

            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.font = "11px system-ui";
            ctx.fillStyle = "#eeeeee";

            this.bookmarkRegions = [];
            let y = dropdownY + 4;
            for (const urlKey of list) {
                const label = urlKey;
                ctx.fillText(label, dropdownX + 6, y);

                const metrics = ctx.measureText(label);
                const w = Math.min(metrics.width + 10, dropdownWidth - 12);

                this.bookmarkRegions.push({
                    x: dropdownX + 4,
                    y,
                    w,
                    h: rowHeight,
                    urlKey
                });

                y += rowHeight;
            }
        }

        // Status / message line at bottom
        if (this.message) {
            ctx.textBaseline = "middle";
            ctx.textAlign = "left";
            ctx.font = "10px system-ui";
            ctx.fillStyle = "#ffaa66";
            ctx.fillText(this.message, padding, rect.height - 10);
        }

        ctx.restore();
    }

    // Text wrapping helpers

    wrapText(ctx, text, maxWidth) {
        const words = text.split(/\s+/);
        const lines = [];
        let currentLine = "";

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const testLine = currentLine ? currentLine + " " + word : word;
            const metrics = ctx.measureText(testLine);
            const w = metrics.width;

            if (w > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }

        if (currentLine) {
            lines.push(currentLine);
        }

        return lines;
    }

    drawWrappedText(ctx, text, x, startY, maxWidth, lineHeight) {
        const lines = this.wrapText(ctx, text, maxWidth);
        let y = startY;
        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], x, y);
            y += lineHeight;
        }
        return y;
    }
}