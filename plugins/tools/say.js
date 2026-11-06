const axios = require('axios');
const settings = require('../../settings');
const logger = require('../../lib/logger');

module.exports = {
    name: 'say',
    aliases: ['tts', 'voice'],
    category: 'tools',
    description: 'Generate an AI Voice Note (Supports: Brian, Emma, Amy, Joanna)',
    usage: '.say <voice> <text>',
    react: '🎙️',

    async execute(conn, mek, args, chatId) {
        if (args.length === 0) {
            return conn.sendMessage(chatId, { 
                text: `❌ Please provide text.\n\n*Example:*\n${settings.prefix}say Brian Hello world\n${settings.prefix}say Emma I am a girl\n\n*Available voices:* Brian, Emma, Amy, Joanna\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        // Default voice
        let voice = 'Brian';
        let text = args.join(' ');

        // Check if the first word is a valid voice name
        const voiceList = ['Brian', 'Emma', 'Amy', 'Joanna', 'Salli', 'Matthew', 'Ivy', 'Justin'];
        const firstWord = args[0].charAt(0).toUpperCase() + args[0].slice(1).toLowerCase();
        
        if (voiceList.includes(firstWord)) {
            voice = firstWord;
            text = args.slice(1).join(' '); // Remove the voice name from the text
        }

        if (!text) {
            return conn.sendMessage(chatId, { 
                text: `❌ Please provide text to speak.\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });

        try {
            // StreamElements TTS API (No API key needed!)
            const url = `https://api.streamelements.com/kappa/v2/speech?voice=${voice}&text=${encodeURIComponent(text)}`;

            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 20000
            });

            const buffer = Buffer.from(response.data);

            // Basic check to ensure it's not an error message
            if (buffer.length < 1000) {
                throw new Error("Failed to generate audio. The API might be down.");
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
                text: `❌ TTS Error: The voice API is currently unavailable. Try again later.\n\n${settings.footer}` 
            }, { quoted: mek });
        }
    }
};