const settings = require('../../settings');
const axios = require('axios');
const logger = require('../../lib/logger');

module.exports = {
    name: 'timeline',
    aliases: ['chronology', 'era'],
    category: 'student',
    description: 'Generate a historical timeline',
    usage: '.timeline <era/topic>',
    react: '📅',

    async execute(conn, mek, args, chatId) {
        const topic = args.join(' ');
        if (!topic) {
            return conn.sendMessage(chatId, { 
                text: `❌ Provide a topic.\nExample: ${settings.prefix}timeline Ancient Egypt\n${settings.prefix}timeline French Revolution\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `📅 *Building timeline...*` }, { quoted: mek });

        try {
            const res = await axios.post('https://text.pollinations.ai/openai', {
                model: 'openai',
                messages: [
                    { role: 'system', content: 'You are a historian. Create a chronological timeline of the topic with 5-7 key dates and events. Format as: "📅 YEAR: Event". Keep it short.' },
                    { role: 'user', content: topic }
                ]
            }, { timeout: 30000 });

            let reply = res.data?.choices?.[0]?.message?.content || "Failed to build timeline.";
            reply = reply.replace(/\*\*/g, '*').trim();

            await conn.sendMessage(chatId, { text: `📅 *TIMELINE: ${topic.toUpperCase()}*\n\n${reply}\n\n${settings.footer}` }, { quoted: mek });
            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (e) {
            logger.error(`[TIMELINE] ${e.message}`);
            await conn.sendMessage(chatId, { text: `❌ Failed to build timeline.` }, { quoted: mek });
        }
    }
};