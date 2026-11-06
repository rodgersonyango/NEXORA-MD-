const settings = require('../../settings');

module.exports = {
    name: 'sreply',
    aliases: ['autoreplystatus'],
    category: 'status',
    description: 'Auto-reply to specific people\'s statuses',
    usage: '.sreply set <number> <message>',
    ownerOnly: true,
    react: '🗣️',
    async execute(conn, mek, args, chatId) {
        if (args[0] === 'set' && args[1] && args[2]) {
            if (!global.statusReplies) global.statusReplies = {};
            const num = args[1].replace(/[^0-9]/g, '');
            global.statusReplies[num] = args.slice(2).join(' ');
            await conn.sendMessage(chatId, { text: `🗣️ Will auto-reply "${global.statusReplies[num]}" to +${num}'s statuses.` }, { quoted: mek });
        } else {
            conn.sendMessage(chatId, { text: '❌ Usage: .sreply set <number> <message>' });
        }
    }
};