const settings = require('../../settings');
const axios = require('axios');
const logger = require('../../lib/logger');

module.exports = {
    name: 'chemistry',
    aliases: ['chem', 'balance'],
    category: 'student',
    description: 'Solve and balance chemical equations',
    usage: '.chemistry <equation>',
    react: '🧪',

    async execute(conn, mek, args, chatId) {
        const equation = args.join(' ');
        if (!equation) {
            return conn.sendMessage(chatId, { 
                text: `❌ Provide a chemical equation.\nExample: ${settings.prefix}chemistry H2 + O2 -> H2O\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `🧪 *Processing chemistry...*` }, { quoted: mek });

        try {
            const res = await axios.post('https://text.pollinations.ai/openai', {
                model: 'openai',
                messages: [
                    { role: 'system', content: 'You are a chemistry expert. Balance the chemical equation and briefly explain the reaction type (e.g., synthesis, combustion). Keep it short.' },
                    { role: 'user', content: equation }
                ]
            }, { timeout: 30000 });

            let reply = res.data?.choices?.[0]?.message?.content || "Failed to balance.";
            reply = reply.replace(/\*\*/g, '*').trim();

            await conn.sendMessage(chatId, { text: `🧪 *CHEMISTRY SOLVER*\n\n${reply}\n\n${settings.footer}` }, { quoted: mek });
            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (e) {
            logger.error(`[CHEMISTRY] ${e.message}`);
            await conn.sendMessage(chatId, { text: `❌ Failed to process equation.` }, { quoted: mek });
        }
    }
};