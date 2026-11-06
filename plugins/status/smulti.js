const settings = require('../../settings');
const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'smulti',
    aliases: ['multitag', 'ghosttag'],
    category: 'status',
    description: 'Post a status that shows multiple tagged users at the top',
    usage: '.smulti @user1 @user2 <text>',
    ownerOnly: true,
    react: '👥',

    async execute(conn, mek, args, chatId) {
        // 1. Get mentioned users
        const mentioned = mek.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        
        if (mentioned.length < 2) {
            return conn.sendMessage(chatId, { 
                text: `❌ You need to tag at least 2 people to trigger the "See more" UI.\n\nExample:\n${settings.prefix}smulti @john @mary Check this out!\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        const text = args.filter(a => !a.includes('@')).join(' ');
        
        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `👥 *Injecting Multi-Tag Status...*` }, { quoted: mek });

        try {
            // 2. Build the message with the special groupMentions context
            // This is what tricks WhatsApp into showing "Bot + 2 others"
            const botJid = conn.user.id.split(':')[0] + '@s.whatsapp.net';
            
            const message = generateWAMessageFromContent('status@broadcast', {
                extendedTextMessage: {
                    text: text || '📌 Status Update',
                    contextInfo: {
                        mentionedJid: mentioned,
                        // 🔥 THE HACK: Group Mentions array
                        groupMentions: mentioned.map(jid => ({
                            groupJid: jid,
                            groupSubject: 'Tagged'
                        })),
                        // This forces the "See more" button
                        expiration: 0,
                        ephemeralExpiration: 86400
                    }
                }
            }, { userJid: botJid });

            // 3. Relay the status
            await conn.relayMessage('status@broadcast', message.message, {
                messageId: message.key.id,
                statusJidList: [botJid, ...mentioned]
            });

            await conn.sendMessage(chatId, { 
                text: `✅ *Multi-Tag Status Posted!*\n\nTagged: ${mentioned.length} users\n\nThe status will now show "Bot Name + ${mentioned.length - 1} others" at the top.\n\n${settings.footer}` 
            }, { quoted: mek });

            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (error) {
            logger.error(`[SMULTI] Error: ${error.message}`);
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
            await conn.sendMessage(chatId, { 
                text: `❌ Failed to post: ${error.message}\n\n${settings.footer}` 
            }, { quoted: mek });
        }
    }
};