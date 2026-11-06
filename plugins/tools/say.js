const axios = require('axios');
const settings = require('../../settings');
const logger = require('../../lib/logger');

module.exports = {
    name: 'say',
    aliases: ['tts', 'voice'],
    category: 'tools',
    description: 'Generate AI Audio',
    usage: '.say <text>',
    react: '🎙️',

    async execute(conn, mek, args, chatId) {
        if (args.length === 0) {
            return conn.sendMessage(chatId, { text: `❌ Please provide text.\n\n${settings.footer}` }, { quoted: mek });
        }

        let text = args.join(' ');
        if (text.length > 200) text = text.substring(0, 200);

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });

        try {
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

            if (buffer.length < 2000) throw new Error("Audio generation failed.");

            // 🛠️ THE FIX: Changed ptt to false and added mimetype audio/mpeg
            await conn.sendMessage(chatId, {
                audio: buffer,
                mimetype: 'audio/mpeg', 
                ptt: false // Sends as a normal audio file instead of a voice note
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