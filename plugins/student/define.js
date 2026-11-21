const settings = require('../../settings');
const axios = require('axios');
const logger = require('../../lib/logger');

module.exports = {
    name: 'define',
    aliases: ['dict', 'meaning'],
    category: 'student',
    description: 'Get word definitions, synonyms, and examples',
    usage: '.define <word>',
    react: '📖',

    async execute(conn, mek, args, chatId) {
        const word = args[0]?.trim();
        if (!word) {
            return conn.sendMessage(chatId, { 
                text: `❌ Provide a word.\nExample: ${settings.prefix}define serendipity\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `📖 *Looking up "${word}"...*` }, { quoted: mek });

        try {
            const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, { timeout: 10000 });
            const data = res.data?.[0];

            if (!data) throw new Error("Word not found");

            const meaning = data.meanings?.[0];
            const definition = meaning?.definitions?.[0]?.definition || 'No definition';
            const example = meaning?.definitions?.[0]?.example || 'No example';
            const synonyms = meaning?.synonyms?.slice(0, 5).join(', ') || 'None';
            const partOfSpeech = meaning?.partOfSpeech || 'N/A';

            const caption = 
                `📖 *WORD:* ${data.word.toUpperCase()}\n` +
                `📝 *Type:* ${partOfSpeech}\n\n` +
                `📚 *Definition:*\n${definition}\n\n` +
                `💬 *Example:*\n${example}\n\n` +
                `🟢 *Synonyms:*\n${synonyms}\n\n` +
                `${settings.footer}`;

            await conn.sendMessage(chatId, { text: caption }, { quoted: mek });
            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (e) {
            logger.error(`[DEFINE] ${e.message}`);
            await conn.sendMessage(chatId, { text: `❌ Could not find the word "${word}".` }, { quoted: mek });
        }
    }
};