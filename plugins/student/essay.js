const settings = require('../../settings');
const axios = require('axios');
const logger = require('../../lib/logger');

module.exports = {
    name: 'essay',
    aliases: ['write', 'summary'],
    category: 'student',
    description: 'Write an essay or summary on a topic',
    usage: '.essay <topic>',
    react: '✍️',

    async execute(conn, mek, args, chatId) {
        const topic = args.join(' ');
        if (!topic) {
            return conn.sendMessage(chatId, { 
                text: `❌ Provide a topic.\nExample: ${settings.prefix}essay The causes of World War 1\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `✍️ *Writing essay on "${topic}"...*` }, { quoted: mek });

        try {
            const res = await axios.post('https://text.pollinations.ai/openai', {
                model: 'openai',
                messages: [
                    { role: 'system', content: 'You are a smart student. Write a well-structured essay (Introduction, Body, Conclusion) based on the topic. Keep it concise enough to read on WhatsApp.' },
                    { role: 'user', content: `Topic: ${topic}` }
                ]
            }, { timeout: 30000 });

            let reply = res.data?.choices?.[0]?.message?.content || "Failed to write essay.";
            reply = reply.replace(/\*\*/g, '*').trim();

            // Split if too long for WhatsApp
            if (reply.length > 4000) {
                const chunks = [];
                for (let i = 0; i < reply.length; i += 4000) {
                    chunks.push(reply.slice(i, i + 4000));
                }
                for (let i = 0; i < chunks.length; i++) {
                    const label = chunks.length > 1 ? `\n\n_(Part ${i + 1}/${chunks.length})_` : '';
                    await conn.sendMessage(chatId, { text: chunks[i] + label });
                    await new Promise(r => setTimeout(r, 500));
                }
            } else {
                await conn.sendMessage(chatId, { text: `✍️ *ESSAY: ${topic.toUpperCase()}*\n\n${reply}\n\n${settings.footer}` }, { quoted: mek });
            }

            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (e) {
            logger.error(`[ESSAY] ${e.message}`);
            await conn.sendMessage(chatId, { text: `❌ Failed to write essay.` }, { quoted: mek });
        }
    }
};