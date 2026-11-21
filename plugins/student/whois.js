const settings = require('../../settings');
const axios = require('axios');
const logger = require('../../lib/logger');

module.exports = {
    name: 'whois',
    aliases: ['figure', 'historical'],
    category: 'student',
    description: 'Get a biography of a historical figure',
    usage: '.whois <name>',
    react: '👤',

    async execute(conn, mek, args, chatId) {
        const name = args.join(' ');
        if (!name) {
            return conn.sendMessage(chatId, { 
                text: `❌ Provide a name.\nExample: ${settings.prefix}whois Nelson Mandela\n${settings.prefix}whois Cleopatra\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `👤 *Researching ${name}...*` }, { quoted: mek });

        try {
            const res = await axios.post('https://text.pollinations.ai/openai', {
                model: 'openai',
                messages: [
                    { role: 'system', content: 'You are a biographer. Give a short biography including: Birth, Death, Country, Occupation, Key Achievements. Keep it short and use WhatsApp formatting.' },
                    { role: 'user', content: name }
                ]
            }, { timeout: 25000 });

            let reply = res.data?.choices?.[0]?.message?.content || "Failed to find figure.";
            reply = reply.replace(/\*\*/g, '*').trim();

            await conn.sendMessage(chatId, { text: `👤 *BIOGRAPHY: ${name.toUpperCase()}*\n\n${reply}\n\n${settings.footer}` }, { quoted: mek });
            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (e) {
            logger.error(`[WHOIS] ${e.message}`);
            await conn.sendMessage(chatId, { text: `❌ Failed to fetch biography.` }, { quoted: mek });
        }
    }
};