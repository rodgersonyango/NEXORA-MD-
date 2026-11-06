const axios = require('axios');
const settings = require('../../settings');
const logger = require('../../lib/logger');

module.exports = {
    name: 'say',
    aliases: ['tts', 'voice'],
    category: 'tools',
    description: 'Generate an AI Audio with custom voices',
    usage: '.say <voice> <text>',
    react: '🎙️',

    async execute(conn, mek, args, chatId) {
        if (args.length === 0) {
            return conn.sendMessage(chatId, { text: `❌ Please provide text or type ${settings.prefix}say list\n\n${settings.footer}` }, { quoted: mek });
        }

        // Voice Dictionary mapping friendly names to Google language codes
        const voices = {
            'us': 'en-US',       // American Female
            'uk': 'en-GB',       // British Female
            'au': 'en-AU',       // Australian Female
            'in': 'en-IN',       // Indian Female
            'sw': 'sw',          // Swahili
            'fr': 'fr',          // French
            'es': 'es',          // Spanish
            'de': 'de',          // German
            'it': 'it',          // Italian
            'pt': 'pt',          // Portuguese
            'ru': 'ru',          // Russian
            'jp': 'ja',          // Japanese
            'kr': 'ko',          // Korean
            'cn': 'zh-CN',       // Chinese
            'ar': 'ar',          // Arabic
            'hi': 'hi',          // Hindi
            'tr': 'tr',          // Turkish
            'id': 'id',          // Indonesian
            'nl': 'nl',          // Dutch
            'pl': 'pl'           // Polish
        };

        const firstWord = args[0].toLowerCase();

        // Show the list of available voices
        if (firstWord === 'list' || firstWord === 'help') {
            let listText = `🎙️ *NEXORA TTS VOICES*\n\n`;
            listText += `*Usage:* ${settings.prefix}say <voice> <text>\n`;
            listText += `*Example:* ${settings.prefix}say uk Hello mate\n\n`;
            listText += `*Available Voices:*\n`;
            
            for (const [key, value] of Object.entries(voices)) {
                listText += `▪️ ${key} (${value})\n`;
            }
            listText += `\n*Default:* If no voice is provided, it uses US English.\n\n${settings.footer}`;
            
            return conn.sendMessage(chatId, { text: listText }, { quoted: mek });
        }

        let langCode = 'en-US'; // Default
        let textToSay = args.join(' ');

        // If the user typed a valid voice name, use it and remove it from the text
        if (voices[firstWord]) {
            langCode = voices[firstWord];
            textToSay = args.slice(1).join(' ');
        }

        if (!textToSay) {
            return conn.sendMessage(chatId, { text: `❌ Please provide the text to speak.\n\n${settings.footer}` }, { quoted: mek });
        }

        // Google TTS limit is ~200 chars per request
        if (textToSay.length > 200) {
            textToSay = textToSay.substring(0, 200);
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });

        try {
            // Google Translate TTS endpoint
            const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(textToSay)}&tl=${langCode}&client=tw-ob`;

            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                    'Referer': 'https://translate.google.com/'
                },
                timeout: 15000
            });

            const buffer = Buffer.from(response.data);

            if (buffer.length < 2000) {
                throw new Error("Audio generation failed. Try again.");
            }

            // Send as normal audio file (ptt: false) so it never fails to play
            await conn.sendMessage(chatId, {
                audio: buffer,
                mimetype: 'audio/mpeg', 
                ptt: false
            }, { quoted: mek });

            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (error) {
            logger.error(`[SAY] Error: ${error.message}`);
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
            await conn.sendMessage(chatId, { 
                text: `❌ TTS Error: ${error.message}\n\n${settings.footer}` 
            }, { quoted: mek });
        }
    }
};