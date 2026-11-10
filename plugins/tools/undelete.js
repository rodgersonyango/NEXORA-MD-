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
            // 1. Check if we have messages cached for this chat
            if (!store.messages || !store.messages[chatId] || Object.keys(store.messages[chatId]).length === 0) {
                return conn.sendMessage(chatId, { 
                    text: `❌ *No messages in cache.*\n\nI can only recover messages that were sent *after* the bot was turned on.\n\n${settings.footer}` 
                }, { quoted: mek });
            }

            // 2. Get the message IDs in this chat
            const messageIds = Object.keys(store.messages[chatId]);
            
            // 3. Get the LAST 5 messages (most recent)
            const recentIds = messageIds.slice(-5);
            let foundMessage = null;
            let foundId = null;

            // 4. Look for a message that isn't a command or a bot message
            for (let i = recentIds.length - 1; i >= 0; i--) {
                const id = recentIds[i];
                const msg = store.messages[chatId][id];
                
                if (msg && msg.message) {
                    // Skip the user's ".ud" command itself
                    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
                    if (text.toLowerCase().includes(settings.prefix + 'ud') || text.toLowerCase().includes(settings.prefix + 'undelete')) {
                        continue;
                    }
                    
                    foundMessage = msg;
                    foundId = id;
                    break;
                }
            }

            // 5. If we couldn't find anything
            if (!foundMessage) {
                return conn.sendMessage(chatId, { 
                    text: `❌ *No recent messages found to recover.*\n\nTry sending a test message, delete it, and type .ud again.\n\n${settings.footer}` 
                }, { quoted: mek });
            }

            // 6. Extract content
            const m = foundMessage.message;
            const sender = foundMessage.key?.participant || foundMessage.key?.remoteJid || 'Unknown';
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
                    text: `❌ *Unsupported message type.*\n\n${settings.footer}` 
                }, { quoted: mek });
            }

            // 7. Send it back
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