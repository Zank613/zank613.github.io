import { state } from "../state.js";
import { getOfficerById } from "./caseWorld.js";

export function isPoliceCodeValid() {
    const pc = state.security.activePoliceCode;
    if (!pc) return false;

    const officer = getOfficerById(pc.policeId);
    if (!officer) return false;

    const t = state.time.minutes;

    return t >= officer.dutyStartMin &&
        t < officer.dutyEndMin &&
        t < pc.validUntilMin;
}

// Helper to gate apps
export function requirePoliceCode(appName) {
    if (isPoliceCodeValid()) {
        return { allowed: true, reason: "" };
    }

    const pc = state.security.activePoliceCode;
    let reason;

    if (!pc) {
        reason = `ACCESS DENIED: No active Police Auth Token. Use NetHacker to obtain one from an on-duty officer.`;
    } else {
        reason = `WARNING: Auth Token Expired. Officer is OFF DUTY. Access attempt flagged.`;
        // Penalty for using expired credentials
        state.policeHeat += 12;
    }

    return { allowed: false, reason };
}

export function setPoliceCode(policeId, code) {
    const officer = getOfficerById(policeId);
    if (!officer) return;

    state.security.activePoliceCode = {
        policeId,
        code,
        validUntilMin: officer.dutyEndMin
    };
}