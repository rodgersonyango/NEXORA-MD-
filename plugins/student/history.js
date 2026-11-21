const settings = require('../../settings');
const axios = require('axios');
const logger = require('../../lib/logger');

module.exports = {
    name: 'history',
    aliases: ['hist', 'event'],
    category: 'student',
    description: 'Explain any historical event',
    usage: '.history <event>',
    react: '🏛️',

    async execute(conn, mek, args, chatId) {
        const event = args.join(' ');
        if (!event) {
            return conn.sendMessage(chatId, { 
                text: `❌ Provide a historical event.\nExample: ${settings.prefix}history World War 1\n${settings.prefix}history Berlin Conference\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `🏛️ *Researching "${event}"...*` }, { quoted: mek });

        try {
            const res = await axios.post('https://text.pollinations.ai/openai', {
                model: 'openai',
                messages: [
                    { role: 'system', content: 'You are a history professor. Explain the event with: Date, Cause, Key Players, Outcome. Keep it under 300 words and use WhatsApp formatting (*bold*).' },
                    { role: 'user', content: event }
                ]
            }, { timeout: 30000 });

            let reply = res.data?.choices?.[0]?.message?.content || "Failed to explain.";
            reply = reply.replace(/\*\*/g, '*').trim();

            await conn.sendMessage(chatId, { text: `🏛️ *HISTORY: ${event.toUpperCase()}*\n\n${reply}\n\n${settings.footer}` }, { quoted: mek });
            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (e) {
            logger.error(`[HISTORY] ${e.message}`);
            await conn.sendMessage(chatId, { text: `❌ Failed to research event.` }, { quoted: mek });
        }
    }
};