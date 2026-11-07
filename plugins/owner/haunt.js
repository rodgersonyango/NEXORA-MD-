const settings = require('../../settings');
const logger = require('../../lib/logger');

module.exports = {
    name: 'haunt',
    aliases: ['ghost', 'typing'],
    category: 'owner',
    description: 'Make the bot look like it is typing to a specific number',
    usage: '.haunt <number> [minutes]',
    ownerOnly: true,
    react: '👻',

    async execute(conn, mek, args, chatId, isOwner) {
        if (!isOwner) return;

        const targetNum = (args[0] || '').replace(/[^0-9]/g, '');
        // Default to 2 minutes if no time is provided
        const minutes = parseInt(args[1]) || 2; 

        if (!targetNum || targetNum.length < 10) {
            return conn.sendMessage(chatId, { 
                text: `❌ Provide a valid number.\n\n*Example:*\n${settings.prefix}haunt 254712345678 5\n(This will type for 5 minutes)\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        if (minutes > 15) {
            return conn.sendMessage(chatId, { text: `⚠️ Max time is 15 minutes to avoid getting flagged by WhatsApp.` }, { quoted: mek });
        }

        const jid = targetNum + '@s.whatsapp.net';
        const totalLoops = minutes * 12; // 12 loops per minute (every 5 seconds)

        await conn.sendMessage(chatId, { 
            text: `👻 *Haunting +${targetNum}...*\nThey will see you typing for ${minutes} minutes.` 
        }, { quoted: mek });

        let loops = 0;

        // We send the typing status every 5 seconds
        const interval = setInterval(async () => {
            if (loops >= totalLoops) {
                clearInterval(interval);
                // Stop typing when done
                try { await conn.sendPresenceUpdate('paused', jid); } catch (e) {}
                return;
            }

            try {
                // ONLY send 'composing' (typing). No 'recording' audio.
                await conn.sendPresenceUpdate('composing', jid);
            } catch (e) {}

            loops++;
        }, 5000);
    }
};