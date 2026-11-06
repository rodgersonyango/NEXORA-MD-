const settings = require('../../settings');
const logger = require('../../lib/logger');
const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'premium',
    aliases: ['ghostmsg', 'invis', 'fakeforward'],
    category: 'tools',
    description: 'Send a blank message or force a "Forwarded many times" tag',
    usage: '.premium <blank|forward> <number> <text>',
    react: '👑',

    async execute(conn, mek, args, chatId, isOwner) {
        const mode = (args[0] || '').toLowerCase();
        let targetNum = '';
        let text = '';

        if (mode === 'blank' || mode === 'forward') {
            // Check if the next argument is a number
            if (args[1] && /^\d{10,15}$/.test(args[1].replace(/[^0-9]/g, ''))) {
                targetNum = args[1].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                text = args.slice(2).join(' ');
            } else {
                // If no number provided, send to the current chat
                targetNum = chatId;
                text = args.slice(1).join(' ');
            }
        }

        if (!mode || !['blank', 'forward'].includes(mode)) {
            return conn.sendMessage(chatId, { 
                text: `👑 *PREMIUM HACKS*\n\n` +
                      `1. *Invisible Message*\n${settings.prefix}premium blank <number>\n_(Sends a blank message to the number)_\n\n` +
                      `2. *Fake Forward*\n${settings.prefix}premium forward <number> <text>\n_(Makes your message look forwarded many times)_\n\n` +
                      `_If you don't type a number, it sends to the current chat._\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });

        try {
            if (mode === 'blank') {
                // The Invisible Character (Hangul Filler)
                const invisibleChar = '\u3164'; 
                
                await conn.sendMessage(targetNum, { text: invisibleChar });
                
                if (targetNum !== chatId) {
                    await conn.sendMessage(chatId, { text: `✅ Blank message sent to +${targetNum.split('@')[0]}` });
                }
                await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
                return;
            }

            if (mode === 'forward') {
                if (!text) {
                    return conn.sendMessage(chatId, { text: `❌ Provide text to forward. Example: ${settings.prefix}premium forward 254712345678 Hello World` }, { quoted: mek });
                }

                // Fake Forwarded Tag
                const message = generateWAMessageFromContent(targetNum, {
                    extendedTextMessage: {
                        text: text,
                        contextInfo: {
                            forwardingScore: 999, 
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: '120363199061392782@newsletter',
                                newsletterName: 'NEXORA PREMIUM',
                                serverMessageId: -1
                            }
                        }
                    }
                }, { userJid: conn.user.id });

                await conn.relayMessage(targetNum, message.message, { messageId: message.key.id });

                if (targetNum !== chatId) {
                    await conn.sendMessage(chatId, { text: `✅ Forwarded message sent to +${targetNum.split('@')[0]}` });
                }
                await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
                return;
            }

        } catch (error) {
            logger.error(`[PREMIUM] Error: ${error.message}`);
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
            await conn.sendMessage(chatId, { 
                text: `❌ Hack failed: ${error.message}\n\n${settings.footer}` 
            }, { quoted: mek });
        }
    }
};