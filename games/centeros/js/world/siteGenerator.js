// centeros/js/world/siteGenerator.js

import { state } from "../state.js";

const RAW_SITE_SCHEMAS = {
    "pleasefindthem.com": `{ "maxPublicPosts": 5, "rewardRange": [2, 8] }`,
    "darkesttrench.w3": `{ "defaultUnlocked": ["aroundrouter", "corevpn", "trespasser"] }`
};

const CRIMINAL_TYPES = ["Data Broker", "Organ Harvester", "Hitman", "Identity Thief", "Cyber-Armorer"];
const ORGANIZATIONS = ["The Red Code", "Null-Day Collective", "The Silent ones", "Echo Logistics"];
const MARKETS = ["SilkBlade", "Zero-Day Bazaar", "Flesh & Circuit", "The Archive"];

function getSiteSchema(host) {
    try { return JSON.parse(RAW_SITE_SCHEMAS[host] || "{}"); }
    catch (e) { return {}; }
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateDarkWikiEntries(count) {
    const entries = [];
    for (let i = 0; i < count; i++) {
        const type = Math.random() > 0.6 ? "org" : (Math.random() > 0.5 ? "market" : "criminal");
        let title, summary;

        if (type === "criminal") {
            title = `${randomChoice(CRIMINAL_TYPES)}: "${randomChoice(['Viper', 'Ghost', 'Zero', 'Wraith', 'X'])}"`;
            summary = "Wanted in 12 sectors. Known for bypassing Tier-3 encryption and physical asset liquidation.";
        } else if (type === "org") {
            title = randomChoice(ORGANIZATIONS);
            summary = "A decentralized paramilitary group operating beneath the mesh. Do not engage.";
        } else {
            title = randomChoice(MARKETS);
            summary = "Marketplace for illicit biomechanics and stolen police auth-tokens. Escrow required.";
        }

        entries.push({
            type: "wiki",
            title: title,
            content: summary,
            dangerLevel: randomInt(1, 5)
        });
    }
    return entries;
}

function generateTimeSensitiveEntry(timeMinutes) {
    // Only available between 00:00 and 03:00 (0 to 180 minutes)
    if (timeMinutes > 180) return null;

    const entries = [
        { title: "The Shard", content: "A high-risk 0-day exploit for CenterOS Kernel LTS2007 is being exchanged now. Price is fluid.", dangerLevel: 5 },
        { title: "Red Room Access", content: "Active streams from Sector 7 are being broadcast. Unstable connection. Extreme risk.", dangerLevel: 6 },
        { title: "Unidentified Cult", content: "A new cell is recruiting. They speak in numbers. Check /data/docs/ to see if you match the profile.", dangerLevel: 4 }
    ];
    return randomChoice(entries);
}

function generateNewsHeadlines(day, heat, coins) {
    const headlines = [];

    // Headline based on Heat
    if (heat > 80) headlines.push({ title: "CITYWIDE CRACKDOWN", content: "Police forces have initiated a sector-wide sweep following massive digital disturbances. Checkpoints active." });
    else if (heat > 40) headlines.push({ title: "Increased Patrols", content: "Residents report increased drone activity in the lower districts." });
    else headlines.push({ title: "Quiet Night Expected", content: "City officials report a drop in cyber-crime statistics for the quarter." });

    // Headline based on Economy (Random)
    const cryptoChange = randomInt(-15, 15);
    headlines.push({ title: `Eightcoin ${cryptoChange > 0 ? "Surges" : "Crashes"}`, content: `E€E trading volume has ${cryptoChange > 0 ? "spiked" : "dropped"} by ${Math.abs(cryptoChange)}% overnight.` });

    // Flavor Headlines
    const flavor = [
        { t: "Weather Warning", c: "Acid rain advisory for Sector 4. Cover recommended." },
        { t: "Missing Drone", c: "Police looking for lost surveillance unit #449. Do not approach." },
        { t: "Network Maintenance", c: "CenterOS backbone updates scheduled for 04:00 AM." }
    ];
    headlines.push({ title: randomChoice(flavor).t, content: randomChoice(flavor).c });

    return headlines;
}

export function generateSiteWorld(day, citizens, worldCase) {
    const sites = {};

    // PleaseFindThem.com
    {
        const host = "pleasefindthem.com";
        const schema = getSiteSchema(host);
        const posts = [];

        // 1. The Main Case
        if (worldCase && worldCase.targetCitizenId) {
            const target = citizens.find(c => c.id === worldCase.targetCitizenId);
            if (target) {
                posts.push({
                    id: `pft_case_${worldCase.id}`,
                    title: `URGENT: ${target.name} ${target.surname} MISSING`,
                    author: "DesperateUser99",
                    citizenId: target.id,
                    reward: randomInt(10, 20), // High reward for main case
                    content: "Police won't help. Last seen near the industrial district. I will pay heavily for location data.",
                    isMain: true
                });
            }
        }

        // 2. Decoys / Side Jobs
        const pool = citizens.filter(c => !worldCase || c.id !== worldCase.targetCitizenId);
        const decoyCount = Math.min(pool.length, schema.maxPublicPosts || 3);

        for (let i = 0; i < decoyCount; i++) {
            const c = pool[i];
            posts.push({
                id: `pft_side_${c.id}`,
                title: `Have you seen ${c.name}?`,
                author: `User_${randomInt(1000, 9999)}`,
                citizenId: c.id,
                reward: randomInt(2, 5), // Low reward
                content: `Disappeared 2 days ago. Usually connects to ${c.devices[0]?.phone_number || "unknown networks"}.`,
                isMain: false
            });
        }

        sites[host] = { host, day, posts };
    }

    // DarkestTrench.w3
    {
        const host = "darkesttrench.w3";
        const entries = generateDarkWikiEntries(4); // Generate 4 random dark web articles

        // Add static tool unlocks
        const schema = getSiteSchema(host);
        const tools = schema.defaultUnlocked || [];
        tools.forEach(t => {
            entries.push({ type: "tool", id: t });
        });

        // Add time-sensitive entry
        const timeEntry = generateTimeSensitiveEntry(state.time.minutes);
        if (timeEntry) {
            entries.unshift({ type: "heading", level: 1, text: "LIVE BROADCAST ALERT" });
            entries.unshift(timeEntry);
        } else {
            entries.unshift({ type: "heading", level: 1, text: "Archives" });
        }


        sites[host] = { host, day, entries };
    }

    {
        const host = "thecitypulse.w3";
        const headlines = generateNewsHeadlines(day, state.policeHeat, state.eightcoin);
        sites[host] = { host, day, headlines };
    }

    state.world.sites = sites;
}