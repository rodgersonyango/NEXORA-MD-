const settings = require('../../settings');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

ffmpeg.setFfmpegPath(ffmpegPath);

module.exports = {
    name: 'sloop',
    aliases: ['looper'],
    category: 'status',
    description: 'Loop a video status for 1 hour',
    usage: 'Reply to a video with .sloop',
    ownerOnly: true,
    react: '🔄',
    async execute(conn, mek, args, chatId) {
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted || !quoted.videoMessage) return conn.sendMessage(chatId, { text: '❌ Reply to a video.' });
        
        const tmpDir = path.join(process.cwd(), 'data', 'tmp');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
        
        const inPath = path.join(tmpDir, `in_${Date.now()}.mp4`);
        const outPath = path.join(tmpDir, `out_${Date.now()}.mp4`);

        await conn.sendMessage(chatId, { text: '🔄 *Looping video (this may take 30s)...*' }, { quoted: mek });

        try {
            const stream = await downloadContentFromMessage(quoted.videoMessage, 'video');
            const writeStream = fs.createWriteStream(inPath);
            for await (const chunk of stream) writeStream.write(chunk);
            writeStream.end();
            await new Promise(r => writeStream.on('finish', r));

            // Use FFmpeg to loop the video 100 times
            await new Promise((resolve, reject) => {
                ffmpeg()
                    .input(inPath)
                    .inputOptions(['-stream_loop 99']) // Loop 100 times
                    .outputOptions(['-c copy']) // Copy codec (fast)
                    .save(outPath)
                    .on('end', resolve)
                    .on('error', reject);
            });

            const buffer = fs.readFileSync(outPath);
            
            await conn.sendMessage('status@broadcast', { video: buffer, caption: '🔄 Infinite Loop' }, { statusJidList: [conn.user.id] });
            await conn.sendMessage(chatId, { text: '✅ Looped video posted to your status!' });
            
            fs.unlinkSync(inPath);
            fs.unlinkSync(outPath);
        } catch (e) {
            conn.sendMessage(chatId, { text: `❌ Failed: ${e.message}` });
        }
    }
};