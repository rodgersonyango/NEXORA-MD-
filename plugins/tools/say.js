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
                text: `❌ Please provide text.\nExample: ${settings.prefix}say Hello world\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });

        try {
            // Using a reliable high-quality TTS API
            const url = `https://api.nexoracle.com/ai/text-to-speech?text=${encodeURIComponent(text)}&apikey=free_key`;

            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 20000
            });

            const buffer = Buffer.from(response.data);

            if (buffer.length < 1000) throw new Error("Failed to generate audio.");

            // Send as a real WhatsApp Voice Note
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
                text: `❌ TTS Error: ${error.message}\n\n${settings.footer}` 
            }, { quoted: mek });
        }
    }
};