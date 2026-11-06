const settings = require('../../settings');
const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'sfake',
    aliases: ['verifiedstatus', 'bluetick'],
    category: 'status',
    description: 'Post a status with a fake verified blue tick',
    usage: '.sfake <text>',
    ownerOnly: true,
    react: '💙',
    async execute(conn, mek, args, chatId) {
        const text = args.join(' ');
        if (!text) return conn.sendMessage(chatId, { text: '❌ Provide text.' });

        try {
            // Inject the verified property into the status message
            const msg = generateWAMessageFromContent('status@broadcast', {
                extendedTextMessage: {
                    text: text,
                    contextInfo: {
                        verifiedName: settings.botName || 'NEXORA MD' // This triggers the blue tick
                    }
                }
            }, { userJid: conn.user.id });

            await conn.relayMessage('status@broadcast', msg.message, { 
                messageId: msg.key.id,
                statusJidList: [conn.user.id] 
            });
            
            await conn.sendMessage(chatId, { text: '💙 Verified Status posted!' }, { quoted: mek });
        } catch (e) {
            conn.sendMessage(chatId, { text: '❌ Failed to post verified status.' });
        }
    }
};