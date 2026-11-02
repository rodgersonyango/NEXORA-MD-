const fs = require('fs');
const path = require('path');
const settings = require('../../settings');
const owner = require('../../lib/owner');

const DATA_PATH = path.join(__dirname, '..', '..', 'data', 'stalker_targets.json');

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

module.exports = {
    name: 'ghost',
    aliases: ['stalk', 'stalker'],
    category: 'owner',
    description: 'Track users activity, PP, and bio changes',
    usage: '.ghost <add/remove/list> <number>',
    ownerOnly: true,
    react: '🕵️‍♂️',

    async execute(conn, mek, args, chatId, isOwner) {
        if (!isOwner) return;

        const sub = (args[0] || '').toLowerCase();
        const number = (args[1] || '').replace(/[^0-9]/g, '');
        let targets = getTargets();

        if (sub === 'list') {
            const list = Object.keys(targets);
            if (list.length === 0) {
                return conn.sendMessage(chatId, { text: `🕵️‍♂️ No targets being tracked.` }, { quoted: mek });
            }
            let text = `🕵️‍♂️ *ACTIVE TARGETS*\n\n`;
            list.forEach(num => {
                text += `📱 +${num}\n`;
            });
            return conn.sendMessage(chatId, { text }, { quoted: mek });
        }

        if (!number || number.length < 10) {
            return conn.sendMessage(chatId, { text: `❌ Provide a valid number. Example: ${settings.prefix}ghost add 254712345678` }, { quoted: mek });
        }

        const jid = number + '@s.whatsapp.net';

        if (sub === 'add') {
            // Fetch current state to save as baseline
            try {
                const ppUrl = await conn.profilePictureUrl(jid, 'image').catch(() => null);
                const status = await conn.fetchStatus(jid).catch(() => null);
                
                targets[number] = {
                    jid: jid,
                    addedAt: new Date().toISOString(),
                    lastPp: ppUrl || 'none',
                    lastStatus: status?.status || 'none',
                    lastPushName: 'unknown'
                };
                saveTargets(targets);

                // Subscribe to their presence
                await conn.presenceSubscribe(jid);

                await conn.sendMessage(chatId, { 
                    text: `✅ Now tracking +${number}.\n\nYou will be alerted to any PP, Bio, or Name changes, and their online/typing activity.` 
                }, { quoted: mek });
            } catch (e) {
                await conn.sendMessage(chatId, { text: `❌ Failed to add target: ${e.message}` }, { quoted: mek });
            }
        } 
        
        else if (sub === 'remove' || sub === 'del') {
            if (targets[number]) {
                delete targets[number];
                saveTargets(targets);
                await conn.sendMessage(chatId, { text: `🗑️ Stopped tracking +${number}.` }, { quoted: mek });
            } else {
                await conn.sendMessage(chatId, { text: `❌ Number not in target list.` }, { quoted: mek });
            }
        } 
        
        else {
            await conn.sendMessage(chatId, { text: `Invalid usage. Use ${settings.prefix}ghost add/list/remove <number>` }, { quoted: mek });
        }
    }
};