const settings = require('../../settings');
const logger = require('../../lib/logger');
const store = require('../../lib/lightweight_store');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'undelete',
    aliases: ['ud', 'recover', 'retrieve'],
    category: 'tools',
    description: 'Recover a deleted message by replying to it',
    usage: '.undelete (Reply to a deleted message)',
    react: '🕵️‍♂️',

    async execute(conn, mek, args, chatId) {
        // 1. Get the quoted message context
        const contextInfo = mek.message?.extendedTextMessage?.contextInfo;
        const quotedMsg = contextInfo?.quotedMessage;

        if (!quotedMsg || !contextInfo?.stanzaId) {
            return conn.sendMessage(chatId, { 
                text: `❌ You must reply to a *deleted message* (the "This message was deleted" placeholder) to recover it.\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });

        try {
            const messageId = contextInfo.stanzaId;
            const sender = contextInfo.participant || contextInfo.remoteJid;

            // 2. Try to find the message in the lightweight store
            let originalMsg = await store.loadMessage(chatId, messageId);

            // If not found, try scanning the store bucket directly
            if (!originalMsg && store.messages && store.messages[chatId]) {
                if (store.messages[chatId][messageId]) {
                    originalMsg = store.messages[chatId][messageId];
                }
            }

            // 3. If we still can't find it, fail gracefully
            if (!originalMsg || !originalMsg.message) {
                return conn.sendMessage(chatId, { 
                    text: `❌ *Message not found in cache.*\n\nI can only recover messages that were sent *after* I was connected and the anti-delete feature was enabled.\n\n${settings.footer}` 
                }, { quoted: mek });
            }

            // 4. Send the recovered message back to the chat
            const m = originalMsg.message;
            const textContent = 
                m.conversation || 
                m.extendedTextMessage?.text || 
                m.imageMessage?.caption || 
                m.videoMessage?.caption || 
                m.documentMessage?.caption || null;

            let content = {};
            let type = 'text';

            if (textContent) {
                content = { text: `🕵️‍♂️ *RECOVERED MESSAGE*\n\n${textContent}\n\n${settings.footer}` };
            } else if (m.imageMessage || m.videoMessage || m.audioMessage || m.documentMessage) {
                // Download media if it's media
                let mediaType, mediaMsg;
                if (m.imageMessage) { mediaType = 'image'; mediaMsg = m.imageMessage; }
                else if (m.videoMessage) { mediaType = 'video'; mediaMsg = m.videoMessage; }
                else if (m.audioMessage) { mediaType = 'audio'; mediaMsg = m.audioMessage; }
                else { mediaType = 'document'; mediaMsg = m.documentMessage; }

                const stream = await downloadContentFromMessage(mediaMsg, mediaType);
                const chunks = [];
                for await (const chunk of stream) chunks.push(chunk);
                const buffer = Buffer.concat(chunks);

                content = { caption: `🕵️‍♂️ *RECOVERED MEDIA*\nFrom: @${sender.split('@')[0]}\n\n${settings.footer}`, mentions: [sender] };
                content[mediaType] = buffer;

                if (mediaType === 'document') {
                    content.fileName = mediaMsg.fileName || 'file';
                    content.mimetype = mediaMsg.mimetype || 'application/octet-stream';
                }
                if (mediaType === 'audio' && mediaMsg.ptt) content.ptt = true;
            } else {
                return conn.sendMessage(chatId, { 
                    text: `❌ *Unsupported message type.* I can only recover text, images, videos, audio, and documents.\n\n${settings.footer}` 
                }, { quoted: mek });
            }

            // Send it
            await conn.sendMessage(chatId, content, { quoted: mek });
            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (error) {
            logger.error(`[UNDELETE] Error: ${error.message}`);
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
            await conn.sendMessage(chatId, { 
                text: `❌ Failed to recover: ${error.message}\n\n${settings.footer}` 
            }, { quoted: mek });
        }
    }
};