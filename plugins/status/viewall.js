const settings = require('../../settings');
const logger = require('../../lib/logger');

module.exports = {
    name: 'viewall',
    aliases: ['seeall', 'clearstatus'],
    category: 'status',
    description: 'Instantly view and react to all active statuses',
    usage: '.viewall',
    ownerOnly: true,
    react: '👁️',

    async execute(conn, mek, args, chatId) {
        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `👁️ *Fetching and viewing all active statuses...*` }, { quoted: mek });

        try {
            const store = require('../../lib/lightweight_store');
            const contacts = Object.keys(store.contacts || {});
            const targetJids = contacts.filter(jid => jid.endsWith('@s.whatsapp.net'));

            // Default emojis if none are set in settings
            const emojis = Array.isArray(settings.statusReactionEmojis) && settings.statusReactionEmojis.length > 0 
                ? settings.statusReactionEmojis 
                : ['🔥', '❤️', '😍', '👑', '✨', '💯'];

            let viewedCount = 0;
            let reactedCount = 0;

            // Loop through contacts
            for (const jid of targetJids) {
                try {
                    // 1. Mark as viewed
                    await conn.readMessages([{ remoteJid: jid }]);
                    viewedCount++;

                    // 2. React with a random emoji
                    // Note: We use a slight delay to avoid rate limits
                    await new Promise(r => setTimeout(r, 150));
                    
                    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                    
                    // Send the reaction to the status
                    await conn.relayMessage('status@broadcast', {
                        reactionMessage: {
                            key: {
                                remoteJid: 'status@broadcast',
                                fromMe: false,
                                id: 'status_' + jid.split('@')[0] + '_' + Date.now(),
                                participant: jid
                            },
                            text: randomEmoji,
                            senderTimestampMs: Date.now()
                        }
                    }, {
                        messageId: '3EB0' + Math.random().toString(36).substring(2, 18).toUpperCase(),
                        statusJidList: [jid, conn.user.id.split(':')[0] + '@s.whatsapp.net']
                    });
                    
                    reactedCount++;

                } catch (e) {
                    // Ignore if they have no status or it fails
                }
            }

            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
            await conn.sendMessage(chatId, { 
                text: `✅ *VIEW & REACT COMPLETE*\n\n👁️ Statuses Viewed: ${viewedCount}\n💥 Reactions Sent: ${reactedCount}\n\n_Note: You can only interact with contacts who allow you to view their statuses._\n\n${settings.footer}` 
            }, { quoted: mek });

        } catch (error) {
            logger.error(`[VIEWALL] Error: ${error.message}`);
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
            await conn.sendMessage(chatId, { 
                text: `❌ Failed: ${error.message}\n\n${settings.footer}` 
            }, { quoted: mek });
        }
    }
};