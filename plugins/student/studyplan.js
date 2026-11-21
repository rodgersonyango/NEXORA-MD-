const settings = require('../../settings');
const axios = require('axios');
const logger = require('../../lib/logger');

module.exports = {
    name: 'studyplan',
    aliases: ['timetable', 'plan'],
    category: 'student',
    description: 'Generate a timed study schedule',
    usage: '.studyplan <subjects and time>',
    react: '📅',

    async execute(conn, mek, args, chatId) {
        const input = args.join(' ');
        if (!input) {
            return conn.sendMessage(chatId, { 
                text: `❌ Provide subjects and time.\nExample: ${settings.prefix}studyplan 2 hours math, 1 hour biology\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `📅 *Generating your study plan...*` }, { quoted: mek });

        try {
            const res = await axios.post('https://text.pollinations.ai/openai', {
                model: 'openai',
                messages: [
                    { role: 'system', content: 'You are an academic planner. Create a strict, timed study timetable based on the input. Use WhatsApp formatting (no markdown bold, use *bold*). Include 5-minute breaks. Keep it concise.' },
                    { role: 'user', content: `Create a study plan for: ${input}` }
                ]
            }, { timeout: 20000 });

            let reply = res.data?.choices?.[0]?.message?.content || "Failed to generate plan.";
            reply = reply.replace(/\*\*/g, '*').trim();

            await conn.sendMessage(chatId, { text: `📅 *YOUR STUDY PLAN*\n\n${reply}\n\n${settings.footer}` }, { quoted: mek });
            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (e) {
            logger.error(`[STUDYPLAN] ${e.message}`);
            await conn.sendMessage(chatId, { text: `❌ Failed to generate study plan.` }, { quoted: mek });
        }
    }
};