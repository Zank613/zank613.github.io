import { state } from "../state.js";
import { FLAVOR_POSTS_PFT, CONSPIRACIES, ANON_REPLIES, STOCK_NAMES, LIFELOG_POSTS, LIFELOG_SUSPICIOUS } from "./caseData.js";

const RAW_SITE_SCHEMAS = {
    "pleasefindthem.com": `{ "maxPublicPosts": 5, "rewardRange": [2, 8] }`,
    "darkesttrench.w3": `{ "defaultUnlocked": ["aroundrouter", "corevpn", "trespasser"] }`
};

function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const CRIMINAL_TYPES = ["Data Broker", "Organ Harvester", "Hitman", "Identity Thief", "Cyber-Armorer"];
const ORGANIZATIONS = ["The Red Code", "Null-Day Collective", "The Silent ones", "Echo Logistics"];
const MARKETS = ["SilkBlade", "Zero-Day Bazaar", "Flesh & Circuit", "The Archive"];

function generateDarkWikiEntries(count) {
    const entries = [];
    for (let i = 0; i < count; i++) {
        const type = Math.random() > 0.6 ? "org" : (Math.random() > 0.5 ? "market" : "criminal");
        let title, summary;
        if (type === "criminal") {
            title = `${randomChoice(CRIMINAL_TYPES)}: "${randomChoice(['Viper', 'Ghost', 'Zero', 'Wraith', 'X'])}"`;
            summary = "Wanted in 12 sectors. Known for bypassing Tier-3 encryption.";
        } else if (type === "org") {
            title = randomChoice(ORGANIZATIONS);
            summary = "A decentralized paramilitary group operating beneath the mesh.";
        } else {
            title = randomChoice(MARKETS);
            summary = "Marketplace for illicit biomechanics and stolen auth-tokens.";
        }
        entries.push({ type: "wiki", title: title, content: summary, dangerLevel: randomInt(1, 5) });
    }
    return entries;
}

function generateTimeSensitiveEntry(timeMinutes) {
    if (timeMinutes > 180) return null;
    return { title: "The Shard", content: "Active exploit trade.", dangerLevel: 5 };
}

function generateNewsHeadlines(day, heat, coins) {
    const headlines = [];
    if (heat > 80) headlines.push({ title: "CITYWIDE CRACKDOWN", content: "Police forces have initiated a sector-wide sweep." });
    else if (heat > 40) headlines.push({ title: "Increased Patrols", content: "Residents report increased drone activity." });
    else headlines.push({ title: "Quiet Night Expected", content: "City officials report a drop in cyber-crime." });

    const cryptoChange = randomInt(-15, 15);
    headlines.push({ title: `Eightcoin ${cryptoChange > 0 ? "Surges" : "Crashes"}`, content: `Trading volume ${cryptoChange > 0 ? "spiked" : "dropped"} by ${Math.abs(cryptoChange)}%.` });
    return headlines;
}

function generateAnonBoard() {
    const threads = [];
    const count = randomInt(3, 5);
    for(let i=0; i<count; i++) {
        const topic = randomChoice(CONSPIRACIES);
        const replies = [];
        const replyCount = randomInt(1, 4);
        for(let j=0; j<replyCount; j++) {
            replies.push({
                user: "Anonymous",
                id: Math.floor(Math.random() * 999999),
                text: randomChoice(ANON_REPLIES)
            });
        }
        threads.push({
            title: topic.title,
            author: topic.author,
            content: topic.content,
            replies: replies
        });
    }
    return threads;
}

function generateMarketWatch(day) {
    const stocks = [];
    STOCK_NAMES.forEach(s => {
        const basePrice = (s.n.length * 10) + (day * 2); // Pseudo-random base
        const fluctuation = randomInt(-10, 10);
        const currentPrice = Math.max(1, basePrice + fluctuation);
        stocks.push({
            symbol: s.s,
            name: s.n,
            price: currentPrice.toFixed(2),
            change: fluctuation
        });
    });
    // Add Eightcoin
    stocks.unshift({
        symbol: "E€E",
        name: "Eightcoin",
        price: (120 + randomInt(-30, 30)).toFixed(2),
        change: randomInt(-15, 15)
    });
    return stocks;
}

// LifeLog Generator
function generateLifeLog(citizens) {
    const profiles = [];
    const feed = [];

    citizens.forEach(c => {
        // Create Username
        const username = (c.name.charAt(0) + c.surname).toLowerCase() + randomInt(1, 99);

        // Assign some posts
        const posts = [];
        const postCount = randomInt(1, 4);

        // If criminal, maybe add suspicious post
        if (c.case_relevance === "main" && Math.random() < 0.4) {
            posts.push({ text: randomChoice(LIFELOG_SUSPICIOUS), time: "2h ago" });
        }

        for(let i=0; i<postCount; i++) {
            posts.push({ text: randomChoice(LIFELOG_POSTS), time: `${randomInt(3, 12)}h ago` });
        }

        const profile = {
            id: c.id,
            name: `${c.name} ${c.surname}`,
            username: "@" + username,
            bio: "Just living the dream in Center City.",
            posts: posts
        };
        profiles.push(profile);

        // Add to global feed
        posts.forEach(p => {
            feed.push({ username: profile.username, text: p.text, time: p.time, userId: c.id });
        });
    });

    // Shuffle feed
    feed.sort(() => Math.random() - 0.5);
    return { profiles, feed };
}

// GovServices Generator
function generateGovServices(heat) {
    const finePerHeat = 2; // 2 E€E per 1 Heat point
    const totalFine = Math.floor(heat * finePerHeat);

    let status = "GOOD_STANDING";
    if (heat > 20) status = "WATCH_LIST";
    if (heat > 50) status = "SUSPECT_PROFILE";
    if (heat > 80) status = "FUGITIVE_WARRANT";

    return {
        status,
        fineAmount: totalFine,
        heat: Math.floor(heat)
    };
}

export function generateSiteWorld(day, citizens, worldCase) {
    const sites = {};

    // 1. PleaseFindThem
    {
        const host = "pleasefindthem.com";
        const posts = [];
        if (worldCase && worldCase.targetCitizenId) {
            posts.push({ id: `pft_case_${worldCase.id}`, title: "URGENT: MISSING", author: "User99", citizenId: worldCase.targetCitizenId, reward: 15, content: "Help needed.", isMain: true });
        }
        const pool = citizens.filter(c => !worldCase || c.id !== worldCase.targetCitizenId);
        const decoyCount = Math.min(pool.length, 3);
        for (let i = 0; i < decoyCount; i++) {
            const c = pool[i];
            posts.push({ id: `pft_side_${c.id}`, title: `Have you seen ${c.name}?`, author: `User_${randomInt(100,999)}`, citizenId: c.id, reward: randomInt(2, 5), content: "Disappeared recently.", isMain: false });
        }
        const flavorCount = randomInt(1, 2);
        for(let i=0; i<flavorCount; i++) {
            const f = randomChoice(FLAVOR_POSTS_PFT);
            posts.push({ id: `pft_flavor_${i}`, title: f.title, author: f.author, citizenId: null, reward: 0, content: f.content, isMain: false, isFlavor: true });
        }
        sites[host] = { host, day, posts };
    }

    // 2. DarkestTrench
    {
        const host = "darkesttrench.w3";
        const entries = generateDarkWikiEntries(3);
        const timeEntry = generateTimeSensitiveEntry(state.time.minutes);
        if (timeEntry) entries.unshift(timeEntry);
        sites[host] = { host, day, entries };
    }

    // 3. City Pulse
    {
        const host = "thecitypulse.w3";
        const headlines = generateNewsHeadlines(day, state.policeHeat, state.eightcoin);
        sites[host] = { host, day, headlines };
    }

    // 4. AnonBoard
    {
        const host = "anonboard.net";
        const threads = generateAnonBoard();
        sites[host] = { host, day, threads };
    }

    // 5. MarketWatch
    {
        const host = "marketwatch.w3";
        const stocks = generateMarketWatch(day);
        sites[host] = { host, day, stocks };
    }

    // 6. LifeLog
    {
        const host = "lifelog.net";
        const data = generateLifeLog(citizens);
        sites[host] = { host, day, profiles: data.profiles, feed: data.feed };
    }

    // 7. GovServices
    {
        const host = "govservices.center";
        const data = generateGovServices(state.policeHeat);
        sites[host] = { host, day, status: data.status, fine: data.fineAmount, heat: data.heat };
    }

    state.world.sites = sites;
}