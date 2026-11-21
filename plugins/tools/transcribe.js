const settings = require('../../settings');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const logger = require('../../lib/logger');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'transcribe',
    aliases: ['stt', 'voicetotext'],
    category: 'tools',
    description: 'Transcribe voice notes to text',
    usage: '.transcribe (Reply to a voice note)',
    react: '🎙️',

    async execute(conn, mek, args, chatId) {
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted?.audioMessage) {
            return conn.sendMessage(chatId, { 
                text: `❌ Reply to a *Voice Note* to transcribe it.\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `🎙️ *Transcribing audio...*` }, { quoted: mek });

        const tmpDir = path.join(process.cwd(), 'data', 'tmp');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
        const filePath = path.join(tmpDir, `audio_${Date.now()}.mp3`);

        try {
            // 1. Download the voice note
            const stream = await downloadContentFromMessage(quoted.audioMessage, 'audio');
            const writeStream = fs.createWriteStream(filePath);
            for await (const chunk of stream) writeStream.write(chunk);
            writeStream.end();
            await new Promise(r => writeStream.on('finish', r));

            // 2. Upload to Catbox
            const form = new FormData();
            form.append('reqtype', 'fileupload');
            form.append('fileToUpload', fs.createReadStream(filePath));
            
            const catboxRes = await axios.post('https://catbox.moe/user/api.php', form, {
                headers: form.getHeaders(),
                timeout: 45000
            });
            
            const audioUrl = catboxRes.data.trim();
            if (!audioUrl.startsWith('https://')) throw new Error("Catbox upload failed.");

            // 3. Transcribe via Omegatech
            const apiRes = await axios.get(`https://api.omegatech.app/api/tools/audio-transcribe?audioUrl=${encodeURIComponent(audioUrl)}&scenario=auto`, { timeout: 45000 });
            
            if (!apiRes.data?.success) throw new Error("Transcription failed.");

            const transcription = apiRes.data.transcription || "No speech detected.";

            await conn.sendMessage(chatId, { 
                text: `🎙️ *TRANSCRIPTION*\n\n${transcription}\n\n${settings.footer}` 
            }, { quoted: mek });

            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (e) {
            logger.error(`[TRANSCRIBE] ${e.message}`);
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
            await conn.sendMessage(chatId, { text: `❌ Failed: ${e.message}` }, { quoted: mek });
        } finally {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
    }
};