const settings = require('../../settings');
const logger = require('../../lib/logger');
const owner = require('../../lib/owner');

module.exports = {
    name: 'radar',
    aliases: ['whosonline', 'spy'],
    category: 'group',
    description: 'Hack the presence protocol to see who is online in the group',
    usage: '.radar',
    groupOnly: true,
    ownerOnly: true,
    react: '📡',

    async execute(conn, mek, args, chatId) {
        global.radarActiveGroup = chatId;
        global.radarResults = {}; 
        
        try {
            const groupMetadata = await conn.groupMetadata(chatId);
            const participants = groupMetadata.participants;

            await conn.sendMessage(chatId, { text: `📡 *RADAR PING ACTIVE*\n\nScanning ${participants.length} members for active status...\n\n_Please wait 10 seconds..._` }, { quoted: mek });

            for (const p of participants) {
                try {
                    await conn.presenceSubscribe(p.id);
                    await conn.sendPresenceUpdate('composing', chatId);
                } catch (e) {}
            }

            await new Promise(r => setTimeout(r, 10000));

            const ownerNum = owner.getPairedNumber() || settings.ownerNumber;
            const ownerJid = ownerNum + '@s.whatsapp.net';

            let report = `📡 *GHOST RADAR REPORT*\n\nGroup: ${groupMetadata.subject}\n\n`;
            let onlineCount = 0;
            let typingCount = 0;

            for (const [jid, status] of Object.entries(global.radarResults)) {
                const num = jid.split('@')[0];
                if (status === 'composing') {
                    report += `✍️ @${num} is TYPING\n`;
                    typingCount++;
                } else if (status === 'available') {
                    report += `🟢 @${num} is ONLINE\n`;
                    onlineCount++;
                } else if (status === 'unavailable') {
                    report += `🔴 @${num} is OFFLINE\n`;
                }
            }

            if (onlineCount === 0 && typingCount === 0) {
                report += `❌ Everyone is offline or hiding their status.`;
            }

            report += `\n\n📊 *Total Online:* ${onlineCount}\n✍️ *Total Typing:* ${typingCount}\n\n${settings.footer}`;

            await conn.sendMessage(ownerJid, { text: report });
            
            global.radarActiveGroup = null;
            global.radarResults = {};

            await conn.sendMessage(chatId, { text: `✅ *Radar complete.* Check your DM for the report.` }, { quoted: mek });

        } catch (error) {
            logger.error(`[RADAR] Error: ${error.message}`);
            await conn.sendMessage(chatId, { text: `❌ Radar failed: ${error.message}` }, { quoted: mek });
        }
    }
};