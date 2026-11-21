const settings = require('../../settings');
const axios = require('axios');
const logger = require('../../lib/logger');

module.exports = {
    name: 'mathsolver',
    aliases: ['math', 'solve'],
    category: 'student',
    description: 'Solve math equations',
    usage: '.mathsolver <equation>',
    react: '🧮',

    async execute(conn, mek, args, chatId) {
        const equation = args.join(' ');
        if (!equation) {
            return conn.sendMessage(chatId, { 
                text: `❌ Provide an equation.\nExample: ${settings.prefix}math 2x + 5 = 15\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `🧮 *Solving...*` }, { quoted: mek });

        try {
            // 1. Try Math.js API
            const res = await axios.get(`https://api.mathjs.org/v4/?expr=${encodeURIComponent(equation)}`, { timeout: 10000 });
            
            await conn.sendMessage(chatId, { 
                text: `🧮 *MATH SOLVER*\n\n*Equation:* ${equation}\n*Answer:* ${res.data}\n\n${settings.footer}` 
            }, { quoted: mek });

        } catch (e) {
            // 2. Fallback to AI if equation is complex
            try {
                const aiRes = await axios.post('https://text.pollinations.ai/openai', {
                    model: 'openai',
                    messages: [{ role: 'user', content: `Solve this math problem and show brief steps: ${equation}` }]
                }, { timeout: 20000 });
                
                const reply = aiRes.data?.choices?.[0]?.message?.content || "Could not solve.";
                await conn.sendMessage(chatId, { text: `🧮 *MATH SOLVER (AI)*\n\n${reply}\n\n${settings.footer}` }, { quoted: mek });
            } catch (err) {
                logger.error(`[MATH] ${err.message}`);
                await conn.sendMessage(chatId, { text: `❌ Failed to solve.` }, { quoted: mek });
            }
        }

        await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
    }
};