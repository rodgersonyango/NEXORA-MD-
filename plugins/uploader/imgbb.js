const settings = require('../../settings');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const { saveMediaToTemp } = require('./freeimage');
const logger = require('../../lib/logger');

module.exports = {
    name: 'imgbb',
    aliases: ['uploader'], // ✅ Renamed to avoid conflicts
    category: 'uploader',
    description: 'Upload media to ImgBB',
    usage: '.imgbb (Reply to media)',
    react: '🖼️',

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
            
            const form = new FormData();
            form.append('image', fs.createReadStream(filePath));

            const res = await axios.post('https://api.imgbb.com/1/upload', form, {
                headers: form.getHeaders(),
                params: { key: settings.imgbbApiKey || 'YOUR_API_KEY' }
            });

            fs.unlinkSync(filePath);

            await conn.sendMessage(chatId, {
                text: `✅ *Uploaded Successfully!*\n\n🔗 Link: ${res.data.data.url}\n\n${settings.footer}`
            }, { quoted: mek });

            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (e) {
            logger.error(`[IMGBB] ${e.message}`);
            await conn.sendMessage(chatId, { text: `❌ Error: ${e.message}` });
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        }
    }
};