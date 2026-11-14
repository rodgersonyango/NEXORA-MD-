const settings = require('../../settings');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const logger = require('../../lib/logger');

module.exports = {
    name: 'clone',
    aliases: ['voiceclone', 'deepfake'],
    category: 'ai',
    description: 'Clone a voice and say anything',
    usage: '.clone <text> (Reply to a voice note)',
    react: '🎙️',

    async execute(conn, mek, args, chatId) {
        const text = args.join(' ');
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!text) {
            return conn.sendMessage(chatId, { 
                text: `❌ Reply to a voice note with the text you want the cloned voice to say.\n\nExample: ${settings.prefix}clone Hello, I am your boss.\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        if (!quoted || !quoted.audioMessage) {
            return conn.sendMessage(chatId, { 
                text: `❌ You must reply to a *Voice Note* to clone it.\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `🎙️ *Extracting voice signature...*\n\n_Cloning and applying to text..._` }, { quoted: mek });

        const tmpDir = path.join(process.cwd(), 'data', 'tmp');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
        const voicePath = path.join(tmpDir, `clone_${Date.now()}.ogg`);

        try {
            // 1. Download the original voice note
            const stream = await downloadContentFromMessage(quoted.audioMessage, 'audio');
            const writeStream = fs.createWriteStream(voicePath);
            for await (const chunk of stream) writeStream.write(chunk);
            writeStream.end();
            await new Promise(r => writeStream.on('finish', r));

            // 2. Send to AI Voice Cloner API (Example using a generic endpoint)
            // Note: Public voice cloner APIs are rare and often paid. Using a mockup for the demo.
            const form = new FormData();
            form.append('file', fs.createReadStream(voicePath));
            form.append('text', text);

            const response = await axios.post('https://api.nexoracle.com/ai/voice-clone', form, {
                headers: { ...form.getHeaders(), 'apikey': 'free_key' },
                responseType: 'arraybuffer',
                timeout: 45000
            });

            const clonedBuffer = Buffer.from(response.data);
            
            if (clonedBuffer.length < 1000) throw new Error("Voice clone failed.");

            // 3. Send the cloned voice note
            await conn.sendMessage(chatId, {
                audio: clonedBuffer,
                mimetype: 'audio/mp4',
                ptt: true
            }, { quoted: mek });

            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
            
            fs.unlinkSync(voicePath);

        } catch (error) {
            logger.error(`[CLONE] Error: ${error.message}`);
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
            await conn.sendMessage(chatId, { 
                text: `❌ *Voice Clone Failed.*\n\nThe AI server might be busy. Try a shorter voice note.\n\n${settings.footer}` 
            }, { quoted: mek });
            if (fs.existsSync(voicePath)) fs.unlinkSync(voicePath);
        }
    }
};