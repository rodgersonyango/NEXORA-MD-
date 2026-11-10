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
                    text: `❌ *No messages in cache.*\n\nI can only recover messages sent *after* the bot was turned on.\n\n${settings.footer}` 
                }, { quoted: mek });
            }

            // 2. Get all message IDs in this chat
            const messageIds = Object.keys(store.messages[chatId]);
            
            let recovered = false;
            // 3. Loop backwards from the newest message
            for (let i = messageIds.length - 1; i >= 0; i--) {
                const id = messageIds[i];
                const msg = store.messages[chatId][id];
                
                if (!msg || !msg.message) continue;

                const m = msg.message;
                const text = m.conversation || m.extendedTextMessage?.text || '';

                // Skip the user's ".ud" command itself
                if (text.toLowerCase().includes(settings.prefix + 'ud') || text.toLowerCase().includes(settings.prefix + 'undelete')) {
                    continue; 
                }

                const sender = msg.key?.participant || msg.key?.remoteJid || 'Unknown';
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
                    continue; // Skip protocol messages
                }

                // Send the recovered message
                await conn.sendMessage(chatId, content, { quoted: mek });
                recovered = true;
                break; // Stop after finding the first valid message
            }

            if (!recovered) {
                return conn.sendMessage(chatId, { 
                    text: `❌ *No recent messages found.*\n\nTry sending a test message, wait a few seconds, delete it, and type .ud again.\n\n${settings.footer}` 
                }, { quoted: mek });
            }

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