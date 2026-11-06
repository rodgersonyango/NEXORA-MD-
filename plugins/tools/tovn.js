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
    description: 'Convert a video or audio to a Voice Note',
    usage: '.tovn (Reply to a video/audio)',
    react: '🎙️',

    async execute(conn, mek, args, chatId) {
        // Check if the user is replying to a video or audio
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        if (!quoted || (!quoted.videoMessage && !quoted.audioMessage)) {
            return conn.sendMessage(chatId, { 
                text: `❌ You must reply to a *Video* or *Audio* to convert it.\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        const isVideo = !!quoted.videoMessage;
        const mediaMsg = isVideo ? quoted.videoMessage : quoted.audioMessage;

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `🎙️ *Extracting audio...*` }, { quoted: mek });

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
                    .noVideo() // Remove video track
                    .audioCodec('libmp3lame') // Use MP3 codec
                    .audioBitrate('128k') // Good quality
                    .format('mp3')
                    .save(outputPath)
                    .on('end', resolve)
                    .on('error', reject);
            });

            // 3. Read the output file
            const audioBuffer = fs.readFileSync(outputPath);

            // 4. Send as a Voice Note (PTT)
            await conn.sendMessage(chatId, {
                audio: audioBuffer,
                mimetype: 'audio/mp4',
                ptt: true // This makes it a Voice Note
            }, { quoted: mek });

            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

            // 5. Cleanup
            fs.unlinkSync(inputPath);
            fs.unlinkSync(outputPath);

        } catch (error) {
            logger.error(`[TOVN] Error: ${error.message}`);
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
            await conn.sendMessage(chatId, { 
                text: `❌ Failed to convert: ${error.message}\n\n${settings.footer}` 
            }, { quoted: mek });

            // Cleanup on error
            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        }
    }
};