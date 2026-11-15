const settings = require('../../settings');
const logger = require('../../lib/logger');
const store = require('../../lib/lightweight_store');

module.exports = {
    name: 'viewall',
    aliases: ['seeall', 'clearstatus', 'forceview'],
    category: 'status',
    description: 'Force view and react to all active statuses',
    usage: '.viewall',
    ownerOnly: true,
    react: '👁️',

    async execute(conn, mek, args, chatId) {
        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `👁️ *FORCING STATUS FETCH...*\n\n_Syncing your phonebook from WhatsApp servers. This may take a moment..._` }, { quoted: mek });

        try {
            // 🔥 THE FORCE HACK: Pull ALL contacts directly from WhatsApp
            // Instead of relying on empty store.contacts, we ask WhatsApp for the full list
            const contacts = await conn.onWhatsApp();
            
            if (!contacts || contacts.length === 0) {
                return conn.sendMessage(chatId, { 
                    text: `❌ *No contacts returned from WhatsApp.*\n\nThis usually means the bot's session is still syncing. Wait 2 minutes and try again.\n\n${settings.footer}` 
                }, { quoted: mek });
            }

            // Filter only valid @s.whatsapp.net contacts
            const targetJids = contacts
                .filter(c => c.exists && c.jid && c.jid.endsWith('@s.whatsapp.net'))
                .map(c => c.jid);

            await conn.sendMessage(chatId, { 
                text: `👁️ _Found ${targetJids.length} contacts on WhatsApp. Starting scan..._` 
            });

            const emojis = Array.isArray(settings.statusReactionEmojis) && settings.statusReactionEmojis.length > 0 
                ? settings.statusReactionEmojis 
                : ['🔥', '❤️', '😍', '👑', '✨', '💯'];

            let viewedCount = 0;
            let reactedCount = 0;
            let checkedCount = 0;

            // Loop through EVERY contact
            for (const jid of targetJids) {
                checkedCount++;
                
                if (checkedCount % 50 === 0) {
                    await conn.sendMessage(chatId, { 
                        text: `👁️ _Scanned ${checkedCount}/${targetJids.length}... (Viewed: ${viewedCount})_` 
                    });
                }

                try {
                    // 🔥 FORCE FETCH: Check if they have a status
                    const statuses = await conn.fetchStatus(jid);
                    
                    if (statuses && statuses.length > 0) {
                        for (const status of statuses) {
                            try {
                                // 1. View
                                await conn.readMessages([status.key]);
                                viewedCount++;

                                // 2. React
                                const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                                await conn.relayMessage('status@broadcast', {
                                    reactionMessage: {
                                        key: status.key,
                                        text: randomEmoji,
                                        senderTimestampMs: Date.now()
                                    }
                                }, {
                                    messageId: status.key.id,
                                    statusJidList: [jid, conn.user.id.split(':')[0] + '@s.whatsapp.net']
                                });
                                reactedCount++;

                                await new Promise(r => setTimeout(r, 500));
                            } catch (e) {}
                        }
                    }
                } catch (e) {
                    // Ignore privacy blocks
                }
                
                // Tiny delay to avoid rate-limit ban
                await new Promise(r => setTimeout(r, 150));
            }

            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
            await conn.sendMessage(chatId, { 
                text: `✅ *FORCE VIEW COMPLETE*\n\n📇 Contacts Scanned: ${checkedCount}\n👁️ Statuses Viewed: ${viewedCount}\n💥 Reactions Sent: ${reactedCount}\n\n${settings.footer}` 
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