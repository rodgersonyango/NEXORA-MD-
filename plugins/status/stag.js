const settings = require('../../settings');
const logger = require('../../lib/logger');
const { generateWAMessageFromContent, downloadMediaMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'stag',
    aliases: ['withtag', 'postwith'],
    category: 'status',
    description: 'Post a status and silently tag numbers with a clean layout',
    usage: '.stag <text> 254xxxx, 254xxxx (Reply to image/video)',
    ownerOnly: true,
    react: '👥',

    async execute(conn, mek, args, chatId) {
        const fullInput = args.join(' ');
        if (!fullInput) {
            return conn.sendMessage(chatId, { 
                text: `❌ Provide text and numbers.\n\n*Example:*\n${settings.prefix}stag We are live 254712345678, 254798765432\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        // 1. Extract numbers
        const numberRegex = /(\d{9,15})/g;
        const rawNumbers = fullInput.match(numberRegex) || [];
        
        // 2. Clean text
        let cleanText = fullInput.replace(numberRegex, '').replace(/,/g, '').trim();
        if (!cleanText) cleanText = '📌 Shared Status';

        if (rawNumbers.length === 0) {
            return conn.sendMessage(chatId, { 
                text: `❌ No valid phone numbers detected.\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        const mentionedJids = rawNumbers.map(num => num + '@s.whatsapp.net');
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        if (!quoted?.imageMessage && !quoted?.videoMessage) {
            return conn.sendMessage(chatId, { 
                text: `❌ Reply to an *Image* or *Video*.\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `👥 *Formatting Tagged Status...*` }, { quoted: mek });

        try {
            const botJid = conn.user.id.split(':')[0] + '@s.whatsapp.net';

            // 3. Format the caption to look like a "With" tag
            let tagText = '';
            if (rawNumbers.length === 1) {
                tagText = `👤 With: @${rawNumbers[0]}`;
            } else {
                tagText = `👥 With: @${rawNumbers[0]} + ${rawNumbers.length - 1} other${rawNumbers.length > 2 ? 's' : ''}`;
            }

            const finalCaption = `${cleanText}\n\n${tagText}`;

            // 4. Download & Upload media
            const buffer = await downloadMediaMessage(
                { message: quoted, key: mek.key },
                'buffer',
                {},
                { logger: console, reuploadRequest: conn.updateMediaMessage }
            );
            const upload = await conn.waUploadToServer(buffer, { fileEncSha256: null });

            // 5. Build Status
            const mediaKeyObj = {
                url: upload.url,
                mimetype: quoted.imageMessage ? 'image/jpeg' : 'video/mp4',
                fileSha256: upload.fileSha256,
                fileLength: upload.fileLength,
                mediaKey: upload.mediaKey,
                fileEncSha256: upload.fileEncSha256,
                directPath: upload.directPath,
                caption: finalCaption,
                contextInfo: {
                    mentionedJid: mentionedJids // This silently tags them
                }
            };

            const statusMessage = quoted.imageMessage 
                ? { imageMessage: mediaKeyObj } 
                : { videoMessage: mediaKeyObj };

            const message = generateWAMessageFromContent('status@broadcast', statusMessage, {
                userJid: botJid,
                messageId: '3EB0' + Math.random().toString(36).substring(2, 18).toUpperCase()
            });

            // 6. Post it
            await conn.relayMessage('status@broadcast', message.message, {
                messageId: message.key.id,
                statusJidList: [botJid, ...mentionedJids]
            });

            await conn.sendMessage(chatId, { 
                text: `✅ *Tagged Status Posted!*\n\n📝 Caption:\n${finalCaption}\n\n${settings.footer}`, 
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