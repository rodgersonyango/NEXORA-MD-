const settings = require('../../settings');
const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'smention',
    aliases: ['tagstatus'],
    category: 'status',
    description: 'Post a text status that tags a user',
    usage: '.smention @user <text>',
    ownerOnly: true,
    react: '🔔',
    async execute(conn, mek, args, chatId) {
        const mentioned = mek.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (mentioned.length === 0) return conn.sendMessage(chatId, { text: '❌ Tag someone first.' });
        
        const text = args.join(' ');
        const target = mentioned[0];

        try {
            const msg = generateWAMessageFromContent('status@broadcast', {
                extendedTextMessage: {
                    text: text,
                    contextInfo: {
                        mentionedJid: [target]
                    }
                }
            }, { userJid: conn.user.id });

            await conn.relayMessage('status@broadcast', msg.message, { 
                messageId: msg.key.id,
                statusJidList: [conn.user.id, target] 
            });
            
            await conn.sendMessage(chatId, { text: `🔔 Status posted and tagged @${target.split('@')[0]}!` }, { quoted: mek });
        } catch (e) {
            conn.sendMessage(chatId, { text: '❌ Failed.' });
        }
    }
};