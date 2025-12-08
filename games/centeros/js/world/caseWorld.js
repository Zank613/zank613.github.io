import { state, TIME_CONFIG } from "../state.js";
import {
    NAME_POOL,
    SURNAME_POOL,
    EYE_COLOR_POOL,
    HAIR_COLOR_POOL,
    COMPLAINT_TEMPLATES,
    EVIDENCE_SNIPPETS
} from "./caseData.js";

import { generateSiteWorld } from "./siteGenerator.js";

// small helpers

function randChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomHeightCm() {
    return randInt(155, 195);
}

function randomWeightKg() {
    return randInt(50, 110);
}

function randomAgeYears() {
    return randInt(18, 70);
}

function randomFingerprintHex() {
    const chars = "0123456789ABCDEF";
    let out = "";
    for (let i = 0; i < 14; i++) {
        out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
}

function randomIMEI() {
    let out = "";
    for (let i = 0; i < 15; i++) {
        out += randInt(0, 9).toString();
    }
    return out;
}

function randomPhoneNumber() {
    return "+3538" + randInt(3, 9) + randInt(1000000, 9999999).toString();
}

// citizens

function generateCitizen(id) {
    const height = randomHeightCm();
    const weight = randomWeightKg();
    const age = randomAgeYears();

    const name = randChoice(NAME_POOL);
    const surname = randChoice(SURNAME_POOL);

    return {
        id,
        name,
        surname,
        physical: {
            height_cm: height,
            weight_kg: weight,
            eye_color: randChoice(EYE_COLOR_POOL),
            hair_color: randChoice(HAIR_COLOR_POOL),
            age
        },
        ids: {
            national_id: "ID-" + randInt(100000, 999999),
            passport_no: "P" + randInt(1000000, 9999999),
            fingerprint_hex: randomFingerprintHex()
        },
        devices: [
            {
                label: "Personal phone",
                imei: randomIMEI(),
                phone_number: randomPhoneNumber()
            }
        ],
        police_records: [],
        digital: {
            texts: [],
            emails: [],
            apps: []
        },
        relationships: [],
        isLinkedToCase: false,
        case_relevance: "none"
    };
}

// evidence

function tagsIntersect(a, b) {
    return a.some(tag => b.includes(tag));
}

function createRelationship(c1, c2, type) {
    c1.relationships.push({ targetId: c2.id, name: `${c2.name} ${c2.surname}`, type });
    c2.relationships.push({ targetId: c1.id, name: `${c1.name} ${c1.surname}`, type });
}

function attachEvidenceToCitizen(citizen, complaintTemplate, citizensList) {
    const tags = complaintTemplate.evidence_tags || [];

    // Get Relevant Evidence
    const texts = EVIDENCE_SNIPPETS.texts.filter(s => tagsIntersect(s.tags, tags));
    const emails = EVIDENCE_SNIPPETS.emails.filter(s => tagsIntersect(s.tags, tags));
    const police = EVIDENCE_SNIPPETS.police_records.filter(s => tagsIntersect(s.tags, tags));

    // Get Noise Evidence (Benign)
    const noiseTexts = EVIDENCE_SNIPPETS.texts.filter(s => s.tags.includes("noise"));
    const noiseEmails = EVIDENCE_SNIPPETS.emails.filter(s => s.tags.includes("noise"));

    function pickSome(arr, maxCount) {
        const out = [];
        const pool = [...arr];
        const count = Math.min(maxCount, pool.length);
        for (let i = 0; i < count; i++) {
            const idx = randInt(0, pool.length - 1);
            out.push(pool[idx]);
            pool.splice(idx, 1);
        }
        return out;
    }

    // 30% chance to plant text evidence on a partner/associate instead of the suspect
    let targetForTexts = citizen;
    if (citizen.relationships.length > 0 && Math.random() < 0.3) {
        const rel = citizen.relationships[0];
        const partner = citizensList.find(c => c.id === rel.targetId);
        if (partner) targetForTexts = partner;
    }

    // Add Incriminating Texts
    const incrimTexts = pickSome(texts, 2).map(s => ({ id: s.id, content: s.template, type: "suspicious" }));
    targetForTexts.digital.texts.push(...incrimTexts);

    // Add Incriminating Emails (Always on suspect for now)
    const incrimEmails = pickSome(emails, 2).map(s => ({ id: s.id, subject: s.subject, content: s.template, type: "suspicious" }));
    citizen.digital.emails.push(...incrimEmails);

    // Add Police Records
    citizen.police_records = pickSome(police, 1).map(s => ({ id: s.id, note: s.template }));

    // Add boring stuff so not every text is a crime confession
    const fillNoise = (person) => {
        const nTexts = pickSome(noiseTexts, randInt(1, 3)).map(s => ({ id: s.id, content: s.template, type: "normal" }));
        const nEmails = pickSome(noiseEmails, randInt(1, 2)).map(s => ({ id: s.id, subject: s.subject, content: s.template, type: "normal" }));
        person.digital.texts.push(...nTexts);
        person.digital.emails.push(...nEmails);

        // Shuffle arrays so suspicious stuff isn't always at top/bottom
        person.digital.texts.sort(() => Math.random() - 0.5);
        person.digital.emails.sort(() => Math.random() - 0.5);
    };

    fillNoise(citizen);
    if(targetForTexts !== citizen) fillNoise(targetForTexts);

    // Apps logic
    const apps = [];
    if (tags.includes("money")) apps.push({ name: "ShadowPay", note: "Peer-to-peer payments." });
    if (tags.includes("location_history")) apps.push({ name: "TrackLog", note: "Location logging utility." });
    if (tags.includes("noise")) apps.push({ name: "PartyChat", note: "Group chat for parties." });
    citizen.digital.apps = apps;
}

// report obfuscation

function buildReportFromCitizen(citizen, complaintTemplate) {
    const phys = citizen.physical;

    const heightSpread = randInt(4, 8);
    const heightMin = phys.height_cm - heightSpread;
    const heightMax = phys.height_cm + heightSpread;

    const ageSpread = randInt(3, 6);
    const ageMin = phys.age - ageSpread;
    const ageMax = phys.age + ageSpread;

    const includeWeight = Math.random() < 0.7;
    const includeHair = Math.random() < 0.5;

    let weightField;
    if (includeWeight) {
        const weightSpread = randInt(5, 10);
        const wMin = phys.weight_kg - weightSpread;
        const wMax = phys.weight_kg + weightSpread;
        weightField = {
            known: true,
            kind: "estimate",
            value_kg_min: wMin,
            value_kg_max: wMax,
            text: `Approx. ${wMin}-${wMax} kg`
        };
    } else {
        weightField = {
            known: false,
            kind: "missing",
            value_kg_min: null,
            value_kg_max: null,
            text: null
        };
    }

    const hairField = includeHair
        ? {
            known: true,
            kind: "exact",
            value: phys.hair_color,
            text: phys.hair_color[0].toUpperCase() + phys.hair_color.slice(1)
        }
        : {
            known: false,
            kind: "missing",
            value: null,
            text: null
        };

    return {
        complaint_title: complaintTemplate.title,
        complaint_text: complaintTemplate.base_text,
        fields: {
            name: {
                known: false,
                kind: "missing",
                value: null,
                text: null
            },
            surname: {
                known: false,
                kind: "missing",
                value: null,
                text: null
            },
            height: {
                known: true,
                kind: "estimate",
                value_cm_min: heightMin,
                value_cm_max: heightMax,
                text: `Estimated ${heightMin}-${heightMax} cm`
            },
            weight: weightField,
            eye_color: {
                known: true,
                kind: "exact",
                value: phys.eye_color,
                text: phys.eye_color[0].toUpperCase() + phys.eye_color.slice(1)
            },
            hair_color: hairField,
            age: {
                known: true,
                kind: "estimate",
                value_years_min: ageMin,
                value_years_max: ageMax,
                text: `Estimated ${ageMin}-${ageMax} years`
            }
        }
    };
}

// police roster

function generatePoliceRoster(day) {
    const officers = [];
    const names = [
        "Aoife Kearney",
        "Liam Murphy",
        "Sean Doyle",
        "Niamh Byrne",
        "Patrick Walsh",
        "Ciara O'Malley"
    ];

    const NIGHT = TIME_CONFIG.NIGHT_MINUTES;

    const count = 3; // 3 officers per night for now
    for (let i = 0; i < count; i++) {
        const id = `COP_${day}_${i + 1}`;
        const name = names[i % names.length];

        const start = randInt(0, NIGHT - 180);
        const length = randInt(180, 300);      // 3-5 hours
        const end = Math.min(NIGHT, start + length);

        officers.push({
            id,
            name,
            wifiSsid: `CENTPOL-${100 + i}`,
            dutyStartMin: start,
            dutyEndMin: end
        });
    }

    return officers;
}

export function getOfficerById(policeId) {
    return (state.world.policeOfficers || []).find(o => o.id === policeId) || null;
}

// top-level world generator

export function generateTonightWorld(day) {
    const citizenCount = 12; // Increased from 8
    const citizens = [];
    for (let i = 0; i < citizenCount; i++) { citizens.push(generateCitizen("citizen_" + i)); }

    // Randomly link some citizens
    for (let i = 0; i < citizens.length; i++) {
        if (citizens[i].relationships.length > 0) continue;

        // 40% chance to have a partner/associate
        if (Math.random() < 0.4) {
            // Find another single person
            const partner = citizens.find((c, idx) => idx !== i && c.relationships.length === 0);
            if (partner) {
                const type = randChoice(["Spouse", "Sibling", "Roommate", "Associate"]);
                createRelationship(citizens[i], partner, type);
            }
        }
    }

    const complaintTemplate = randChoice(COMPLAINT_TEMPLATES);
    const targetIndex = randInt(0, citizens.length - 1);
    const targetCitizen = citizens[targetIndex];
    targetCitizen.isLinkedToCase = true;
    targetCitizen.case_relevance = "main";

    // Pass full citizens list so we can find partners
    attachEvidenceToCitizen(targetCitizen, complaintTemplate, citizens);

    const report = buildReportFromCitizen(targetCitizen, complaintTemplate);

    state.world.citizens = citizens;
    state.world.selectedCitizenId = null;
    state.world.selectedImei = null;
    state.world.policeOfficers = generatePoliceRoster(day);
    state.security.activePoliceCode = null;

    state.world.case = {
        id: `day_${day}_main_case`,
        day,
        complaintTemplateId: complaintTemplate.id,
        targetCitizenId: targetCitizen.id,
        truth: {
            is_criminal: complaintTemplate.default_is_criminal,
            threat_level: complaintTemplate.default_threat
        },
        report,
        evidence: [],
        verdict: {
            action: null,
            threat: null,
            evaluated: false,
            score: 0,
            summary: "",
            reason: null
        }
    };

    generateSiteWorld(day, citizens, state.world.case);
}

// verdict evaluation

function threatDistance(a, b) {
    const order = ["low", "medium", "high"];
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia === -1 || ib === -1) return 2;
    return Math.abs(ia - ib);
}

export function evaluateCaseVerdict(action, threat, reason = "submit") {
    const wc = state.world.case;
    if (!wc) return null;

    if (wc.verdict && wc.verdict.evaluated) {
        return wc.verdict;
    }

    const truth = wc.truth;
    let score = 0;
    let summary = "";

    if (!action || !threat) {
        summary = "No clear verdict submitted before the end of the night. Superiors are not impressed.";
        score -= 3;
        state.policeHeat += 6;
        state.reputation.police -= 5;
    } else {
        const truthCriminal = truth.is_criminal;
        const truthThreat = truth.threat_level;

        if (truthCriminal) {
            if (action === "flag") {
                score += 3;
                summary += "You correctly treated this as a serious criminal case. ";
            } else if (action === "monitor") {
                score += 1;
                summary += "You chose to monitor a genuinely dangerous subject. Cautious, but not decisive. ";
            } else if (action === "ignore") {
                score -= 3;
                summary += "You ignored a real criminal threat. ";
            }
        } else {
            if (action === "ignore") {
                score += 3;
                summary += "You correctly dismissed a non-criminal situation. ";
            } else if (action === "monitor") {
                score += 1;
                summary += "You stayed cautious about a mostly harmless situation. Slightly paranoid, but acceptable. ";
            } else if (action === "flag") {
                score -= 3;
                summary += "You escalated a non-criminal case. Overreaction. ";
            }
        }

        const dist = threatDistance(threat, truthThreat);
        if (dist === 0) {
            score += 2;
            summary += "Your threat level assessment was spot on. ";
        } else if (dist === 1) {
            summary += "Your threat level assessment was roughly in the right ballpark. ";
        } else {
            score -= 1;
            summary += "Your threat level estimate was far from reality. ";
        }

        if (score >= 4) {
            summary += "Overall: excellent assessment.";
            state.eightcoin += 4;
            state.policeHeat = Math.max(0, state.policeHeat - 6);
        } else if (score >= 2) {
            summary += "Overall: solid work.";
            state.eightcoin += 2;
            state.policeHeat = Math.max(0, state.policeHeat - 5);

            state.reputation.police += 5;
            state.reputation.underworld -= 2;
        } else if (score >= 0) {
            summary += "Overall: mixed, committee is unconvinced.";
            state.policeHeat += 2;
        } else if (score >= -3) {
            summary += "Overall: poor judgement.";
            state.policeHeat += 5;
            state.reputation.police -= 2;
        } else {
            summary += "Overall: disastrous judgement.";
            state.policeHeat += 10;
            state.reputation.police -= 3;
        }

        state.caseStats.totalDecided += 1;

        const correctCriminalCall = truth.is_criminal
            ? (action === "flag" || action === "monitor")
            : (action === "ignore" || action === "monitor");

        if (correctCriminalCall) {
            state.caseStats.correctCriminalCalls += 1;
        }
        state.caseStats.lastVerdictSummary = summary;
    }

    wc.verdict = {
        action: action || null,
        threat: threat || null,
        evaluated: true,
        score,
        summary,
        reason
    };

    return wc.verdict;
}