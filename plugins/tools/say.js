const axios = require('axios');
const settings = require('../../settings');
const logger = require('../../lib/logger');

module.exports = {
    name: 'say',
    aliases: ['tts', 'voice'],
    category: 'tools',
    description: 'Generate an AI Voice Note from text',
    usage: '.say <text>',
    react: '🎙️',

    async execute(conn, mek, args, chatId) {
        const text = args.join(' ');

        if (!text) {
            return conn.sendMessage(chatId, { 
                text: `❌ Please provide text to convert to voice.\nExample: ${settings.prefix}say Hello world\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        if (text.length > 500) {
            return conn.sendMessage(chatId, { 
                text: `❌ Text is too long. Please keep it under 500 characters.\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });

        try {
            // Using a free Google Translate TTS API
            // 'en' is English, 'sw' is Swahili, etc. You can change it if you want.
            const lang = 'en'; 
            const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`;

            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 15000
            });

            const buffer = Buffer.from(response.data);

            if (buffer.length < 1000) {
                throw new Error("Received an empty audio buffer.");
            }

            // Send as a WhatsApp Voice Note (ptt = Push To Talk)
            await conn.sendMessage(chatId, {
                audio: buffer,
                mimetype: 'audio/mp4',
                ptt: true // This makes it look like a normal voice note
            }, { quoted: mek });

            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (error) {
            logger.error(`[SAY] Error: ${error.message}`);
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
            await conn.sendMessage(chatId, { 
                text: `❌ Failed to generate voice note.\nReason: ${error.message}\n\n${settings.footer}` 
            }, { quoted: mek });
        }
    }
};