const settings = require('../../settings');
const axios = require('axios');
const logger = require('../../lib/logger');

module.exports = {
    name: 'biology',
    aliases: ['bio', 'cell'],
    category: 'student',
    description: 'Explain biological concepts and processes',
    usage: '.biology <concept>',
    react: '🧬',

    async execute(conn, mek, args, chatId) {
        const concept = args.join(' ');
        if (!concept) {
            return conn.sendMessage(chatId, { 
                text: `❌ Provide a biological concept.\nExample: ${settings.prefix}biology photosynthesis\n${settings.prefix}biology mitosis vs meiosis\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `🧬 *Explaining biology...*` }, { quoted: mek });

        try {
            const res = await axios.post('https://text.pollinations.ai/openai', {
                model: 'openai',
                messages: [
                    { role: 'system', content: 'You are a biology teacher. Explain the concept in 3-4 concise bullet points. Use simple language and clear formatting.' },
                    { role: 'user', content: concept }
                ]
            }, { timeout: 30000 });

            let reply = res.data?.choices?.[0]?.message?.content || "Failed to explain.";
            reply = reply.replace(/\*\*/g, '*').trim();

            await conn.sendMessage(chatId, { text: `🧬 *BIOLOGY EXPLAINER*\n\n${reply}\n\n${settings.footer}` }, { quoted: mek });
            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (e) {
            logger.error(`[BIOLOGY] ${e.message}`);
            await conn.sendMessage(chatId, { text: `❌ Failed to explain biology concept.` }, { quoted: mek });
        }
    }
};