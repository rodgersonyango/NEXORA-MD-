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
        await conn.sendMessage(chatId, { text: `👁️ *FORCING STATUS FETCH...*\n\n_This may take up to 60 seconds. Please wait..._` }, { quoted: mek });

        try {
            // 1. Get all contacts from the store
            const contacts = Object.keys(store.contacts || {});
            const targetJids = contacts.filter(jid => jid.endsWith('@s.whatsapp.net'));

            if (targetJids.length === 0) {
                return conn.sendMessage(chatId, { text: `❌ No contacts found.` });
            }

            const emojis = Array.isArray(settings.statusReactionEmojis) && settings.statusReactionEmojis.length > 0 
                ? settings.statusReactionEmojis 
                : ['🔥', '❤️', '😍', '👑', '✨', '💯'];

            let viewedCount = 0;
            let reactedCount = 0;
            let checkedCount = 0;

            // 2. Loop through every contact
            for (const jid of targetJids) {
                checkedCount++;
                
                // 🔥 UPDATE: Show progress every 50 contacts so you know it's working
                if (checkedCount % 50 === 0) {
                    await conn.sendMessage(chatId, { 
                        text: `👁️ _Scanned ${checkedCount}/${targetJids.length} contacts..._` 
                    });
                }

                try {
                    // 🔥 THE FORCE HACK: Fetch the latest status for this contact
                    // This forces WhatsApp to send the status packet to the bot
                    const statuses = await conn.fetchStatus(jid);
                    
                    if (statuses && statuses.length > 0) {
                        for (const status of statuses) {
                            try {
                                // 3. Mark as viewed
                                await conn.readMessages([status.key]);
                                viewedCount++;

                                // 4. React
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

                                // Delay to avoid spam ban
                                await new Promise(r => setTimeout(r, 500));
                            } catch (e) {}
                        }
                    }
                } catch (e) {
                    // Ignore if they have no status or privacy blocks
                }
            }

            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
            await conn.sendMessage(chatId, { 
                text: `✅ *FORCE VIEW COMPLETE*\n\n👁️ Scanned: ${checkedCount} contacts\n👁️ Statuses Viewed: ${viewedCount}\n💥 Reactions Sent: ${reactedCount}\n\n${settings.footer}` 
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