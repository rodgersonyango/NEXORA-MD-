const settings = require('../../settings');
const axios = require('axios');
const logger = require('../../lib/logger');

module.exports = {
    name: 'physics',
    aliases: ['phys', 'physicsolve'],
    category: 'student',
    description: 'Solve physics equations and problems',
    usage: '.physics <problem>',
    react: '🍎',

    async execute(conn, mek, args, chatId) {
        const problem = args.join(' ');
        if (!problem) {
            return conn.sendMessage(chatId, { 
                text: `❌ Provide a physics problem or formula.\nExample: ${settings.prefix}physics A car accelerates from 0 to 60 m/s in 5 seconds. What is the acceleration?\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `🍎 *Solving physics problem...*` }, { quoted: mek });

        try {
            const res = await axios.post('https://text.pollinations.ai/openai', {
                model: 'openai',
                messages: [
                    { role: 'system', content: 'You are a physics professor. Solve the problem, show the formula used, and give the final answer with units. Keep it short and clear.' },
                    { role: 'user', content: problem }
                ]
            }, { timeout: 30000 });

            let reply = res.data?.choices?.[0]?.message?.content || "Failed to solve.";
            reply = reply.replace(/\*\*/g, '*').trim();

            await conn.sendMessage(chatId, { text: `🍎 *PHYSICS SOLVER*\n\n${reply}\n\n${settings.footer}` }, { quoted: mek });
            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (e) {
            logger.error(`[PHYSICS] ${e.message}`);
            await conn.sendMessage(chatId, { text: `❌ Failed to solve physics problem.` }, { quoted: mek });
        }
    }
};