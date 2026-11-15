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
        await conn.sendMessage(chatId, { text: `👁️ *FORCING STATUS FETCH...*\n\n_Gathering contacts from recent chats..._` }, { quoted: mek });

        try {
            // 🔥 THE FIX: We gather JIDs from the store.messages (recent chats) 
            // instead of relying on store.contacts which takes time to sync.
            const jidSet = new Set();

            // 1. Get JIDs from recent messages
            if (store.messages) {
                for (const chatId of Object.keys(store.messages)) {
                    if (chatId.endsWith('@s.whatsapp.net')) {
                        jidSet.add(chatId);
                    } else if (chatId.endsWith('@g.us')) {
                        // If it's a group, pull the participants from the group metadata
                        try {
                            const meta = await conn.groupMetadata(chatId);
                            for (const p of meta.participants) {
                                if (p.id.endsWith('@s.whatsapp.net')) {
                                    jidSet.add(p.id);
                                }
                            }
                        } catch (e) {}
                    }
                }
            }

            // 2. Also add anyone in the contacts store (if any synced)
            if (store.contacts) {
                for (const jid of Object.keys(store.contacts)) {
                    if (jid.endsWith('@s.whatsapp.net')) jidSet.add(jid);
                }
            }

            const targetJids = Array.from(jidSet);

            if (targetJids.length === 0) {
                return conn.sendMessage(chatId, { 
                    text: `❌ *No recent contacts found.*\n\nSend a message to someone or open a group, then try again in 1 minute.\n\n${settings.footer}` 
                }, { quoted: mek });
            }

            await conn.sendMessage(chatId, { 
                text: `👁️ _Found ${targetJids.length} contacts. Starting force-fetch..._` 
            });

            const emojis = Array.isArray(settings.statusReactionEmojis) && settings.statusReactionEmojis.length > 0 
                ? settings.statusReactionEmojis 
                : ['🔥', '❤️', '😍', '👑', '✨', '💯'];

            let viewedCount = 0;
            let reactedCount = 0;
            let checkedCount = 0;

            // 3. Loop through contacts and force fetch status
            for (const jid of targetJids) {
                checkedCount++;
                
                if (checkedCount % 20 === 0) {
                    await conn.sendMessage(chatId, { 
                        text: `👁️ _Scanned ${checkedCount}/${targetJids.length} contacts... (Viewed: ${viewedCount})_` 
                    });
                }

                try {
                    // 🔥 FORCE FETCH
                    const statuses = await conn.fetchStatus(jid);
                    
                    if (statuses && statuses.length > 0) {
                        for (const status of statuses) {
                            try {
                                // Mark viewed
                                await conn.readMessages([status.key]);
                                viewedCount++;

                                // React
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
                
                // Tiny delay between contacts to prevent rate-limit ban
                await new Promise(r => setTimeout(r, 100));
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