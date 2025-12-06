// centeros/js/world/siteGenerator.js

import { state } from "../state.js";

// "JSON" configs as strings, to keep generation synchronous.
const RAW_SITE_SCHEMAS = {
    "pleasefindthem.com": `{
        "maxPublicPosts": 4,
        "rewardRange": [2, 6],
        "includeDecoys": true
    }`,
    "darkesttrench.w3": `{
        "defaultUnlocked": [
            "aroundrouter",
            "corevpn",
            "trespasser",
            "eightcoin",
            "policenets"
        ]
    }`
};

function getSiteSchema(host) {
    const raw = RAW_SITE_SCHEMAS[host];
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch (err) {
        console.warn("Invalid site schema JSON for", host, err);
        return null;
    }
}

function randomInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}

/**
 * Generate per-site world state for the current night.
 * This plugs into state.world.sites and can be used by
 * websites/apps (PleaseFindThem, DarkestTrench, etc.)
 *
 * @param {number} day
 * @param {Array} citizens - from state.world.citizens
 * @param {Object} worldCase - from state.world.case
 */
export function generateSiteWorld(day, citizens, worldCase) {
    const sites = {};

    // === PleaseFindThem.com ===
    {
        const host = "pleasefindthem.com";
        const schema = getSiteSchema(host) || {};
        const maxPosts = schema.maxPublicPosts || 4;
        const rewardRange = schema.rewardRange || [2, 6];
        const includeDecoys = schema.includeDecoys !== false;

        const posts = [];

        if (worldCase && worldCase.targetCitizenId) {
            const target = citizens.find(c => c.id === worldCase.targetCitizenId);
            if (target) {
                const reward = randomInt(rewardRange[0], rewardRange[1]);

                posts.push({
                    id: `pft_case_${worldCase.id}`,
                    kind: "case-linked",
                    title: `Please find ${target.name || "this person"}`,
                    citizenId: target.id,
                    rewardE8: reward,
                    tags: ["official", "linked", "high-priority"],
                    summary: "Reported missing or at risk. Cross-check with main case report.",
                    day
                });
            }
        }

        if (includeDecoys) {
            const pool = citizens.filter(c => !worldCase || c.id !== worldCase.targetCitizenId);
            const decoyCount = Math.min(pool.length, Math.max(0, maxPosts - posts.length));
            for (let i = 0; i < decoyCount; i++) {
                const c = pool[i];
                posts.push({
                    id: `pft_decoy_${day}_${i}`,
                    kind: "decoy",
                    title: `Looking for ${c.name}`,
                    citizenId: c.id,
                    rewardE8: randomInt(1, 3),
                    tags: ["personal"],
                    summary: "Unverified personal request. No official complaint attached.",
                    day
                });
            }
        }

        sites[host] = {
            host,
            day,
            posts
        };
    }

    // === DarkestTrench.w3 ===
    {
        const host = "darkesttrench.w3";
        const schema = getSiteSchema(host) || {};
        const defaultUnlocked = schema.defaultUnlocked || [];

        const entries = defaultUnlocked.map(id => ({
            id,
            unlocked: true
        }));

        // Optionally unlock extra entries if heat is high or case is nasty
        const heat = state.policeHeat || 0;
        if (heat > 60 && worldCase) {
            entries.push({
                id: "incidents",
                unlocked: true,
                reason: "heat_spike"
            });
        }

        sites[host] = {
            host,
            day,
            entries
        };
    }

    state.world.sites = sites;
}