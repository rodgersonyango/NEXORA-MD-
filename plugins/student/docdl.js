const settings = require('../../settings');
const axios = require('axios');
const logger = require('../../lib/logger');

module.exports = {
    name: 'docdl',
    aliases: ['getdoc', 'filedl'],
    category: 'student',
    description: 'Download a document from a direct link',
    usage: '.docdl <url>',
    react: '📥',

    async execute(conn, mek, args, chatId) {
        const url = args[0];
        if (!url || !url.startsWith('http')) {
            return conn.sendMessage(chatId, { 
                text: `❌ Provide a direct link.\nExample: ${settings.prefix}docdl https://example.com/lecture.pdf\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `📥 *Fetching document...*` }, { quoted: mek });

        try {
            const res = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 45000,
                maxContentLength: 50 * 1024 * 1024 // 50MB limit
            });

            const buffer = Buffer.from(res.data);
            const contentType = res.headers['content-type'] || 'application/octet-stream';
            
            // Extract filename from URL
            let fileName = url.split('/').pop().split('?')[0] || 'document.pdf';
            if (!fileName.includes('.')) fileName += '.pdf';

            await conn.sendMessage(chatId, {
                document: buffer,
                fileName: fileName,
                mimetype: contentType,
                caption: `✅ *Document Downloaded*\n\n📁 *File:* ${fileName}\n📦 *Size:* ${(buffer.length / 1024).toFixed(1)} KB\n\n${settings.footer}`
            }, { quoted: mek });

            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (e) {
            logger.error(`[DOCDL] ${e.message}`);
            await conn.sendMessage(chatId, { text: `❌ Failed to download document. The link might be broken or too large.` }, { quoted: mek });
        }
    }
};