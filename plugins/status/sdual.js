const settings = require('../../settings');
const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');
const logger = require('../../lib/logger');

module.exports = {
    name: 'sdual',
    aliases: ['duostatus', 'jointstatus'],
    category: 'status',
    description: 'Post a status that looks like it was posted by two people',
    usage: '.sdual @user <text>',
    ownerOnly: true,
    react: '👥',

    async execute(conn, mek, args, chatId) {
        // 1. Get the tagged user
        const mentioned = mek.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        
        if (mentioned.length === 0) {
            return conn.sendMessage(chatId, { 
                text: `❌ Tag one person to create a Dual Status.\nExample: ${settings.prefix}sdual @john We are live!\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        const target = mentioned[0];
        const text = args.filter(a => !a.includes('@')).join(' ') || '📌 Joint Status';
        const botJid = conn.user.id.split(':')[0] + '@s.whatsapp.net';

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `👥 *Creating Dual Status...*` }, { quoted: mek });

        try {
            // 2. Build the message protocol
            // We trick the UI by providing a "remoteJid" that isn't status@broadcast,
            // and injecting a fake participant array.
            const message = generateWAMessageFromContent('status@broadcast', {
                extendedTextMessage: {
                    text: text,
                    contextInfo: {
                        mentionedJid: [target],
                        // 🔥 THE HACK: Force dual-avatar rendering
                        remoteJid: target,
                        participant: target,
                        // This makes WhatsApp think the status belongs to a "group" of 2
                        isGroup: true,
                        groupSubject: `${conn.user.name || 'You'} & ${target.split('@')[0]}`
                    }
                }
            }, { userJid: botJid });

            // 3. Relay the status
            await conn.relayMessage('status@broadcast', message.message, {
                messageId: message.key.id,
                statusJidList: [botJid, target]
            });

            await conn.sendMessage(chatId, { 
                text: `✅ *Dual Status Posted!*\n\nYour status now looks like it was posted by you and @${target.split('@')[0]} together.\n\n${settings.footer}`, 
                mentions: [target]
            }, { quoted: mek });

            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (error) {
            logger.error(`[SDUAL] Error: ${error.message}`);
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
            await conn.sendMessage(chatId, { 
                text: `❌ Failed: ${error.message}\n\n${settings.footer}` 
            }, { quoted: mek });
        }
    }
};