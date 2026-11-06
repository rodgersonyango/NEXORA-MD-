const settings = require('../../settings');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'sreact',
    aliases: ['statusreact', 'sburst'],
    category: 'status',
    description: 'React to a status with multiple emojis at once',
    usage: 'Reply to a status with .sreact 🔥❤️😂',
    react: '💥',
    async execute(conn, mek, args, chatId) {
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const statusKey = mek.message?.extendedTextMessage?.contextInfo?.stanzaId;
        const statusSender = mek.message?.extendedTextMessage?.contextInfo?.participant;

        if (!quoted || !statusKey || !statusSender) {
            return conn.sendMessage(chatId, { text: '❌ Reply to a status to react.' }, { quoted: mek });
        }

        const emojis = args.length > 0 ? args : ['🔥', '❤️', '😂', '💯', '👑'];
        const statusAuthorJid = statusSender.includes('@') ? statusSender : statusSender + '@s.whatsapp.net';
        
        await conn.sendMessage(chatId, { text: `💥 *Firing ${emojis.length} reactions...*` }, { quoted: mek });

        for (const emoji of emojis) {
            try {
                await conn.relayMessage('status@broadcast', {
                    reactionMessage: {
                        key: {
                            remoteJid: 'status@broadcast',
                            fromMe: false,
                            id: statusKey,
                            participant: statusAuthorJid
                        },
                        text: emoji,
                        senderTimestampMs: Date.now()
                    }
                }, {
                    messageId: '3EB0' + Math.random().toString(36).substring(2, 18).toUpperCase(),
                    statusJidList: [statusAuthorJid, conn.user.id.split(':')[0] + '@s.whatsapp.net']
                });
                await new Promise(r => setTimeout(r, 300)); // 300ms delay to avoid spam detection
            } catch (e) {}
        }
        
        await conn.sendMessage(chatId, { text: '✅ Reactions sent!' }, { quoted: mek });
    }
};