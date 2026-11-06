const settings = require('../../settings');
const logger = require('../../lib/logger');
const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'send',
    aliases: ['sendmsg', 'otp'],
    category: 'owner',
    description: 'Send a message spoofed as an OTP sender',
    usage: '.send <number> <sender_name> <message>',
    ownerOnly: true,
    react: '📨',

    async execute(conn, mek, args, chatId, isOwner) {
        if (!isOwner) return;

        if (args.length < 3) {
            return conn.sendMessage(chatId, { 
                text: `📨 *Usage:*\n${settings.prefix}send <number> <sender_name> <message>\n\n*Example:*\n${settings.prefix}send 254712345678 4444 Your OTP is 8291\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        // 1. Get the target number, sender name (OTP), and message
        const rawNum = args[0].replace(/[^0-9]/g, '');
        const senderName = args[1];
        const messageText = args.slice(2).join(' ');

        if (rawNum.length < 10) {
            return conn.sendMessage(chatId, { text: `❌ Invalid number. Make sure to include the country code.` }, { quoted: mek });
        }

        const targetJid = rawNum + '@s.whatsapp.net';
        
        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });

        try {
            // 2. Create the message with a spoofed Push Name
            const message = generateWAMessageFromContent(targetJid, {
                extendedTextMessage: {
                    text: messageText,
                    contextInfo: {
                        remoteJid: targetJid,
                        participant: targetJid,
                        // Add a verified badge look (optional, but might not render if they don't follow the channel)
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363199061392782@newsletter', // Replace with your channel JID
                            newsletterName: senderName, // This makes it look like it came from the channel
                            serverMessageId: -1
                        }
                    }
                }
            }, { 
                userJid: conn.user.id,
                // 🔥 THIS IS THE SPOOF: The name that appears above the message
                pushName: senderName 
            });

            // 3. Send it
            await conn.relayMessage(targetJid, message.message, { messageId: message.key.id });

            // 4. Confirm to the owner
            await conn.sendMessage(chatId, { 
                text: `✅ *Message Sent!*\n\n*To:* +${rawNum}\n*Spoofed Sender:* ${senderName}\n*Message:* ${messageText}` 
            }, { quoted: mek });
            
            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (error) {
            logger.error(`[SEND] Error: ${error.message}`);
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
            await conn.sendMessage(chatId, { 
                text: `❌ Failed to send message: ${error.message}\n\n${settings.footer}` 
            }, { quoted: mek });
        }
    }
};