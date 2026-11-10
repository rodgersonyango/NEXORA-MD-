const fs = require('fs');
const path = require('path');
const settings = require('../../settings');
const logger = require('../../lib/logger');
const store = require('../../lib/lightweight_store');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'undelete',
    aliases: ['ud', 'recover', 'retrieve'],
    category: 'tools',
    description: 'Recover the most recently deleted message in the chat',
    usage: '.ud',
    react: '🕵️‍♂️',

    async execute(conn, mek, args, chatId) {
        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });

        try {
            // 1. Read the last deleted ID from the file
            const DELETED_FILE = path.join(process.cwd(), 'data', 'last_deleted.json');
            
            if (!fs.existsSync(DELETED_FILE)) {
                return conn.sendMessage(chatId, { 
                    text: `❌ *No deleted messages found.*\n\nWait for someone to delete a message, then type .ud\n\n${settings.footer}` 
                }, { quoted: mek });
            }

            const deletedData = JSON.parse(fs.readFileSync(DELETED_FILE, 'utf8'));
            const lastDeletedId = deletedData[chatId]; // Get the ID for this specific chat

            if (!lastDeletedId) {
                return conn.sendMessage(chatId, { 
                    text: `❌ *No deleted messages found in this chat.*\n\n${settings.footer}` 
                }, { quoted: mek });
            }

            // 2. Find the exact message in the store
            let originalMsg = null;
            if (store.messages && store.messages[chatId] && store.messages[chatId][lastDeletedId]) {
                originalMsg = store.messages[chatId][lastDeletedId];
            }

            if (!originalMsg || !originalMsg.message) {
                return conn.sendMessage(chatId, { 
                    text: `❌ *Message not found in cache.* It might be too old or the bot restarted.\n\n${settings.footer}` 
                }, { quoted: mek });
            }

            // 3. Extract content safely
            const m = originalMsg.message;
            
            // Ignore protocol messages (like the delete command itself)
            if (m.protocolMessage || m.senderKeyDistributionMessage) {
                 return conn.sendMessage(chatId, { 
                    text: `❌ *The last deleted message was a system event, not a text/media message.*\n\n${settings.footer}` 
                }, { quoted: mek });
            }

            const sender = originalMsg.key?.participant || originalMsg.key?.remoteJid || 'Unknown';
            const textContent = 
                m.conversation || 
                m.extendedTextMessage?.text || 
                m.imageMessage?.caption || 
                m.videoMessage?.caption || 
                m.documentMessage?.caption || null;

            let content = {};

            if (textContent) {
                content = { text: `🕵️‍♂️ *RECOVERED MESSAGE*\nFrom: @${sender.split('@')[0]}\n\n${textContent}\n\n${settings.footer}`, mentions: [sender] };
            } else if (m.imageMessage || m.videoMessage || m.audioMessage || m.documentMessage) {
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
                    text: `❌ *Unsupported message type.* (e.g., stickers or polls are not supported yet).\n\n${settings.footer}` 
                }, { quoted: mek });
            }

            // 4. Send it back
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