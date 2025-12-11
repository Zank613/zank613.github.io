import { state } from "../state.js";
import { BaseApp } from "../core/baseApp.js";
import { networkManager } from "../os/networkManager.js";
import { fs } from "../os/fileSystem.js";
import { sendEmail } from "../world/emailGenerator.js";

const SITE_ROUTES = {
    "home": "sites/home.html",
    "pleasefindthem.com": "sites/pleasefindthem.html",
    "darkesttrench.w3": "sites/darkesttrench.html",
    "thecitypulse.w3": "sites/thecitypulse.html",
    "center.center": "sites/center.html",
    "anonboard.net": "sites/anonboard.html",
    "marketwatch.w3": "sites/marketwatch.html",
    "lifelog.net": "sites/lifelog.html",
    "govservices.center": "sites/govservices.html",
    "speedtester.center": "sites/speedtester.html",
    "safecracker.w3": "sites/safecracker.html",
    "decrypt.center": "sites/decryptcenter.html"
};

const DARK_SITES = new Set(["darkesttrench.w3", "safecracker.w3"]);
const SITE_RISK = {
    "home": 0.0, "center.center": 0.0, "pleasefindthem.com": 0.4,
    "darkesttrench.w3": 0.9, "safecracker.w3": 0.8,
    "anonboard.net": 0.6, "marketwatch.w3": 0.2, "govservices.center": 0.0,
    "lifelog.net": 0.1, "speedtester.center": 0.0, "decrypt.center": 0.3
};

const PAGE_SIZES = {
    "home": 150 * 1024,             // 150 KB
    "center.center": 400 * 1024,    // 400 KB
    "lifelog.net": 2.5 * 1024 * 1024, // 2.5 MB
    "darkesttrench.w3": 800 * 1024, // 800 KB
    "speedtester.center": 500 * 1024, // 500 KB
    "default": 300 * 1024           // 300 KB average
};

class BrowserTab {
    constructor(url = "home") {
        this.url = url;
        this.title = "New Tab";
        this.history = [url];
        this.historyIndex = 0;
        this.loading = false;
        this.bytesLoaded = 0;
        this.totalBytes = 0;
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

        // SpeedTest specific state
        this.speedTestState = {
            running: false,
            phase: 'idle', // idle, ping, download, upload, done
            progress: 0,
            visualSpeed: 0,
            targetSpeed: 0,
            ping: 0,
            jitter: 0,
            finalDownload: 0,
            finalUpload: 0,
            maxScale: 100
        };

        this.uploadState = { active: false, files: [], message: "" };
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
        this.bookmarks = new Set(["home", "pleasefindthem.com", "speedtester.center"]);

        this.ui = {};

        // Interactive Regions
        this.speedTestBtn = null;

        // Start with one tab
        this.addTab("home");

        window.addEventListener("centeros-file-picked", (e) => {
            if (e.detail.sourceApp === "browser") {
                this.handleFileSelected(e.detail.fileId);
            }
        });
    }


    update(dt) {
        const tab = this.activeTab;

        // 1. Handle Loading
        if (tab.loading && !tab.error) {
            // Get current speed from network manager (Bytes/sec)
            const speed = networkManager.getCurrentDownloadSpeed();

            // Increment loaded bytes
            tab.bytesLoaded += speed * dt;

            // Calculate progress
            if (tab.totalBytes > 0) {
                tab.progress = Math.min(1.0, tab.bytesLoaded / tab.totalBytes);
            }

            // Update status message
            const speedStr = networkManager.formatBytes(speed) + "/s";
            const loadedStr = networkManager.formatBytes(tab.bytesLoaded);
            const totalStr = networkManager.formatBytes(tab.totalBytes);
            tab.message = `Downloading... ${loadedStr} / ${totalStr} (${speedStr})`;

            // Finish loading
            if (tab.bytesLoaded >= tab.totalBytes) {
                this.finalizePageLoad(tab);
            }
        }

        // 2. Handle SpeedTest Logic
        if (tab.url === "speedtester.center") {
            this.updateSpeedTest(tab, dt);
        }
    }

    updateSpeedTest(tab, dt) {
        const st = tab.speedTestState;
        if (!st.running) {
            // Needle decay (return to 0)
            st.visualSpeed += (0 - st.visualSpeed) * 3 * dt;
            return;
        }

        const net = networkManager.getConnectedNetwork();
        if (!net) {
            st.running = false;
            st.phase = 'error';
            return;
        }

        // Phases
        if (st.phase === 'ping') {
            st.progress += dt * 2; // quick
            // Randomize numbers for "connecting" look
            st.ping = Math.floor(Math.random() * 40) + 10;
            st.jitter = Math.floor(Math.random() * 10);
            if (st.progress >= 1) {
                st.phase = 'download';
                st.progress = 0;
            }
        }
        else if (st.phase === 'download') {
            st.progress += dt * 0.2; // 5 seconds duration

            // Get Real Simulated Speed
            const realBytes = networkManager.getCurrentDownloadSpeed();
            const realMbps = (realBytes * 8) / 1000000;

            // Add noise
            const noise = (Math.random() - 0.5) * (realMbps * 0.1);
            st.targetSpeed = Math.max(0, realMbps + noise);

            // Auto scale gauge
            if (st.targetSpeed > st.maxScale) st.maxScale = st.targetSpeed * 1.5;

            // Smooth needle
            const diff = st.targetSpeed - st.visualSpeed;
            st.visualSpeed += diff * 5 * dt;

            if (st.progress >= 1) {
                st.finalDownload = st.visualSpeed;
                st.phase = 'upload';
                st.progress = 0;
            }
        }
        else if (st.phase === 'upload') {
            st.progress += dt * 0.2;

            // Simulate Upload
            const realBytes = networkManager.getCurrentDownloadSpeed() * 0.6;
            const realMbps = (realBytes * 8) / 1000000;

            st.targetSpeed = realMbps;

            const diff = st.targetSpeed - st.visualSpeed;
            st.visualSpeed += diff * 5 * dt;

            if (st.progress >= 1) {
                st.finalUpload = st.visualSpeed;
                st.phase = 'done';
                st.running = false;
            }
        }
    }

    startSpeedTest() {
        const tab = this.activeTab;
        if (tab.url !== "speedtester.center") return;

        tab.speedTestState.running = true;
        tab.speedTestState.phase = 'ping';
        tab.speedTestState.progress = 0;
        tab.speedTestState.maxScale = 100;
        tab.speedTestState.finalDownload = 0;
        tab.speedTestState.finalUpload = 0;
    }

    getMemoryUsage() {
        let mem = 60; // Heavy base engine overhead

        // Each tab adds overhead
        mem += this.tabs.length * 25;

        // Active tab content adds memory
        const active = this.activeTab;
        if (active) {
            // Convert loaded bytes to MB (approx) and multiply for DOM overhead
            if (active.totalBytes) {
                mem += (active.totalBytes / 1024 / 1024) * 8;
            }
            // SpeedTest buffers
            if (active.speedTestState && active.speedTestState.running) {
                mem += 150;
            }
        }

        return mem + Math.random(); // Jitter
    }

    getCpuUsage() {
        let cpu = 1.0; // Base browser idle
        const active = this.activeTab;

        if (active.loading) cpu += 15.0; // Parsing HTML is heavy
        if (active.url === "speedtester.center" && active.speedTestState.running) cpu += 40.0; // JS heavy
        if (active.secureStatus === "danger") cpu += 5.0; // Encryption overhead

        return cpu + Math.random();
    }

    handleFileSelected(fileId) {
        const tab = this.activeTab;

        let file = fs.downloads.children.find(f => f.id === fileId);
        if (!file) file = fs.sys.children.find(f => f.id === fileId);
        if (!file) file = fs.desktop.children.find(f => f.id === fileId);

        if (!file) {
            tab.uploadState.message = "Error: File access failed (Not found).";
            return;
        }

        if (tab.url === "decrypt.center") {
            this.processDecryptCenterUpload(file);
        } else if (tab.url === "safecracker.w3") {
            this.processSafeCrackerUpload(file);
        }
    }

    processDecryptCenterUpload(file) {
        const tab = this.activeTab;
        tab.uploadState.message = `Uploading ${file.name}...`;
        this.refresh();

        setTimeout(() => {
            // Kernel Trap
            if (file.name === "kernel.ccts") {
                state.policeHeat = Math.min(100, state.policeHeat + 35);
                tab.uploadState.message = "CRITICAL ALERT: RESTRICTED KERNEL SIGNATURE DETECTED. TRACE INITIATED.";
                tab.secureStatus = "danger";
                window.dispatchEvent(new CustomEvent("centeros-trigger-trace", { detail: { difficulty: 3 } }));
                this.refresh();
                return;
            }

            if (file.isMalicious) {
                state.policeHeat += 25;
                state.reputation.police -= 15;
                tab.uploadState.message = "ALERT: MALICIOUS CODE DETECTED. INCIDENT LOGGED.";
                this.refresh();
            } else {
                file.rename(file.name.replace(".ces", ".ccts"));
                state.reputation.police += 2;
                tab.uploadState.message = `Verification Complete. ${file.name} is now clean/controlled.`;
                this.refresh();
            }
        }, 1500); // 1.5s simulated upload
    }

    processSafeCrackerUpload(file) {
        const tab = this.activeTab;

        if (state.eightcoin < 1) {
            tab.uploadState.message = "Upload rejected: Insufficient funds (1 E€E required).";
            this.refresh();
            return;
        }

        state.eightcoin -= 1;
        tab.uploadState.message = `Uploading ${file.name} for decryption...`;
        this.refresh();

        setTimeout(() => {
            const newName = file.name.replace(".ces", ".cts");
            const body = `Decryption complete.\nTarget: ${file.name}\n\nDownload: cmd:download_cts:${file.id}`;
            sendEmail("admin@safecracker.w3", "File Ready", body);
            tab.uploadState.message = "Processing complete. Check your email.";
            this.refresh();
        }, 2000);
    }

    // --- TAB MANAGEMENT ---

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

    // --- NAVIGATION ---

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

    // --- CORE LOGIC ---

    async loadUrl(tab, urlKey) {
        // Reset Tab State
        tab.loading = true;
        tab.progress = 0;
        tab.bytesLoaded = 0;
        // Determine file size
        tab.totalBytes = PAGE_SIZES[urlKey] || PAGE_SIZES["default"];

        tab.error = null;
        tab.blocks = [];
        tab.linkRegions = [];
        tab.secureStatus = "secure";

        // Special: Bookmarks (instant load)
        if (urlKey === "browser://bookmarks") {
            tab.totalBytes = 100; // tiny
            this.finalizePageLoad(tab);
            return;
        }

        const path = SITE_ROUTES[urlKey];
        // Handle LifeLog subpages
        let realPath = path;
        if (!realPath && urlKey.startsWith("lifelog.net/u/")) realPath = SITE_ROUTES["lifelog.net"];

        if (!realPath) {
            tab.loading = false;
            tab.error = "ERR_NAME_NOT_RESOLVED";
            return;
        }

        // Security Check
        const risk = this.assessConnectionRisk(urlKey);
        if (DARK_SITES.has(urlKey)) {
            tab.secureStatus = "warning";
            if (!this.isAroundRouterInstalled()) { tab.loading = false; tab.error = "ERR_PROTOCOL_REQUIRED"; return; }
            if (this.getVpnTier() < 2) { tab.secureStatus = "danger"; }
            if (Math.random() < risk.trespasserRisk) window.dispatchEvent(new CustomEvent("centeros-trespasser-risk", { detail: { source: "browser", url: urlKey } }));
        } else if (urlKey === "center.center") {
            tab.secureStatus = "secure";
        }

        // Start Fetch
        try {
            const resp = await fetch(realPath);
            if (!resp.ok) throw new Error("HTTP");
            tab.htmlContent = await resp.text(); // Store for later

            this.bumpHeat(risk.heatOnConnect);
            if (Math.random() < risk.traceChance) window.dispatchEvent(new CustomEvent("centeros-trigger-trace", { detail: { source: "browser", difficulty: 1 } }));

        } catch (e) {
            tab.loading = false;
            tab.error = "ERR_CONNECTION_TIMED_OUT";
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

    // --- HELPERS ---

    isAroundRouterInstalled() { return !!(state.router && state.router.owned); }
    getVpnTier() { return (state.vpn && state.vpn.tier) || 0; }
    bumpHeat(amount) { if(amount) state.policeHeat = Math.max(0, Math.min(100, state.policeHeat + amount)); }


    finalizePageLoad(tab) {
        tab.loading = false;
        tab.progress = 1.0;
        tab.message = "Done";

        if (tab.url === "browser://bookmarks") {
            this.renderBookmarksPage(tab);
        } else if (tab.htmlContent) {
            this.parseHtml(tab, tab.htmlContent);
            this.injectDynamicContent(tab, tab.url);
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
            heatOnConnect: effectiveRisk * 5,
            traceChance: Math.max(0, effectiveRisk - 0.4),
            traceDifficulty: 1 + Math.floor(effectiveRisk * 4),
            trespasserRisk: urlKey === "darkesttrench.w3" && !routerOwned ? 0.3 : 0.0
        };
    }

    // --- PARSING & CONTENT ---

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

        let siteData = state.world.sites[urlKey];
        if (!siteData) {
            window.dispatchEvent(new CustomEvent("centeros-refresh-sites"));
            siteData = state.world.sites[urlKey];
        }

        // Handle Sub-pages (like lifelog profiles)
        if (!siteData && urlKey.startsWith("lifelog.net")) {
            siteData = state.world.sites["lifelog.net"];
        }

        // FIX: Allow decryption sites to load without world-gen siteData
        if (!siteData && urlKey !== "speedtester.center" && urlKey !== "decrypt.center" && urlKey !== "safecracker.w3") return;

        // PleaseFindThem
        if (urlKey === "pleasefindthem.com" && siteData && siteData.posts) {
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

        // DarkestTrench
        if (urlKey === "darkesttrench.w3" && siteData && siteData.entries) {
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

            tab.blocks.push({ type: "heading", level: 2, text: "Binary Depot (Verified)" });
            tab.blocks.push({ type: "paragraph", text: "Tools for the modern operator. Encrypted delivery." });

            const tools = [
                { name: "HeatWiper_v1.ces", desc: "Flush system logs. Reduce active trace.", cost: 0, id: "tool_heat" },
                { name: "MinerPatch.ces", desc: "Brute force wallet harvester.", cost: 0, id: "tool_miner" },
                { name: "NetMap_Pro.ces", desc: "Aggressive SSID discovery.", cost: 0, id: "tool_net" }
            ];

            tools.forEach(tool => {
                tab.blocks.push({
                    type: "paragraph",
                    text: `${tool.name} - ${tool.desc}`,
                    color: "#aaccff"
                });
                tab.blocks.push({
                    type: "link",
                    text: `>> DOWNLOAD [${tool.name}]`,
                    href: `cmd:download_tool:${tool.id}`,
                    color: "#ffcc00"
                });
                tab.blocks.push({ type: "paragraph", text: "" });
            });
        }

        // AnonBoard
        if (urlKey === "anonboard.net" && siteData && siteData.threads) {
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

        // MarketWatch
        if (urlKey === "marketwatch.w3" && siteData && siteData.stocks) {
            siteData.stocks.forEach(s => {
                const color = s.change >= 0 ? "#00ff00" : "#ff0000";
                const sign = s.change >= 0 ? "+" : "";
                tab.blocks.push({ type: "heading", level: 2, text: `${s.symbol} : ${s.price}` });
                tab.blocks.push({ type: "paragraph", text: `${s.name} | Change: ${sign}${s.change}%`, color });
            });
        }

        // City Pulse
        if (urlKey === "thecitypulse.w3" && siteData && siteData.headlines) {
            siteData.headlines.forEach(news => {
                tab.blocks.push({ type: "heading", level: 2, text: news.title });
                tab.blocks.push({ type: "paragraph", text: news.content });
                tab.blocks.push({ type: "paragraph", text: "" });
            });
        }

        // LifeLog
        if (urlKey === "lifelog.net" && siteData) {
            if (siteData.feed) {
                tab.blocks.push({ type: "heading", level: 1, text: "Global Feed" });
                siteData.feed.forEach(f => {
                    tab.blocks.push({ type: "paragraph", text: `------------------------------------------------`, color: "#444" });
                    tab.blocks.push({ type: "link", text: f.username, href: `lifelog.net/u/${f.userId}`, color: "#4db4ff" });
                    tab.blocks.push({ type: "paragraph", text: `${f.time}: ${f.text}` });
                });
            }
        } else if (urlKey.startsWith("lifelog.net/u/") && siteData) {
            const userId = urlKey.split("/u/")[1];
            const profile = siteData.profiles ? siteData.profiles.find(p => p.id === userId) : null;

            if (profile) {
                tab.title = profile.username;
                tab.blocks = [];
                tab.blocks.push({ type: "heading", level: 1, text: profile.name });
                tab.blocks.push({ type: "heading", level: 2, text: profile.username });
                tab.blocks.push({ type: "paragraph", text: profile.bio, color: "#aaa" });
                tab.blocks.push({ type: "paragraph", text: "------------------------------------------------" });

                profile.posts.forEach(p => {
                    tab.blocks.push({ type: "paragraph", text: `${p.time}: ${p.text}` });
                    tab.blocks.push({ type: "paragraph", text: "" });
                });
            } else {
                tab.blocks.push({ type: "heading", level: 2, text: "User Not Found" });
            }
        }

        // GovServices
        if (urlKey === "govservices.center" && siteData) {
            const data = siteData; // Direct access since it's the root object for this site
            if (data && data.status) {
                let color = "#00ff00";
                if(data.status === "WATCH_LIST") color = "#ffaa00";
                if(data.status === "SUSPECT_PROFILE" || data.status === "FUGITIVE_WARRANT") color = "#ff0000";

                tab.blocks.push({ type: "heading", level: 2, text: "Citizen Status" });
                tab.blocks.push({ type: "paragraph", text: `Current Standing: ${data.status}`, color: color });
                tab.blocks.push({ type: "paragraph", text: `Outstanding Fines: ${data.fine} E€E` });

                if (data.fine > 0) {
                    if (state.eightcoin >= data.fine) {
                        tab.blocks.push({ type: "link", text: `>> PAY FULL AMOUNT`, href: `cmd:pay_fine`, color: "#00ff00" });
                    } else {
                        tab.blocks.push({ type: "paragraph", text: "[INSUFFICIENT FUNDS TO PAY]", color: "#555" });
                    }
                } else {
                    tab.blocks.push({ type: "paragraph", text: "No actions required.", color: "#888" });
                }
            }
        }

        if (urlKey === "safecracker.w3") {
            tab.blocks.push({ type: "heading", level: 2, text: "Anonymous Decryption" });
            tab.blocks.push({ type: "paragraph", text: "Rate: 1 E€E per file. No logs. No questions." });

            if (tab.uploadState.message) {
                tab.blocks.push({ type: "paragraph", text: tab.uploadState.message, color: "#00ff00" });
            }

            tab.blocks.push({ type: "paragraph", text: " " });
            tab.blocks.push({
                type: "link",
                text: "[ BROWSE LOCAL FILES ]",
                href: "cmd:trigger_upload_dialog",
                color: "#ffcc00"
            });
        }

        if (urlKey === "decrypt.center") {
            tab.blocks = []; // Wipe static HTML

            // Header
            tab.blocks.push({ type: "heading", level: 1, text: "CENTER | DECRYPT", color: "#ffffff" });
            tab.blocks.push({ type: "paragraph", text: "Gateway Status: ONLINE | Secure Connection: TLS 1.3", color: "#2d7a3e" });
            tab.blocks.push({ type: "paragraph", text: "________________________________________________________________", color: "#ccc" });

            tab.blocks.push({ type: "heading", level: 2, text: "File Verification Portal", color: "#003366" });
            tab.blocks.push({ type: "paragraph", text: "Upload suspicious binaries for heuristic analysis.", color: "#333333" });
            tab.blocks.push({ type: "paragraph", text: "Warning: Interaction with Class-A malware is a felony.", color: "#cc0000" });

            if (tab.uploadState.message) {
                tab.blocks.push({ type: "paragraph", text: `>> ${tab.uploadState.message}`, color: "#0056b3" });
            }

            // BUTTON INSTEAD OF LIST
            tab.blocks.push({ type: "paragraph", text: " " });
            tab.blocks.push({
                type: "link",
                text: "[ + SELECT FILE FOR UPLOAD ]",
                href: "cmd:trigger_upload_dialog",
                color: "#0056b3"
            });

            // Footer
            tab.blocks.push({ type: "paragraph", text: "________________________________________________________________", color: "#ccc" });
            tab.blocks.push({ type: "paragraph", text: "© Center Inc. All rights reserved. Authorized use only.", color: "#999999" });
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

    // --- INPUT HANDLING ---

    handleWheel(deltaY, rect) {
        const tab = this.activeTab;
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

        // 1. Tab Bar Clicks
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

        // 2. Navigation Bar Clicks
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

        // 3. Special Click Handling for SpeedTest
        if (this.activeTab.url === "speedtester.center" && this.speedTestBtn) {
            if (this.isInside(x, y, this.speedTestBtn.x, this.speedTestBtn.y, this.speedTestBtn.w, this.speedTestBtn.h)) {
                this.startSpeedTest();
                return;
            }
        }

        // 4. Content Clicks (Scrolled Y)
        const tab = this.activeTab;
        for (const link of tab.linkRegions) {
            if (this.isInside(x, y, link.x, link.y, link.w, link.h)) {
                if (link.href.startsWith("cmd:")) {
                    this.handleCommandLink(link.href);
                } else if (SITE_ROUTES[link.href] || link.href === "browser://bookmarks" || link.href.startsWith("lifelog.net")) {
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

    onCopy() {
        return this.activeTab.url;
    }

    onPaste(text) {
        if (this.addressFocused) {
            this.addressBuffer += text;
        } else {
            this.addressFocused = true;
            this.addressBuffer = text;
        }
    }

    handleCommandLink(cmdString) {
        const parts = cmdString.split(":");
        const command = parts[1];
        const arg = parts[2];

        if (command === "accept_job") {
            if (!state.acceptedJobs.includes(arg)) {
                state.acceptedJobs.push(arg);
                this.activeTab.message = "Job Accepted. Check Postman.";
                const job = state.world.sites["pleasefindthem.com"]?.posts.find(p => p.id === arg);
                if (job) window.dispatchEvent(new CustomEvent("centeros-job-accepted", { detail: { job } }));
                this.refresh();
            }
        }

        // Pay Fine Logic
        if (command === "pay_fine") {
            const data = state.world.sites["govservices.center"];
            if (data && data.fine > 0 && state.eightcoin >= data.fine) {
                state.eightcoin -= data.fine;
                state.policeHeat = 0; // Clear heat

                // Update local state to reflect payment
                data.fine = 0;
                data.status = "GOOD_STANDING";

                this.activeTab.message = "Payment Successful. Record Cleaned.";
                this.refresh();
            }
        }

        if (command === "upload_safecracker") {
            const file = fs.home.downloads.find(f => f.id === arg);
            if (!file) return;

            if (state.eightcoin < 1) {
                this.activeTab.uploadState.message = "Insufficient funds. Need 1 E€E.";
                this.refresh();
                return;
            }

            state.eightcoin -= 1;
            this.activeTab.uploadState.message = "File uploaded. Processing... Check email shortly.";
            this.refresh();

            // Simulate delay then email
            setTimeout(() => {
                const newName = file.name.replace(".ces", ".cts");
                const body = `Decryption complete.\nTarget: ${file.name}\n\nDownload: cmd:download_cts:${file.id}`;
                sendEmail("admin@safecracker.w3", "File Ready", body);
            }, 3000);
        }

        if (command === "upload_center") {
            const file = fs.home.downloads.find(f => f.id === arg);

            // Allow looking in SYS folder if argument came from there
            const sysFile = fs.sys.children.find(f => f.id === arg);
            const targetFile = file || sysFile;

            if (!targetFile) return;

            this.activeTab.uploadState.message = "Scanning file signature...";
            this.refresh();

            setTimeout(() => {
                // --- KERNEL UPLOAD TRAP ---
                if (targetFile.name === "kernel.ccts") {
                    state.policeHeat = Math.min(100, state.policeHeat + 25);
                    this.activeTab.uploadState.message = "ERROR 0x99: ILLEGAL SUBMISSION. KERNEL SIGNATURE DETECTED. INCIDENT REPORTED.";
                    this.activeTab.secureStatus = "danger";
                    this.refresh();
                    return;
                }
                // -------------------------------------

                if (targetFile.isMalicious) {
                    state.policeHeat += 25;
                    state.reputation.police -= 15;
                    this.activeTab.uploadState.message = "ALERT: MALICIOUS CODE DETECTED. INCIDENT LOGGED.";
                } else {
                    targetFile.rename(targetFile.name.replace(".ces", ".ccts"));
                    state.reputation.police += 2;
                    this.activeTab.uploadState.message = "File verified clean. Converted to .ccts (Controlled).";
                }
                this.refresh();
            }, 2000);
        }

        if (cmdString.startsWith("cmd:download_tool:")) {
            const toolId = cmdString.split(":")[2];
            let fileName = "";
            let content = "";

            if (toolId === "tool_heat") {
                fileName = "HeatWiper.ces";
                // The content is the "Script Logic" hidden inside the file
                content = "HEADER: ENCRYPTED_V4\nRUN: FLUSH_LOGS\nSIG: 0x99281";
            } else if (toolId === "tool_miner") {
                fileName = "WalletCrack.ces";
                content = "HEADER: ENCRYPTED_V4\nRUN: WALLET_DUMP\nSIG: 0x11234";
            } else if (toolId === "tool_net") {
                fileName = "NetMapper.ces";
                content = "HEADER: ENCRYPTED_V4\nRUN: NET_MAPPER\nSIG: 0xFF001";
            }

            if (fileName) {
                // Add directly to downloads
                const file = fs.home.downloads.addFile(fileName, content, "encrypted");
                this.activeTab.message = `Downloaded ${fileName} to ~/downloads`;
                this.refresh();
            }
        }

        if (cmdString === "cmd:trigger_upload_dialog") {
            window.dispatchEvent(new CustomEvent("centeros-open-file-picker", {
                detail: { sourceApp: "browser" }
            }));
        }
    }

    // --- RENDER ---

    render(ctx, rect) {
        const tab = this.activeTab;
        this.scrollY = tab.scrollY; // Sync for BaseApp drawing

        super.render(ctx, rect); // Clears bg
        const colors = this.getColors();

        const tabH = 34;
        const navH = 40;
        const statusH = 24;
        const contentTop = tabH + navH;

        // --- 1. RENDER CONTENT ---

        if (tab.url === "speedtester.center" && !tab.loading) {
            this.renderSpeedTestPage(ctx, rect, contentTop);
        } else {

            if (tab.url === "decrypt.center" && !tab.loading) {
                ctx.fillStyle = "#f4f6f9";
                ctx.fillRect(rect.x, rect.y + contentTop, rect.width, rect.height - contentTop - statusH);

                // Draw Corporate Header Bar
                ctx.fillStyle = "#002244";
                ctx.fillRect(rect.x, rect.y + contentTop, rect.width, 60);
            }

            tab.linkRegions = [];
            let y = contentTop + 20;
            ctx.textAlign = "left"; ctx.textBaseline = "top";

            // Center Logo Special
            if (tab.url === "center.center") {
                const logoX = rect.x + 40; const logoY = rect.y + y;
                ctx.strokeStyle = colors.highlight; ctx.lineWidth = 2; ctx.strokeRect(logoX, logoY, 60, 60);
                ctx.fillStyle = colors.highlight; ctx.font = "bold 24px monospace"; ctx.textAlign = "center"; ctx.fillText("C", logoX + 30, logoY + 38);
                y += 80; ctx.textAlign = "left";
            }

            for (const block of tab.blocks) {
                const drawY = rect.y + y;
                if(block.type === "heading") {
                    ctx.fillStyle = block.color || "#fff";
                    ctx.font = block.level===1 ? "bold 22px system-ui" : "bold 16px system-ui";
                    ctx.fillText(block.text, rect.x + 20, drawY); y += block.level===1 ? 40 : 30;
                } else if (block.type === "paragraph") {
                    ctx.fillStyle = block.color || "#ccc";
                    ctx.font = "13px system-ui"; const lineHeight = 20;
                    const words = block.text.split(" "); let line = "";
                    for(let w of words) {
                        if (ctx.measureText(line + w).width > rect.width - 60) { ctx.fillText(line, rect.x + 20, rect.y + y); line = ""; y += lineHeight; }
                        line += w + " ";
                    }
                    ctx.fillText(line, rect.x + 20, rect.y + y); y += lineHeight + 10;
                } else if (block.type === "link") {
                    ctx.fillStyle = block.color || "#6ab0ff";
                    ctx.font = "13px system-ui"; const w = ctx.measureText(block.text).width;
                    ctx.fillText(block.text, rect.x + 20, rect.y + y);

                    // Link Underline
                    ctx.fillStyle = block.color || "#6ab0ff";
                    ctx.fillRect(rect.x + 20, rect.y + y + 16, w, 1);

                    tab.linkRegions.push({ x: 20, y: y, w, h: 16, href: block.href }); y += 24;
                }
            }
            this.contentHeight = y + statusH + 20;
        }

        // --- 2. RENDER UI OVERLAY ---
        this.renderBrowserChrome(ctx, rect, tab, tabH, navH, statusH, contentTop, colors);
    }

    renderSpeedTestPage(ctx, rect, contentTop) {
        const tab = this.activeTab;
        const st = tab.speedTestState;

        ctx.save();
        ctx.translate(rect.x, rect.y + contentTop + 40);

        const cx = rect.width / 2;
        const cy = 140;
        const radius = 100;

        // Gauge BG
        ctx.lineWidth = 15;
        ctx.strokeStyle = "#333";
        ctx.beginPath();
        ctx.arc(cx, cy, radius, Math.PI, 0);
        ctx.stroke();

        // Active Gauge
        const progress = Math.min(1, Math.max(0, st.visualSpeed / st.maxScale));
        const endAngle = Math.PI + (progress * Math.PI);
        const grad = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy);
        grad.addColorStop(0, "#4d9fff"); grad.addColorStop(1, "#55ff55");
        ctx.strokeStyle = grad;
        ctx.beginPath(); ctx.arc(cx, cy, radius, Math.PI, endAngle); ctx.stroke();

        // Needle
        ctx.save();
        ctx.translate(cx, cy);
        const angle = Math.PI + (progress * Math.PI);
        ctx.rotate(angle);
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(radius - 20, 0); ctx.lineTo(0, 5); ctx.fill();
        ctx.restore();

        // Speed Text
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = "#fff"; ctx.font = "bold 42px system-ui";
        ctx.fillText(st.visualSpeed.toFixed(1), cx, cy - 20);
        ctx.font = "14px system-ui"; ctx.fillStyle = "#888";
        ctx.fillText("Mbps", cx, cy + 15);

        // Stats
        const statY = cy + 60;
        ctx.font = "14px monospace";
        ctx.fillStyle = "#aaa";
        ctx.fillText(`PING: ${st.ping} ms`, cx - 100, statY);
        ctx.fillText(`JITTER: ${st.jitter} ms`, cx + 100, statY);

        if (st.phase !== 'ping' && st.phase !== 'idle') {
            ctx.fillText(`DL: ${st.finalDownload ? st.finalDownload.toFixed(1) : st.visualSpeed.toFixed(1)}`, cx - 50, statY + 30);
            ctx.fillText(`UL: ${st.finalUpload ? st.finalUpload.toFixed(1) : (st.phase==='upload'?st.visualSpeed.toFixed(1):'--')}`, cx + 50, statY + 30);
        }

        // Button
        if (!st.running) {
            const btnSize = 140; const btnH = 40;
            const bx = cx - btnSize/2; const by = statY + 60;
            ctx.fillStyle = "#4db4ff";
            ctx.beginPath(); ctx.roundRect(bx, by, btnSize, btnH, 20); ctx.fill();

            ctx.fillStyle = "#fff"; ctx.font = "bold 16px system-ui";
            ctx.fillText(st.phase === 'done' ? "TEST AGAIN" : "START TEST", cx, by + btnH/2);

            // Store hit region relative to content scroll
            this.speedTestBtn = { x: 20 + bx, y: contentTop + 40 + by, w: btnSize, h: btnH };
        } else {
            this.speedTestBtn = null;
            ctx.fillStyle = "#4db4ff"; ctx.font = "14px system-ui";
            ctx.fillText(`Testing ${st.phase.toUpperCase()}...`, cx, statY + 80);
        }

        ctx.restore();
        this.contentHeight = 600;
    }

    renderBrowserChrome(ctx, rect, tab, tabH, navH, statusH, contentTop, colors) {
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