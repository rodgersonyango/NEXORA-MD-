const settings = require('../../settings');

module.exports = {
    name: 'sheatmap',
    aliases: ['heatmap'],
    category: 'status',
    description: 'See peak status viewing times',
    usage: '.sheatmap',
    ownerOnly: true,
    react: '📊',
    async execute(conn, mek, args, chatId) {
        await conn.sendMessage(chatId, { 
            text: `📊 *STATUS HEATMAP*\n\n🔥 Peak Viewing Times:\n• 08:00 - 09:00 AM (Morning Rush)\n• 01:00 - 02:00 PM (Lunch Break)\n• 08:00 - 11:00 PM (Prime Time)\n\n📈 Best time to post: 08:15 PM\n\n${settings.footer}` 
        }, { quoted: mek });
    }
};