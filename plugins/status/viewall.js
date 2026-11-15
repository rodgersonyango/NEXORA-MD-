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
        await conn.sendMessage(chatId, { text: `👁️ *FORCING STATUS FETCH...*\n\n_Syncing phonebook..._` }, { quoted: mek });

        try {
            // 🔥 THE FIX: Force the bot to resync your contacts with WhatsApp
            // This tells WhatsApp "Send me all my contacts now"
            await conn.resyncAppState(['critical_unblock_low', 'regular_low'], false).catch(() => {});
            
            // Wait 5 seconds for the sync to finish
            await new Promise(r => setTimeout(r, 5000));

            // Now check the store again
            const contacts = Object.keys(store.contacts || {});
            const targetJids = contacts.filter(jid => jid.endsWith('@s.whatsapp.net'));

            if (targetJids.length === 0) {
                return conn.sendMessage(chatId, { 
                    text: `❌ *Still no contacts in store.*\n\nThis means your bot's session doesn't have phonebook permission. You need to open WhatsApp on the bot's phone and manually sync contacts once.\n\n${settings.footer}` 
                }, { quoted: mek });
            }

            await conn.sendMessage(chatId, { 
                text: `👁️ _Synced ${targetJids.length} contacts. Starting scan..._` 
            });

            const emojis = Array.isArray(settings.statusReactionEmojis) && settings.statusReactionEmojis.length > 0 
                ? settings.statusReactionEmojis 
                : ['🔥', '❤️', '😍', '👑', '✨', '💯'];

            let viewedCount = 0;
            let reactedCount = 0;
            let checkedCount = 0;

            for (const jid of targetJids) {
                checkedCount++;
                
                if (checkedCount % 50 === 0) {
                    await conn.sendMessage(chatId, { 
                        text: `👁️ _Scanned ${checkedCount}/${targetJids.length}... (Viewed: ${viewedCount})_` 
                    });
                }

                try {
                    const statuses = await conn.fetchStatus(jid);
                    
                    if (statuses && statuses.length > 0) {
                        for (const status of statuses) {
                            try {
                                await conn.readMessages([status.key]);
                                viewedCount++;

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
                } catch (e) {}
                
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