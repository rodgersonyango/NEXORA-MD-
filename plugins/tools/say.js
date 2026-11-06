const axios = require('axios');
const settings = require('../../settings');
const logger = require('../../lib/logger');

module.exports = {
    name: 'say',
    aliases: ['tts', 'voice'],
    category: 'tools',
    description: 'Generate an AI Voice Note (Male or Female)',
    usage: '.say <voice> <text>',
    react: '🎙️',

    async execute(conn, mek, args, chatId) {
        if (args.length === 0) {
            return conn.sendMessage(chatId, { 
                text: `❌ Please provide text.\n\n*Example:*\n${settings.prefix}say Brian Hello world\n${settings.prefix}say Emma I am a girl\n\n*Voices:* Brian (Male), Emma (Female), Amy (Female)\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        // Default voice
        let voice = 'en-US-BrianNeural';
        let text = args.join(' ');

        // Check if the first word is a valid voice name
        const voiceMap = {
            'brian': 'en-US-BrianNeural',
            'emma': 'en-US-EmmaNeural',
            'amy': 'en-US-AriaNeural',
            'guy': 'en-US-GuyNeural',
            'sara': 'en-US-SaraNeural'
        };
        
        const firstWord = args[0].toLowerCase();
        
        if (voiceMap[firstWord]) {
            voice = voiceMap[firstWord];
            text = args.slice(1).join(' '); // Remove the voice name from the text
        }

        if (!text) {
            return conn.sendMessage(chatId, { 
                text: `❌ Please provide text to speak.\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });

        try {
            // Using a super reliable Edge-TTS API (No key required)
            const url = `https://api.nexoracle.com/ai/tts?text=${encodeURIComponent(text)}&voice=${voice}&apikey=free_key`;

            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 20000
            });

            const buffer = Buffer.from(response.data);

            // Basic check to ensure it's not an error message
            if (buffer.length < 2000) {
                throw new Error("Failed to generate audio. The text might be too short.");
            }

            // Send as a WhatsApp Voice Note
            await conn.sendMessage(chatId, {
                audio: buffer,
                mimetype: 'audio/mp4',
                ptt: true // This makes it look like a real voice note
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