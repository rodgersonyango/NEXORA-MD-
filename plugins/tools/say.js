const axios = require('axios');
const settings = require('../../settings');
const logger = require('../../lib/logger');

module.exports = {
    name: 'say',
    aliases: ['tts', 'voice'],
    category: 'tools',
    description: 'Generate an AI Voice Note',
    usage: '.say <text>',
    react: '🎙️',

    async execute(conn, mek, args, chatId) {
        if (args.length === 0) {
            return conn.sendMessage(chatId, { 
                text: `❌ Please provide text.\nExample: ${settings.prefix}say Hello world\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        let text = args.join(' ');

        // Google TTS has a 200 character limit per request. We split it to be safe.
        if (text.length > 200) {
            text = text.substring(0, 200);
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });

        try {
            // Reliable Google TTS endpoint (No API Key)
            const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=en&client=tw-ob`;

            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': 'https://translate.google.com/'
                },
                timeout: 15000
            });

            const buffer = Buffer.from(response.data);

            // Check if Google returned an error page instead of audio
            if (buffer.length < 2000) {
                throw new Error("Audio file is too small. Google blocked the request.");
            }

            // Send as a WhatsApp Voice Note
            await conn.sendMessage(chatId, {
                audio: buffer,
                mimetype: 'audio/mp4',
                ptt: true
            }, { quoted: mek });

            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (error) {
            logger.error(`[SAY] Error: ${error.message}`);
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
            await conn.sendMessage(chatId, { 
                text: `❌ TTS Error: Your server IP is blocked by Google.\n\n${settings.footer}` 
            }, { quoted: mek });
        }
    }
};