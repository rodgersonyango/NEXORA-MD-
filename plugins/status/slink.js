const settings = require('../../settings');

module.exports = {
    name: 'slink',
    aliases: ['statuslink'],
    category: 'status',
    description: 'Post a status with a clickable link (simulated)',
    usage: '.slink <text> <url>',
    ownerOnly: true,
    react: '💸',
    async execute(conn, mek, args, chatId) {
        const url = args.pop();
        const text = args.join(' ');
        if (!text || !url) return conn.sendMessage(chatId, { text: '❌ Usage: .slink Buy my stuff https://link.com' });
        
        const finalText = `${text}\n\n👉 ${url}`;
        await conn.sendMessage('status@broadcast', { text: finalText }, { statusJidList: [conn.user.id] });
        await conn.sendMessage(chatId, { text: '💸 Status with link posted!' }, { quoted: mek });
    }
};