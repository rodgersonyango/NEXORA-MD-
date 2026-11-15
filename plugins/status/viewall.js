const settings = require('../../settings');
const logger = require('../../lib/logger');
const store = require('../../lib/lightweight_store');

module.exports = {
    name: 'viewall',
    aliases: ['seeall', 'clearstatus', 'forceview'],
    category: 'status',
    description: 'Autosync all possible contacts and view statuses',
    usage: '.viewall',
    ownerOnly: true,
    react: '👁️',

    async execute(conn, mek, args, chatId) {
        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `👁️ *AUTOSYNCING...*\n\n_Pulling contacts from chats, groups, and cache..._` }, { quoted: mek });

        try {
            let contactJids = new Set();

            // 1. Get from recent chats
            if (store.messages) {
                for (const chatId of Object.keys(store.messages)) {
                    if (chatId.endsWith('@s.whatsapp.net')) {
                        contactJids.add(chatId);
                    }
                }
            }

            // 2. Get from contacts store
            if (store.contacts) {
                for (const jid of Object.keys(store.contacts)) {
                    if (jid.endsWith('@s.whatsapp.net')) contactJids.add(jid);
                }
            }

            // 3. 🔥 FORCE FETCH ALL GROUPS (This is the magic)
            await conn.sendMessage(chatId, { text: `📡 _Fetching groups from server..._` });
            try {
                const groups = await conn.groupFetchAllParticipating();
                for (const groupId of Object.keys(groups)) {
                    const group = groups[groupId];
                    if (group.participants) {
                        for (const p of group.participants) {
                            if (p.id.endsWith('@s.whatsapp.net')) contactJids.add(p.id);
                        }
                    }
                }
            } catch (e) {
                logger.warn(`[VIEWALL] Group fetch failed: ${e.message}`);
            }

            const targetJids = Array.from(contactJids);

            if (targetJids.length === 0) {
                return conn.sendMessage(chatId, { 
                    text: `❌ *No contacts found.*\n\nYou must be in at least 1 WhatsApp group or have recent chats for the bot to sync.\n\n${settings.footer}` 
                }, { quoted: mek });
            }

            await conn.sendMessage(chatId, { 
                text: `✅ _Synced ${targetJids.length} contacts. Starting scan..._` 
            });

            const emojis = Array.isArray(settings.statusReactionEmojis) && settings.statusReactionEmojis.length > 0 
                ? settings.statusReactionEmojis 
                : ['🔥', '❤️', '😍', '👑', '✨', '💯'];

            let viewedCount = 0;
            let reactedCount = 0;
            let checkedCount = 0;

            for (const jid of targetJids) {
                checkedCount++;
                
                if (checkedCount % 20 === 0) {
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
                
                await new Promise(r => setTimeout(r, 100));
            }

            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
            await conn.sendMessage(chatId, { 
                text: `✅ *VIEWALL COMPLETE*\n\n📇 Contacts Found: ${targetJids.length}\n👁️ Statuses Viewed: ${viewedCount}\n💥 Reactions Sent: ${reactedCount}\n\n${settings.footer}` 
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