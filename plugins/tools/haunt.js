const settings = require('../../settings');
const logger = require('../../lib/logger');

module.exports = {
    name: 'haunt',
    aliases: ['ghost', 'typing'],
    category: 'owner',
    description: 'Make the bot look like it is typing to a specific number',
    usage: '.haunt <number>',
    ownerOnly: true,
    react: '👻',

    async execute(conn, mek, args, chatId, isOwner) {
        if (!isOwner) return;

        const targetNum = (args[0] || '').replace(/[^0-9]/g, '');
        if (!targetNum || targetNum.length < 10) {
            return conn.sendMessage(chatId, { text: `❌ Provide a valid number. Example: ${settings.prefix}haunt 254712345678` }, { quoted: mek });
        }

        const jid = targetNum + '@s.whatsapp.net';

        await conn.sendMessage(chatId, { text: `👻 *Haunting +${targetNum}...*\nThey will see you typing for 2 minutes.` }, { quoted: mek });

        let loops = 0;
        // Loop 24 times (every 5 seconds = 2 minutes)
        const interval = setInterval(async () => {
            if (loops >= 24) {
                clearInterval(interval);
                return;
            }
            
            try {
                // Toggle between typing and recording
                if (loops % 2 === 0) {
                    await conn.sendPresenceUpdate('composing', jid);
                } else {
                    await conn.sendPresenceUpdate('recording', jid);
                }
            } catch (e) {}

            loops++;
        }, 5000);
    }
};