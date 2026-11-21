const settings = require('../../settings');
const axios = require('axios');
const logger = require('../../lib/logger');

module.exports = {
    name: 'grammar',
    aliases: ['check', 'proofread'],
    category: 'student',
    description: 'Check grammar and spelling of any text',
    usage: '.grammar <text> (or reply to a message)',
    react: '📝',

    async execute(conn, mek, args, chatId) {
        let text = args.join(' ');
        
        // If no args, check if they replied to a message
        if (!text) {
            const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (quoted) text = quoted.conversation || quoted.extendedTextMessage?.text || '';
        }

        if (!text) {
            return conn.sendMessage(chatId, { 
                text: `❌ Provide text to check.\nExample: ${settings.prefix}grammar I is going to school yesterday\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `📝 *Checking grammar...*` }, { quoted: mek });

        try {
            const res = await axios.post('https://text.pollinations.ai/openai', {
                model: 'openai',
                messages: [
                    { role: 'system', content: 'You are a strict English teacher. Fix the grammar, spelling, and punctuation of the text provided. Reply with the corrected version and a brief explanation of what was wrong. Keep it concise.' },
                    { role: 'user', content: text }
                ]
            }, { timeout: 25000 });

            let reply = res.data?.choices?.[0]?.message?.content || "Failed to check grammar.";
            reply = reply.replace(/\*\*/g, '*').trim();

            await conn.sendMessage(chatId, { text: `📝 *GRAMMAR CHECK*\n\n*Original:*\n${text}\n\n*Result:*\n${reply}\n\n${settings.footer}` }, { quoted: mek });
            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (e) {
            logger.error(`[GRAMMAR] ${e.message}`);
            await conn.sendMessage(chatId, { text: `❌ Failed to check grammar.` }, { quoted: mek });
        }
    }
};