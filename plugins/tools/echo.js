const settings = require('../../settings');
const logger = require('../../lib/logger');
const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'echo',
    aliases: ['spoof', 'ghostwrite'],
    category: 'tools',
    description: 'Make it look like someone else texted you',
    usage: '.echo <text>',
    ownerOnly: true,
    react: '🎭',

    async execute(conn, mek, args, chatId) {
        const text = args.join(' ');

        if (!text) {
            return conn.sendMessage(chatId, { 
                text: `❌ Provide the text you want to fake.\n\nExample: ${settings.prefix}echo I miss you\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        // We need to know WHO we are faking. Reply to their message to get their JID.
        const quotedContext = mek.message?.extendedTextMessage?.contextInfo;
        const targetJid = quotedContext?.participant;

        if (!targetJid) {
            return conn.sendMessage(chatId, { 
                text: `❌ Reply to the person's message so I know who to fake.\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });

        try {
            // 1. Get the target's profile name
            let targetName = 'Unknown';
            try {
                targetName = await conn.getName(targetJid) || targetJid.split('@')[0];
            } catch (e) {
                targetName = targetJid.split('@')[0];
            }

            // 2. Build a spoofed message
            // The `userJid` is set to the target so the UI shows THEIR profile picture.
            const botJid = conn.user.id.split(':')[0] + '@s.whatsapp.net';
            
            const message = generateWAMessageFromContent(chatId, {
                extendedTextMessage: {
                    text: text,
                    contextInfo: {
                        // Spoof the participant
                        participant: targetJid,
                        remoteJid: chatId
                    }
                }
            }, { 
                userJid: targetJid, // 🔥 This fakes the sender
                messageId: '3EB0' + Math.random().toString(36).substring(2, 18).toUpperCase(),
                pushName: targetName
            });

            // 3. Send it directly to your chat
            await conn.relayMessage(chatId, message.message, { messageId: message.key.id });

            await conn.sendMessage(chatId, { 
                text: `✅ *Echo Sent!*\n\nYour phone should now show a message from @${targetName} saying "${text}".\n\n${settings.footer}`, 
                mentions: [targetJid] 
            }, { quoted: mek });
            
            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (error) {
            logger.error(`[ECHO] Error: ${error.message}`);
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
            await conn.sendMessage(chatId, { 
                text: `❌ *Echo Failed:* ${error.message}\n\n${settings.footer}` 
            }, { quoted: mek });
        }
    }
};