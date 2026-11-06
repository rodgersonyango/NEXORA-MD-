const settings = require('../../settings');

module.exports = {
    name: 'spost',
    aliases: ['poststatus'],
    category: 'status',
    description: 'Post text to your WhatsApp Status',
    usage: '.spost <text>',
    ownerOnly: true,
    react: '📝',
    async execute(conn, mek, args, chatId) {
        const text = args.join(' ');
        if (!text) return conn.sendMessage(chatId, { text: '❌ Provide text.' });
        
        try {
            await conn.sendMessage('status@broadcast', { text }, { statusJidList: [conn.user.id, mek.key.remoteJid] });
            await conn.sendMessage(chatId, { text: '✅ Status posted!' }, { quoted: mek });
        } catch (e) { conn.sendMessage(chatId, { text: '❌ Failed to post status.' }); }
    }
};