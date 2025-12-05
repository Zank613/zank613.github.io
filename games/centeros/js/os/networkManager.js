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

const WIFI_NAMES = [
    "hackers_wifi",
    "dont_join",
    "PrettyFlyForAWifi",
    "FBI_Surveillance_Van",
    "LAN_of_the_Dead",
    "CenterOS_Mainframe",
    "eightcoin_miner_node",
    "MomLaptop_5G",
    "404_Network_Not_Found",
    "CoffeeShop_Guest"
];

class NetworkManager {
    constructor() {
        const shuffled = [...WIFI_NAMES].sort(() => Math.random() - 0.5);

        this.networks = shuffled.map((name, index) => {
            const wpa = 1 + Math.floor(Math.random() * 3); // 1..3
            return {
                id: "wifi" + index,
                ssid: name,
                password: randomPassword(8 + Math.floor(Math.random() * 4)),
                strength: 1 + Math.floor(Math.random() * 3), // 1..3 bars
                address: randomHexAddress(6),
                wpa
            };
        });

        // Starting network: WPA1 and already known
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
            // Avoid duplicates
            if (!this.networks.find(n => n.ssid === net.ssid)) {
                // Fill in details if missing
                net.id = "net_" + net.ssid;
                net.password = net.password || "blue" + Math.floor(Math.random() * 9999);
                net.address = net.address || "0000AA" + Math.floor(Math.random() * 999999).toString(16).toUpperCase();

                this.networks.push(net);
            }
        }
    }

    toggleMenu() {
        this.menuOpen = !this.menuOpen;
    }

    closeMenu() {
        this.menuOpen = false;
    }

    isKnown(id) {
        return this.known.has(id);
    }

    markKnown(id) {
        this.known.add(id);
    }

    getNetworkById(id) {
        return this.networks.find(n => n.id === id) || null;
    }

    getNetworkBySsid(ssid) {
        const lower = ssid.toLowerCase();
        return this.networks.find(n => n.ssid.toLowerCase() === lower) || null;
    }

    getNetworkByAddress(hexCode) {
        const normalized = hexCode.toUpperCase().replace(/^0X/, "");
        return this.networks.find(n => n.address === normalized) || null;
    }

    connect(id) {
        const net = this.getNetworkById(id);
        if (!net) return false;

        if (!this.isKnown(id)) {
            return false;
        }

        this.connectedId = id;
        this.menuOpen = false;
        return true;
    }

    getConnectedNetwork() {
        return this.getNetworkById(this.connectedId);
    }
}

export const networkManager = new NetworkManager();