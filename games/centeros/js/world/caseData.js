// ==========================================
// CIVILIAN IDENTITY POOLS
// ==========================================

export const NAME_POOL = [
    "Mark", "Connor", "Jamal", "Luis", "Noah", "Callum", "Joseph", "Samuel",
    "Dmitri", "Viktor", "Takeshi", "Alejandro", "Marcus", "Elias", "Finn",
    "Arthur", "Ben", "Kieran", "Omar", "Zayn", "Hiro", "Felix", "Jasper",
    "Leon", "Diego", "Thiago", "Axel", "Roman", "Ivan", "Lukas",
    "Evelyn", "Anya", "Léa", "Sara", "Hannah", "Fatima", "Maria", "Sophie",
    "Chloe", "Mei", "Elena", "Isabella", "Zoe", "Nora", "Alice", "Luna",
    "Mila", "Freya", "Elara", "Yasmin", "Priya", "Keira", "Jade", "Ruby",
    "Ivy", "Aurora", "Clara", "Eva", "Sasha", "Nadia", "Sarah", "Jane", "Emily"
];

export const SURNAME_POOL = [
    "Levesque", "O'Riley", "Novak", "Yilmaz", "Petrov", "Kavanagh", "Nguyen",
    "Khan", "Schneider", "Martinez", "Hughes", "Byrne", "Sullivan", "Cohen",
    "Ali", "Tanaka", "Chen", "Kim", "Santos", "Silva", "Rossi", "Moreau",
    "Andersson", "Nielsen", "Kowalski", "Papadopoulos", "Ivanov", "Popov",
    "Sato", "Suzuki", "Wang", "Li", "Garcia", "Rodriguez", "Hernandez",
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis",
    "Wilson", "Taylor", "Anderson", "Thomas", "Moore", "Martin", "Jackson"
];

export const EYE_COLOR_POOL = [
    "dark brown", "chestnut", "hazel", "amber", "emerald green",
    "ice blue", "dark blue", "grey", "nearly black", "heterochromia (blue/brown)"
];

export const HAIR_COLOR_POOL = [
    "jet black", "dark brown", "chestnut", "dirty blonde", "platinum blonde",
    "auburn", "ginger", "grey", "white", "dyed blue", "dyed pink", "dyed green",
    "shaved", "balding", "dreadlocks"
];

export const LIFELOG_POSTS = [
    "Just saw the weirdest drone flying over Sector 7.",
    "Anyone else's internet slow today? CenterMesh is acting up.",
    "Finally got that promotion! Drinks on me tonight.",
    "Lost my keys again. If found please DM.",
    "The rain in this city never stops.",
    "Selling old AR goggles, barely used. 50 credits.",
    "My neighbor is so loud, I swear they are running a server farm.",
    "Just adopted a robo-dog. He bites.",
    "Why is coffee so expensive now?",
    "Feeling watched today. Need a vacation."
];

export const LIFELOG_SUSPICIOUS = [
    "Heading out. Don't wait up.",
    "Finally got the package.",
    "Delete this after reading.",
    "They are onto us.",
    "Big payday coming soon.",
    "Need a safe place to crash.",
    "Anyone know a good lawyer?"
];

// ==========================================
// PROCEDURAL WEB CONTENT POOLS
// ==========================================

export const FLAVOR_POSTS_PFT = [
    { title: "Lost Dog: 'Buster'", content: "Small terrier, missing left ear. Last seen near Sector 4 park. Reward: 1 E€E.", author: "DogLover99" },
    { title: "Found Keys", content: "Found a set of keys with a rabbit keychain on Main St. Turned them into the police station.", author: "GoodSamaritan" },
    { title: "Weird Noise in Sky?", content: "Did anyone else hear that humming sound last night around 3AM? It shook my windows.", author: "Insomniac_Dave" },
    { title: "Missed Connection: Blue Coat", content: "You were on the mag-lev, reading a book about mycology. I was too shy to say hi.", author: "LonelyHeart" },
    { title: "Selling: Old GPU", content: "GTX 1080 for sale. Good condition. Will trade for food stamps.", author: "Miner4Life" },
    { title: "PSA: Check your locks", content: "There's been a string of break-ins on 5th avenue. Stay safe everyone.", author: "NeighborhoodWatch" }
];

export const CONSPIRACIES = [
    { title: "The Birds Are Drones", content: "I caught one recharging on a power line. Open your eyes sheeple!", author: "TruthSeeker" },
    { title: "CenterOS Steals Dreams", content: "The new update accesses your neural patterns during REM sleep. Use a foil hat.", author: "Tinfoilhat" },
    { title: "The Moon is a Hologram", content: "It flickered last night. I saw the grid lines. NASA is lying.", author: "SpaceWatcher" },
    { title: "Water Turnin' Frogs Gay", content: "It's the chemicals they put in the water supply. I have proof.", author: "BioHacker" },
    { title: "The 8th Coin", content: "There is a secret 8th denomination of Eightcoin that controls the world economy.", author: "CryptoKing" }
];

export const ANON_REPLIES = [
    "Fake and gay.",
    "Big if true.",
    "OP is a fed.",
    "Source: trust me bro.",
    "I saw it too!",
    "Delete this.",
    "Based.",
    "Take your meds.",
    "Interesting theory...",
    "Bump."
];

export const STOCK_NAMES = [
    { s: "CNT", n: "Center Inc." },
    { s: "OMNI", n: "OmniCorp" },
    { s: "VOID", n: "VoidSystems" },
    { s: "BLUE", n: "BlueWater" },
    { s: "NANO", n: "NanoTech" },
    { s: "AERO", n: "AeroDynamics" },
    { s: "BIO", n: "BioGen" },
    { s: "CYB", n: "CyberDyne" }
];

// ==========================================
// CRIME TEMPLATES
// ==========================================

export const COMPLAINT_TEMPLATES = [
    // --- FINANCIAL / FRAUD ---
    {
        id: "atm_scam",
        category: "financial",
        title: "ATM Skimming Activity",
        base_text: "Multiple reports of a person loitering near ATMs late at night and interacting with card slots with specialized tools.",
        evidence_tags: ["money", "tech", "night_activity"],
        default_is_criminal: true,
        default_threat: "medium"
    },
    {
        id: "crypto_fraud",
        category: "financial",
        title: "Unregistered Crypto Exchange",
        base_text: "Subject suspected of running an offline P2P crypto exchange for laundering illicit funds.",
        evidence_tags: ["money", "tech", "crypto"],
        default_is_criminal: true,
        default_threat: "low"
    },
    {
        id: "charity_fraud",
        category: "financial",
        title: "Fake Charity Solicitation",
        base_text: "Individual going door-to-door aggressively demanding cash for a non-existent animal shelter.",
        evidence_tags: ["money", "deception"],
        default_is_criminal: true,
        default_threat: "low"
    },
    {
        id: "corp_leak",
        category: "financial",
        title: "Corporate Data Leak",
        base_text: "Anonymous tip suggests subject is selling proprietary schematics to overseas competitors.",
        evidence_tags: ["tech", "money", "work"],
        default_is_criminal: true,
        default_threat: "high"
    },

    // --- NUISANCE / PUBLIC ORDER ---
    {
        id: "noise_nuisance",
        category: "nuisance",
        title: "Repeated Noise Complaints",
        base_text: "Neighbours report loud music, shouting, and heavy bass vibrations several nights a week.",
        evidence_tags: ["alcohol", "noise", "late_night"],
        default_is_criminal: false,
        default_threat: "low"
    },
    {
        id: "public_intox",
        category: "nuisance",
        title: "Public Intoxication",
        base_text: "Subject found sleeping on park benches and harassing pedestrians while visibly drunk.",
        evidence_tags: ["alcohol", "public_disturbance"],
        default_is_criminal: false,
        default_threat: "low"
    },
    {
        id: "vandalism_graffiti",
        category: "nuisance",
        title: "Vandalism (Graffiti)",
        base_text: "Subject spotted spraying tags on private storefronts and subway station walls.",
        evidence_tags: ["paint", "night_activity", "vandalism"],
        default_is_criminal: true,
        default_threat: "low"
    },
    {
        id: "illegal_dumping",
        category: "nuisance",
        title: "Illegal Dumping",
        base_text: "Vehicle registered to subject seen dumping construction waste in a nature reserve.",
        evidence_tags: ["travel", "work"],
        default_is_criminal: true,
        default_threat: "low"
    },

    // --- PERSONAL SAFETY / VIOLENT ---
    {
        id: "stalking",
        category: "personal_safety",
        title: "Suspected Stalking",
        base_text: "Subject reportedly follows the same individual from workplace to home several times a week.",
        evidence_tags: ["obsession", "location_history", "photos"],
        default_is_criminal: true,
        default_threat: "high"
    },
    {
        id: "domestic_disturbance",
        category: "personal_safety",
        title: "Domestic Disturbance",
        base_text: "Neighbors reported sounds of struggle, breaking glass, and screaming from the residence.",
        evidence_tags: ["violence", "anger", "victim"],
        default_is_criminal: true,
        default_threat: "high"
    },
    {
        id: "bar_fight",
        category: "personal_safety",
        title: "Assault (Bar Fight)",
        base_text: "Subject involved in a physical altercation at a local pub. Victim hospitalized with facial injuries.",
        evidence_tags: ["violence", "alcohol", "injury"],
        default_is_criminal: true,
        default_threat: "medium"
    },
    {
        id: "hit_and_run",
        category: "personal_safety",
        title: "Hit and Run",
        base_text: "Vehicle matching subject's description struck a pedestrian and fled the scene. Front bumper damage likely.",
        evidence_tags: ["travel", "panic", "car"],
        default_is_criminal: true,
        default_threat: "high"
    },

    // --- NARCOTICS ---
    {
        id: "drug_dealing_street",
        category: "narcotics",
        title: "Street Level Distribution",
        base_text: "Subject observed making short, frequent hand-to-hand exchanges with vehicles in alleyways.",
        evidence_tags: ["drugs", "money", "phones"],
        default_is_criminal: true,
        default_threat: "medium"
    },
    {
        id: "grow_op",
        category: "narcotics",
        title: "Cultivation (Residential)",
        base_text: "High electricity usage and covered windows suggest a possible hydroponic grow operation.",
        evidence_tags: ["drugs", "tech", "utilities"],
        default_is_criminal: true,
        default_threat: "medium"
    },

    // --- CYBER / TECH ---
    {
        id: "wifi_hacking",
        category: "cyber",
        title: "Unauthorized Network Access",
        base_text: "Subject suspected of wardriving and breaching private residential Wi-Fi networks.",
        evidence_tags: ["tech", "hacking", "data"],
        default_is_criminal: true,
        default_threat: "medium"
    },
    {
        id: "drone_spy",
        category: "cyber",
        title: "Illegal Drone Surveillance",
        base_text: "Subject flying drones into high-rise apartment windows to record footage of residents.",
        evidence_tags: ["tech", "privacy", "video"],
        default_is_criminal: true,
        default_threat: "high"
    },
    {   id: "grand_theft_auto",
        category: "theft",
        title: "Grand Theft Auto",
        base_text: "High-end vehicle stolen from secure garage. Subject seen bypassing electronic locks.",
        evidence_tags: ["car", "tech", "money"],
        default_is_criminal: true,
        default_threat: "high"
    },
    {   id: "arson",
        category: "property",
        title: "Arson (Warehouse)",
        base_text: "Fire started in industrial district. Accelerants found at scene. Subject seen fleeing.",
        evidence_tags: ["fire", "panic", "night_activity"],
        default_is_criminal: true, default_threat: "high"
    },
    {   id: "kidnapping",
        category: "personal_safety",
        title: "Kidnapping",
        base_text: "Child missing from playground. Witnesses saw a struggle and a van speeding away.",
        evidence_tags: ["violence", "car", "victim"],
        default_is_criminal: true,
        default_threat: "high"
    }
];

// ==========================================
// EVIDENCE REPOSITORY
// ==========================================

export const EVIDENCE_SNIPPETS = {
    texts: [
        // MONEY / SCAMS
        { id: "tx_money_001", tags: ["money"], template: "Make sure you withdraw cash in small amounts, they don't track that as hard." },
        { id: "tx_money_002", tags: ["money", "night_activity"], template: "Meet me by the ATM after midnight, less cameras then." },
        { id: "tx_money_003", tags: ["money"], template: "Transfer didn't go through. Do not call the bank. Use the other app." },
        { id: "tx_crypto_001", tags: ["crypto", "money"], template: "Wallet address sent. 5k minimum. No clean coins." },

        // NOISE / PARTY
        { id: "tx_noise_001", tags: ["noise", "alcohol"], template: "Party again tonight, man. Neighbours can cope." },
        { id: "tx_noise_002", tags: ["noise"], template: "Bro turn the bass down, the landlord just texted me." },

        // STALKING / OBSESSION
        { id: "tx_obsession_001", tags: ["obsession"], template: "She left work at 18:12 today, same bus as yesterday." },
        { id: "tx_obsession_002", tags: ["obsession", "photos"], template: "I think he saw me. Did you get the pictures?" },
        { id: "tx_obsession_003", tags: ["obsession"], template: "Why won't you answer me? I know you're home. I see the light." },

        // DRUGS
        { id: "tx_drug_001", tags: ["drugs", "money"], template: "Got the package. Quality is low but it'll sell." },
        { id: "tx_drug_002", tags: ["drugs"], template: "Can I get a 20? Usual spot." },
        { id: "tx_drug_003", tags: ["drugs", "phones"], template: "Burn this sim card after you read this. New number tomorrow." },

        // VIOLENCE / PANIC
        { id: "tx_violence_001", tags: ["violence", "anger"], template: "If he shows his face here again, I'm putting him in the hospital." },
        { id: "tx_violence_002", tags: ["violence", "injury"], template: "My hand is messed up. Think I broke a knuckle on his jaw." },
        { id: "tx_panic_001", tags: ["panic", "car"], template: "I didn't stop. I couldn't stop. I think I hit something bad." },
        { id: "tx_panic_002", tags: ["panic", "travel"], template: "Pack a bag. We need to leave the city tonight." },

        // TECH / HACKING
        { id: "tx_tech_001", tags: ["hacking", "tech"], template: "Handshake captured. Cracking the hash now." },
        { id: "tx_tech_002", tags: ["tech", "privacy"], template: "The drone battery is dying, bring it back to the van." },

        // NOISE (BENIGN)
        { id: "tx_norm_001", tags: ["noise"], template: "Hey, are we still on for dinner at 7?" },
        { id: "tx_norm_002", tags: ["noise"], template: "Can you pick up milk on the way home?" },
        { id: "tx_norm_003", tags: ["noise"], template: "Lol did you see that video?" },
        { id: "tx_norm_004", tags: ["noise"], template: "Happy birthday! Hope you have a great one." },
        { id: "tx_norm_005", tags: ["noise"], template: "The meeting dragged on forever. Leaving now." }
    ],

    emails: [
        // TECH / SCAMS
        { id: "em_tech_001", tags: ["tech", "money"], subject: "NFC reader arrival", template: "The NFC device arrived today, be careful with where you install it." },
        { id: "em_scam_001", tags: ["deception", "money"], subject: "Script update", template: "Here is the new script for the charity drive. Focus on the guilt angle." },
        { id: "em_corp_001", tags: ["work", "tech"], subject: "Files attached", template: "Here are the blueprints. Do not open this on the company network. Wire the payment." },

        // STALKING
        { id: "em_obsession_001", tags: ["location_history"], subject: "Location data export", template: "Attached is the location timeline you requested for the last three weeks." },

        // DRUGS / DARK WEB
        { id: "em_drug_001", tags: ["drugs", "crypto"], subject: "Order #4492 Shipped", template: "Your package has been disguised as gardening supplies. Tracking ID attached." },

        // CORPORATE / WORK
        { id: "em_work_001", tags: ["money"], subject: "Overdue Invoice", template: "Final warning regarding the outstanding debt. Legal action will follow." },
        { id: "em_violence_001", tags: ["violence", "anger"], subject: "Stay away", template: "I am filing a restraining order. Stop contacting my family." },

        // NOISE (BENIGN)
        { id: "em_norm_001", tags: ["noise"], subject: "Utility Bill", template: "Your electricity bill for October is available to view." },
        { id: "em_norm_002", tags: ["noise"], subject: "Subscription", template: "Thank you for subscribing to CatFacts Daily." },
        { id: "em_norm_003", tags: ["noise"], subject: "Weekend Plans", template: "Are we still going hiking on Saturday?" }
    ],

    police_records: [
        // NOISE / NUISANCE
        { id: "pol_noise_001", tags: ["noise", "alcohol"], template: "Officers responded to a loud party; individuals intoxicated but compliant. No arrests." },
        { id: "pol_noise_002", tags: ["noise"], template: "Second noise complaint this week. Verbal warning issued." },

        // SUSPICIOUS
        { id: "pol_suspicious_001", tags: ["night_activity"], template: "Patrol observed loitering near closed shops after midnight. Subject left when approached." },
        { id: "pol_suspicious_002", tags: ["vandalism"], template: "Stopped subject carrying backpack with spray paint cans. No active vandalism observed, released." },

        // VIOLENCE
        { id: "pol_violence_001", tags: ["violence"], template: "Arrested for battery in 2023. Charges dropped due to lack of witness cooperation." },
        { id: "pol_domestic_001", tags: ["violence", "anger"], template: "Responded to domestic dispute. Parties separated for the night. No injuries visible." },

        // DRUGS
        { id: "pol_drug_001", tags: ["drugs"], template: "Vehicle searched during traffic stop. Paraphernalia found, but no substances. Released." },

        // TRAFFIC
        { id: "pol_traffic_001", tags: ["alcohol"], template: "DUI checkpoint refusal. License suspended pending investigation." },
        { id: "pol_car_001", tags: ["car", "travel"], template: "Speeding violation (25km/h over). Ticket issued." }
    ]
};