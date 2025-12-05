// In-game night length: 8 in-game hours from 21:00 to 05:00
export const TIME_CONFIG = {
    NIGHT_MINUTES: 8 * 60,          // 480 minutes
    NIGHT_DURATION_SECONDS: 90 * 60
};

export const state = {
    // currency
    eightcoin: 0,

    // cracking libraries
    libs: {
        wp1: true,
        wp2: false,
        wp3: false
    },

    // police heat 0..100
    policeHeat: 0,

    // local miner app
    miner: {
        owned: false,
        running: false
    },

    // remote mining app
    remote: {
        owned: false,
        activeNetworkId: null
    },

    // police security session
    security: {
        // { policeId, code, validUntilMin }
        activePoliceCode: null
    },

    // in-game time
    time: {
        day: 1,
        minutes: 0,
        lastHourMark: 0
    },

    gameOver: false,

    // tonight's generated world
    world: {
        citizens: [],
        case: null,

        // police roster for this night
        policeOfficers: [], // [{ id, name, wifiSsid, dutyStartMin, dutyEndMin }]

        // shared selections
        selectedCitizenId: null,
        selectedImei: null
    },

    // simple case scoring stats
    caseStats: {
        totalDecided: 0,
        correctCriminalCalls: 0,
        lastVerdictSummary: ""
    }
};