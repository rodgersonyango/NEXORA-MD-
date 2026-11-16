const settings = require('../../settings');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const { saveMediaToTemp } = require('./freeimage');
const logger = require('../../lib/logger');

module.exports = {
    name: 'url',
    aliases: ['pone', 'uploadurl'], // ✅ Renamed to avoid conflicts
    category: 'uploader',
    description: 'Upload media and get a URL',
    usage: '.url (Reply to media)',
    react: '🔗',

    async execute(conn, mek, args, chatId) {
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted?.imageMessage && !quoted?.videoMessage) {
            return conn.sendMessage(chatId, { text: `❌ Reply to an image or video.` });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        
        try {
            const type = quoted.imageMessage ? 'image' : 'video';
            const media = quoted.imageMessage || quoted.videoMessage;
            const filePath = await saveMediaToTemp(media, type);
            
            const { uploadToFreeImage } = require('./freeimage');
            const url = await uploadToFreeImage(filePath);
            
            fs.unlinkSync(filePath);

            await conn.sendMessage(chatId, {
                text: `✅ *Uploaded!*\n\n🔗 Link: ${url}\n\n${settings.footer}`
            }, { quoted: mek });

            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (e) {
            logger.error(`[URL] ${e.message}`);
            await conn.sendMessage(chatId, { text: `❌ Error: ${e.message}` });
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        }
    }
};