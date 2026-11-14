const settings = require('../../settings');
const logger = require('../../lib/logger');
const { generateWAMessageFromContent, downloadMediaMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'stag',
    aliases: ['withtag', 'postwith'],
    category: 'status',
    description: 'Post a status with "With" tag using plain numbers',
    usage: '.stag <text> 254xxxx, 254xxxx (Reply to image/video)',
    ownerOnly: true,
    react: '👥',

    async execute(conn, mek, args, chatId) {
        // 1. Get the full input
        const fullInput = args.join(' ');
        if (!fullInput) {
            return conn.sendMessage(chatId, { 
                text: `❌ Provide text and numbers.\n\n*Example:*\n${settings.prefix}stag We are live 254712345678, 254798765432\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        // 2. Extract numbers (looks for anything with 9+ digits)
        const numberRegex = /(\d{9,15})/g;
        const rawNumbers = fullInput.match(numberRegex) || [];
        
        // Remove the numbers from the text to get the clean caption
        let cleanText = fullInput.replace(numberRegex, '').replace(/,/g, '').trim();
        if (!cleanText) cleanText = '📌 Shared Status';

        if (rawNumbers.length === 0) {
            return conn.sendMessage(chatId, { 
                text: `❌ No valid phone numbers detected. Make sure they have the country code.\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        // Convert numbers to JIDs
        const mentionedJids = rawNumbers.map(num => num + '@s.whatsapp.net');

        // 3. Check if the user is replying to an image or video
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const isImage = quoted?.imageMessage;
        const isVideo = quoted?.videoMessage;

        if (!isImage && !isVideo) {
            return conn.sendMessage(chatId, { 
                text: `❌ You must reply to an *Image* or *Video* to post a status.\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `👥 *Creating "With" Status for ${mentionedJids.length} people...*` }, { quoted: mek });

        try {
            const botJid = conn.user.id.split(':')[0] + '@s.whatsapp.net';
            
            // 4. Download the media
            const mediaType = isImage ? 'image' : 'video';
            const mediaMessage = isImage ? quoted.imageMessage : quoted.videoMessage;
            
            const buffer = await downloadMediaMessage(
                { message: quoted, key: mek.key },
                'buffer',
                {},
                { logger: console, reuploadRequest: conn.updateMediaMessage }
            );

            const upload = await conn.waUploadToServer(buffer, { fileEncSha256: null });

            // 5. Build the "With Tag" context
            const contextInfo = {
                mentionedJid: mentionedJids,
                groupMentions: mentionedJids.map(jid => ({
                    groupJid: jid,
                    groupSubject: 'With' 
                }))
            };

            // 6. Build the status protocol
            const mediaKeyObj = {
                url: upload.url,
                mimetype: isImage ? 'image/jpeg' : 'video/mp4',
                fileSha256: upload.fileSha256,
                fileLength: upload.fileLength,
                mediaKey: upload.mediaKey,
                fileEncSha256: upload.fileEncSha256,
                directPath: upload.directPath,
                caption: cleanText,
                contextInfo: contextInfo
            };

            const statusMessage = isImage 
                ? { imageMessage: mediaKeyObj } 
                : { videoMessage: mediaKeyObj };

            const message = generateWAMessageFromContent('status@broadcast', statusMessage, {
                userJid: botJid,
                messageId: '3EB0' + Math.random().toString(36).substring(2, 18).toUpperCase()
            });

            // 7. Relay to WhatsApp
            await conn.relayMessage('status@broadcast', message.message, {
                messageId: message.key.id,
                statusJidList: [botJid, ...mentionedJids]
            });

            // 8. Confirm
            const count = mentionedJids.length;
            const withText = `${count} other${count > 1 ? 's' : ''}`;

            await conn.sendMessage(chatId, { 
                text: `✅ *With-Tag Status Posted!*\n\n👥 Header will show: *You + ${withText}*\n📝 Text: ${cleanText}\n\n_Check your status to see the Facebook-style tag._\n\n${settings.footer}`, 
                mentions: mentionedJids
            }, { quoted: mek });
            
            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (error) {
            logger.error(`[STAG] Error: ${error.message}`);
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
            await conn.sendMessage(chatId, { 
                text: `❌ *Failed to post:* ${error.message}\n\n${settings.footer}` 
            }, { quoted: mek });
        }
    }
};