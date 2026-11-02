const fs = require('fs');
const path = require('path');
const owner = require('./owner');
const settings = require('../settings');
const logger = require('./logger');

const DATA_PATH = path.join(__dirname, '..', 'data', 'stalker_targets.json');

function getTargets() {
    try {
        if (fs.existsSync(DATA_PATH)) return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    } catch (e) {}
    return {};
}

function saveTargets(data) {
    try {
        fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
    } catch (e) {}
}

function getOwnerJid() {
    const num = owner.getPairedNumber() || settings.ownerNumber;
    return num ? (num.includes('@') ? num : num + '@s.whatsapp.net') : null;
}

// 1. START MONITORING ENGINE
function startStalkerEngine(conn) {
    logger.info('🕵️‍♂️ Ghost Tracker Engine Started.');

    // Subscribe to targets on startup
    const targets = getTargets();
    Object.values(targets).forEach(t => {
        conn.presenceSubscribe(t.jid).catch(() => null);
    });

    // Check Profile/Bio/Name changes every 5 minutes
    setInterval(async () => {
        const currentTargets = getTargets();
        const ownerJid = getOwnerJid();
        if (!ownerJid) return;

        for (const [number, data] of Object.entries(currentTargets)) {
            try {
                const jid = data.jid;

                // 1. Check Profile Picture
                const currentPp = await conn.profilePictureUrl(jid, 'image').catch(() => 'none');
                if (currentPp !== data.lastPp) {
                    // PP Changed!
                    if (currentPp !== 'none') {
                        try {
                            const buffer = await conn.profilePictureUrl(jid, 'image').then(url => require('axios').get(url, { responseType: 'arraybuffer' })).then(res => Buffer.from(res.data));
                            await conn.sendMessage(ownerJid, { 
                                image: buffer, 
                                caption: `🚨 *GHOST ALERT*\n\nTarget: +${number}\nAction: Changed Profile Picture!` 
                            });
                        } catch (e) {}
                    } else {
                        await conn.sendMessage(ownerJid, { text: `🚨 *GHOST ALERT*\n\nTarget: +${number}\nAction: Removed Profile Picture!` });
                    }
                    data.lastPp = currentPp;
                    saveTargets(currentTargets);
                }

                // 2. Check Bio (Status)
                const statusRes = await conn.fetchStatus(jid).catch(() => null);
                const currentStatus = statusRes?.status || 'none';
                if (currentStatus !== data.lastStatus) {
                    await conn.sendMessage(ownerJid, { 
                        text: `🚨 *GHOST ALERT*\n\nTarget: +${number}\nAction: Changed Bio!\n\nOld: ${data.lastStatus}\nNew: ${currentStatus}` 
                    });
                    data.lastStatus = currentStatus;
                    saveTargets(currentTargets);
                }

            } catch (e) {
                // Ignore errors (user might have deleted account or blocked bot)
            }
        }
    }, 5 * 60 * 1000); // 5 minutes
}

// 2. HANDLE PRESENCE UPDATES (Typing/Online)
async function handlePresenceUpdate(conn, update) {
    try {
        const targets = getTargets();
        const ownerJid = getOwnerJid();
        if (!ownerJid) return;

        const jid = update.id;
        const number = jid.split('@')[0];

        // If this presence update is from a target
        if (targets[number]) {
            const presence = update.presences?.[jid];
            if (!presence) return;

            let action = '';
            if (presence.lastKnownPresence === 'composing') action = 'is typing... ✍️';
            else if (presence.lastKnownPresence === 'recording') action = 'is recording audio... 🎙️';
            else if (presence.lastKnownPresence === 'available') action = 'is online 🟢';
            else if (presence.lastKnownPresence === 'unavailable') action = 'went offline 🔴';

            if (action) {
                await conn.sendMessage(ownerJid, { 
                    text: `👁️ *LIVE TRACKER*\n\nTarget: +${number}\nActivity: ${action}` 
                });
            }
        }
    } catch (e) {}
}

// 3. HANDLE INCOMING MESSAGES (To capture name changes)
async function handleNameUpdate(conn, mek) {
    try {
        const targets = getTargets();
        const ownerJid = getOwnerJid();
        if (!ownerJid || !mek.pushName) return;

        const sender = mek.key.participant || mek.key.remoteJid;
        const number = sender.split('@')[0];

        if (targets[number]) {
            if (targets[number].lastPushName !== 'unknown' && targets[number].lastPushName !== mek.pushName) {
                await conn.sendMessage(ownerJid, { 
                    text: `🚨 *GHOST ALERT*\n\nTarget: +${number}\nAction: Changed Name!\n\nOld: ${targets[number].lastPushName}\nNew: ${mek.pushName}` 
                });
            }
            if (targets[number].lastPushName !== mek.pushName) {
                targets[number].lastPushName = mek.pushName;
                saveTargets(targets);
            }
        }
    } catch (e) {}
}

module.exports = {
    startStalkerEngine,
    handlePresenceUpdate,
    handleNameUpdate
};