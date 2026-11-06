const settings = require('../../settings');

module.exports = {
    name: 'gstatus',
    aliases: ['groupstatus'],
    category: 'status',
    description: 'Post a status to a specific group',
    usage: '.gstatus <group_jid> <text>',
    ownerOnly: true,
    react: '🎭',
    async execute(conn, mek, args, chatId) {
        const groupJid = args[0];
        const text = args.slice(1).join(' ');
        if (!groupJid || !text) return conn.sendMessage(chatId, { text: `❌ Usage: .gstatus 123456@g.us Hello` });
        
        try {
            await conn.sendMessage('status@broadcast', { text }, { statusJidList: [groupJid] });
            await conn.sendMessage(chatId, { text: '✅ Group status posted!' }, { quoted: mek });
        } catch (e) { conn.sendMessage(chatId, { text: '❌ Failed.' }); }
    }
};