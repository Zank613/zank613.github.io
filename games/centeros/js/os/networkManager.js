import {fs} from "./fileSystem.js";

function randomPassword(length = 10) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let pw = "";
    for (let i = 0; i < length; i++) {
        pw += chars[Math.floor(Math.random() * chars.length)];
    }
    return pw;
}

function randomHexAddress(bytes = 6) {
    const chars = "0123456789ABCDEF";
    let out = "";
    for (let i = 0; i < bytes * 2; i++) {
        out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
}

// Config for network types
const NETWORK_TYPES = [
    { name: "CoffeeShop_Guest", baseSpeed: 5, range: 10 },    // Slow (5-15 Mbps)
    { name: "MomLaptop_5G", baseSpeed: 20, range: 30 },       // Decent (20-50 Mbps)
    { name: "PrettyFlyForAWifi", baseSpeed: 40, range: 60 },  // Good (40-100 Mbps)
    { name: "FBI_Surveillance_Van", baseSpeed: 100, range: 200 }, // Fast
    { name: "CenterOS_Mainframe", baseSpeed: 500, range: 500 },   // Ultra Fast (Fiber)
    { name: "dont_join", baseSpeed: 1, range: 5 },            // Trash
    { name: "hackers_wifi", baseSpeed: 50, range: 50 },
    { name: "404_Network_Not_Found", baseSpeed: 10, range: 20 },
    { name: "LAN_of_the_Dead", baseSpeed: 15, range: 15 }
];

class NetworkManager {
    constructor() {
        // Generate Networks
        this.networks = NETWORK_TYPES.map((type, index) => {
            const wpa = 1 + Math.floor(Math.random() * 3); // 1..3
            // Randomized max capability of this router
            const maxSpeedMbps = type.baseSpeed + Math.floor(Math.random() * type.range);

            return {
                id: "wifi" + index,
                ssid: type.name,
                password: randomPassword(8 + Math.floor(Math.random() * 4)),
                // Signal strength 1 (Weak) to 3 (Strong)
                strength: 1 + Math.floor(Math.random() * 3),
                address: randomHexAddress(6),
                wpa,
                maxSpeedMbps, // The theoretical max speed of the router
                frequency: Math.random() > 0.5 ? "5GHz" : "2.4GHz"
            };
        }).sort(() => Math.random() - 0.5);

        // Ensure starting network is accessible
        if (this.networks[0]) {
            this.networks[0].wpa = 1;
        }

        this.connectedId = this.networks[0]?.id ?? null;
        this.menuOpen = false;

        this.known = new Set();
        if (this.connectedId) {
            this.known.add(this.connectedId);
        }
    }

    injectNetworks(newNetworks) {
        for (const net of newNetworks) {
            if (!this.networks.find(n => n.ssid === net.ssid)) {
                net.id = "net_" + net.ssid;
                net.password = net.password || "blue" + Math.floor(Math.random() * 9999);
                net.address = net.address || randomHexAddress(6);
                net.maxSpeedMbps = net.maxSpeedMbps || 50;
                net.frequency = "5GHz";
                this.networks.push(net);
            }
        }
    }

    // Helper to check driver
    hasDriver() {
        const drivers = fs.sys.find("drivers");
        return drivers && drivers.find("network.sys");
    }

    // --- CONNECTION LOGIC ---

    isKnown(id) { return this.known.has(id); }
    markKnown(id) { this.known.add(id); }
    getNetworkById(id) { return this.networks.find(n => n.id === id) || null; }
    getNetworkBySsid(ssid) { return this.networks.find(n => n.ssid.toLowerCase() === ssid.toLowerCase()) || null; }
    getNetworkByAddress(hex) { return this.networks.find(n => n.address === hex.toUpperCase().replace(/^0X/, "")) || null; }

    connect(id) {
        if (!this.hasDriver()) return false;
        const net = this.getNetworkById(id);
        if (!net) return false;
        if (!this.isKnown(id)) return false;
        this.connectedId = id;
        return true;
    }

    getConnectedNetwork() {
        if (!this.hasDriver()) return null; // Hardware failure simulation
        return this.getNetworkById(this.connectedId);
    }

    // --- PHYSICS SIMULATION ---

    /**
     * Returns the current download speed in Bytes per Second.
     * Takes signal strength and interference into account.
     */
    getCurrentDownloadSpeed() {
        const net = this.getConnectedNetwork();
        if (!net) return 0;

        // Signal factor: 1 bar = 10%, 2 bars = 50%, 3 bars = 95-100%
        let signalFactor = 0.1;
        if (net.strength === 2) signalFactor = 0.5;
        if (net.strength === 3) signalFactor = 0.95;

        // Add some random jitter (flux)
        const jitter = 0.9 + Math.random() * 0.2;

        // Calculate Mbps
        const effectiveMbps = net.maxSpeedMbps * signalFactor * jitter;

        // Convert to Bytes per Second (1 Byte = 8 bits)
        // Mbps -> Bytes/s:  (Mbps * 1,000,000) / 8
        return (effectiveMbps * 1000000) / 8;
    }

    /**
     * Formats bytes into readable string
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    /**
     * Returns formatted speed string (e.g., "4.5 MB/s")
     */
    getFormattedSpeed() {
        const bps = this.getCurrentDownloadSpeed();
        return this.formatBytes(bps) + "/s";
    }
}

export const networkManager = new NetworkManager();