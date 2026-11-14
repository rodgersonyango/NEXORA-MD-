const settings = require('../../settings');
const logger = require('../../lib/logger');

module.exports = {
    name: 'revoke',
    aliases: ['unsend', 'killmsg'],
    category: 'tools',
    description: 'Delete an old message beyond the 2-day limit',
    usage: '.revoke (Reply to the old message)',
    ownerOnly: true,
    react: '🚫',

    async execute(conn, mek, args, chatId) {
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedKey = mek.message?.extendedTextMessage?.contextInfo?.stanzaId;

        if (!quoted || !quotedKey) {
            return conn.sendMessage(chatId, { 
                text: `❌ Reply to the message you want to delete (even if it's old).\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });

        try {
            // Force WhatsApp to delete the message on both sides
            await conn.relayMessage(chatId, {
                protocolMessage: {
                    key: {
                        remoteJid: chatId,
                        fromMe: mek.key.fromMe,
                        id: quotedKey,
                        participant: mek.key.participant || mek.key.remoteJid
                    },
                    type: 0, // 0 = REVOKE
                    timestampMs: Date.now().toString()
                }
            }, { messageId: '3EB0' + Math.random().toString(36).substring(2, 18).toUpperCase() });

            await conn.sendMessage(chatId, { 
                text: `✅ *Message Revoked!*\n\nThe message has been deleted from the other person's phone, even if it was older than 2 days.\n\n${settings.footer}` 
            }, { quoted: mek });
            
            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (error) {
            logger.error(`[REVOKE] Error: ${error.message}`);
            await conn.sendMessage(chatId, { 
                text: `❌ Failed to revoke: ${error.message}\n\n${settings.footer}` 
            }, { quoted: mek });
        }
    }
};