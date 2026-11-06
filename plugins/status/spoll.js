const settings = require('../../settings');

module.exports = {
    name: 'spoll',
    aliases: ['statuspoll'],
    category: 'status',
    description: 'Create a status poll',
    usage: '.spoll <question> | <option1> | <option2>',
    ownerOnly: true,
    react: '🗳️',
    async execute(conn, mek, args, chatId) {
        const input = args.join(' ');
        const parts = input.split('|').map(p => p.trim());
        
        if (parts.length < 3) return conn.sendMessage(chatId, { text: '❌ Format: .spoll Question | Opt1 | Opt2' });
        
        const [question, opt1, opt2] = parts;
        const text = `🗳️ *STATUS POLL*\n\n${question}\n\nReply with 1 for: ${opt1}\nReply with 2 for: ${opt2}`;
        
        await conn.sendMessage('status@broadcast', { text }, { statusJidList: [conn.user.id] });
        await conn.sendMessage(chatId, { text: '🗳️ Poll posted to status!' }, { quoted: mek });
    }
};