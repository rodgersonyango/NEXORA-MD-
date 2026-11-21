const settings = require('../../settings');
const axios = require('axios');
const logger = require('../../lib/logger');

module.exports = {
    name: 'translate',
    aliases: ['tr', 'trans'],
    category: 'student',
    description: 'Translate text to any language',
    usage: '.translate <lang> <text>',
    react: '🌍',

    async execute(conn, mek, args, chatId) {
        const lang = args[0];
        const text = args.slice(1).join(' ');

        if (!lang || !text) {
            return conn.sendMessage(chatId, { 
                text: `❌ Usage: ${settings.prefix}translate <lang> <text>\nExample: ${settings.prefix}translate sw Hello my friend\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `🌍 *Translating to ${lang}...*` }, { quoted: mek });

        try {
            const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`;
            
            // Use Google Translate API
            const res = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(text)}`, { timeout: 10000 });
            
            const translatedText = res.data[0].map(item => item[0]).join('');

            await conn.sendMessage(chatId, { 
                text: `🌍 *TRANSLATION*\n\n*Original:* ${text}\n*Language:* ${lang.toUpperCase()}\n\n*Result:* ${translatedText}\n\n${settings.footer}` 
            }, { quoted: mek });
            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (e) {
            logger.error(`[TRANSLATE] ${e.message}`);
            await conn.sendMessage(chatId, { text: `❌ Failed to translate. Make sure the language code is valid (e.g., en, sw, fr, es).` }, { quoted: mek });
        }
    }
};