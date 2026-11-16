const settings = require('../../settings');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const { saveMediaToTemp } = require('./freeimage');
const logger = require('../../lib/logger');

module.exports = {
    name: 'catbox',
    aliases: ['cb', 'catboxupload'], // ✅ Renamed to avoid conflicts
    category: 'uploader',
    description: 'Upload media to Catbox',
    usage: '.catbox (Reply to media)',
    react: '🐱',

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
            form.append('reqtype', 'fileupload');
            form.append('fileToUpload', fs.createReadStream(filePath));

            const res = await axios.post('https://catbox.moe/user/api.php', form, {
                headers: form.getHeaders()
            });

            fs.unlinkSync(filePath);

            await conn.sendMessage(chatId, {
                text: `✅ *Uploaded to Catbox!*\n\n🔗 Link: ${res.data}\n\n${settings.footer}`
            }, { quoted: mek });

            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (e) {
            logger.error(`[CATBOX] ${e.message}`);
            await conn.sendMessage(chatId, { text: `❌ Error: ${e.message}` });
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        }
    }
};