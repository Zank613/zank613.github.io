import { state } from "../state.js";

const SPAM_SUBJECTS = [
    "Enlarge your bandwidth!", "Hot singles in Sector 4", "E€E Investment Opportunity",
    "You won a drone!", "CenterOS Security Alert", "Cheap VPNs NO LOGS"
];

const SPAM_BODIES = [
    "Click here to claim your prize.", "Limited time offer for new citizens.",
    "We saw your browser history... buy our cleaner tool.", "Invest in crypto now!"
];

const THREAT_BODIES = [
    "We know what you are doing.", "Stop digging or you will be buried.",
    "The Trespasser sees you.", "Your heat signature is too high."
];

function randomChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export function sendEmail(sender, subject, body) {
    const email = {
        id: `email_${Date.now()}_${Math.floor(Math.random()*1000)}`,
        sender,
        subject,
        body,
        read: false,
        timestamp: `Day ${state.time.day} ${getCurrentTimeStr()}`
    };
    state.emails.unshift(email); // Add to top

    console.log(`[Postman] New Email from ${sender}`);
}

function getCurrentTimeStr() {
    const total = Math.floor(state.time.minutes);
    const h = Math.floor(total / 60) % 24;
    const m = total % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

export function generateDailyEmails() {
    const day = state.time.day;
    const heat = state.policeHeat;
    const rep = state.reputation;

    // 1. Spam (1-3 per day)
    const spamCount = 1 + Math.floor(Math.random() * 3);
    for(let i=0; i<spamCount; i++) {
        sendEmail(
            "spambot@" + randomChoice(["net.w3", "mail.com", "adserv.net"]),
            randomChoice(SPAM_SUBJECTS),
            randomChoice(SPAM_BODIES)
        );
    }

    // 2. Heat Warnings
    if (heat > 50) {
        sendEmail("admin@centeros.net", "Warning: Suspicious Activity Detected", "Your connection has been flagged for manual review. Reduce network signature immediately.");
    }
    if (heat > 80) {
        sendEmail("UNKNOWN", "...", randomChoice(THREAT_BODIES));
    }

    // 3. Reputation Emails
    if (rep.police > 10) {
        sendEmail("police_noreply@center.gov", "Citizen Commendation", "Your recent assistance has been noted. Keep up the good work. Surveillance priority lowered.");
    }
    if (rep.underworld > 10) {
        sendEmail("Viper", "Discount", "I like your style. Prices dropped in the market. Don't tell anyone.");
    } else if (rep.underworld < -10) {
        sendEmail("Viper", "Warning", "You're getting too cozy with the cops. Prices just went up. Pay the tax.");
    }
}

// Hook for Job Acceptance
export function onJobAccepted(job) {
    sendEmail(
        "anon_relay@pleasefindthem.com",
        `RE: ${job.title}`,
        `Thanks for taking this on.\n\nTarget ID: ${job.citizenId}\nReward: ${job.reward} E€E\n\nI need you to find where they are. Don't contact me until you have proof.`
    );
}