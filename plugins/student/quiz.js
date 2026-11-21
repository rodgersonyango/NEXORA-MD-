const settings = require('../../settings');
const axios = require('axios');
const logger = require('../../lib/logger');

module.exports = {
    name: 'quiz',
    aliases: ['testme', 'exam'],
    category: 'student',
    description: 'Generate a study quiz on any topic',
    usage: '.quiz <topic>',
    react: '🧠',

    async execute(conn, mek, args, chatId) {
        const topic = args.join(' ');
        if (!topic) {
            return conn.sendMessage(chatId, { 
                text: `❌ Provide a topic.\nExample: ${settings.prefix}quiz biology\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `🧠 *Generating quiz on "${topic}"...*` }, { quoted: mek });

        try {
            const res = await axios.post('https://text.pollinations.ai/openai', {
                model: 'openai',
                messages: [
                    { role: 'system', content: 'You are a strict teacher. Create a 3-question multiple choice quiz based on the topic. Give the questions first, and the answers at the very bottom. Use WhatsApp emojis.' },
                    { role: 'user', content: `Topic: ${topic}` }
                ]
            }, { timeout: 25000 });

            let reply = res.data?.choices?.[0]?.message?.content || "Failed to generate quiz.";
            reply = reply.replace(/\*\*/g, '*').trim();

            await conn.sendMessage(chatId, { text: `🧠 *POP QUIZ: ${topic.toUpperCase()}*\n\n${reply}\n\n${settings.footer}` }, { quoted: mek });
            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (e) {
            logger.error(`[QUIZ] ${e.message}`);
            await conn.sendMessage(chatId, { text: `❌ Failed to generate quiz.` }, { quoted: mek });
        }
    }
};