const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const settings = require('../../settings');
const logger = require('../../lib/logger');

// Set the ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

module.exports = {
    name: 'tovn',
    aliases: ['tovoice', 'extractaudio', 'tomp3'],
    category: 'tools',
    description: 'Convert a video to an Audio file',
    usage: '.tovn (Reply to a video)',
    react: '🎵',

    async execute(conn, mek, args, chatId) {
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        if (!quoted || (!quoted.videoMessage && !quoted.audioMessage)) {
            return conn.sendMessage(chatId, { 
                text: `❌ You must reply to a *Video* or *Audio* to convert it.\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        const isVideo = !!quoted.videoMessage;
        const mediaMsg = isVideo ? quoted.videoMessage : quoted.audioMessage;

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `🎵 *Extracting audio...*` }, { quoted: mek });

        const tmpDir = path.join(process.cwd(), 'data', 'tmp');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

        const inputPath = path.join(tmpDir, `input_${Date.now()}.${isVideo ? 'mp4' : 'mp3'}`);
        const outputPath = path.join(tmpDir, `output_${Date.now()}.mp3`);

        try {
            // 1. Download the media
            const stream = await downloadContentFromMessage(mediaMsg, isVideo ? 'video' : 'audio');
            const writeStream = fs.createWriteStream(inputPath);
            
            for await (const chunk of stream) {
                writeStream.write(chunk);
            }
            writeStream.end();

            await new Promise((resolve) => writeStream.on('finish', resolve));

            // 2. Extract audio using FFmpeg
            await new Promise((resolve, reject) => {
                ffmpeg(inputPath)
                    .noVideo()
                    .audioCodec('libmp3lame')
                    .audioBitrate('128k')
                    .format('mp3')
                    .save(outputPath)
                    .on('end', resolve)
                    .on('error', reject);
            });

            // 3. Read the output file
            const audioBuffer = fs.readFileSync(outputPath);
            const stats = fs.statSync(outputPath);
            const sizeInMB = stats.size / (1024 * 1024);

            // 4. Send the audio
            if (sizeInMB > 15) {
                // If it's a massive file (over 15MB), send as a Document so WhatsApp doesn't compress it
                await conn.sendMessage(chatId, {
                    document: audioBuffer,
                    fileName: `NEXORA_Audio_${Date.now()}.mp3`,
                    mimetype: 'audio/mpeg',
                    caption: `✅ *Audio Extracted!*\n\n_File was too large for normal audio, so it was sent as an MP3 document._\n\n${settings.footer}`
                }, { quoted: mek });
            } else {
                // 🔥 FIX: ptt: false sends it as a normal audio track (Music icon)
                await conn.sendMessage(chatId, {
                    audio: audioBuffer,
                    mimetype: 'audio/mpeg',
                    ptt: false 
                }, { quoted: mek });
            }

            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

            // 5. Cleanup
            fs.unlinkSync(inputPath);
            fs.unlinkSync(outputPath);

        } catch (error) {
            logger.error(`[TOVN] Error: ${error.message}`);
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
            await conn.sendMessage(chatId, { 
                text: `❌ Failed to extract audio: ${error.message}\n\n${settings.footer}` 
            }, { quoted: mek });

            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        }
    }
};