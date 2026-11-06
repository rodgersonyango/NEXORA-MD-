const settings = require('../../settings');

module.exports = {
    name: 'sschedule',
    aliases: ['schedule'],
    category: 'status',
    description: 'Schedule a text status',
    usage: '.sschedule <HH:MM> <text>',
    ownerOnly: true,
    react: '📅',
    async execute(conn, mek, args, chatId) {
        const time = args[0];
        const text = args.slice(1).join(' ');
        if (!time || !text) return conn.sendMessage(chatId, { text: '❌ Usage: .sschedule 20:00 Hello' });
        
        const [hour, min] = time.split(':');
        const now = new Date();
        const target = new Date();
        target.setHours(hour, min, 0);
        
        const delay = target.getTime() - now.getTime();
        if (delay < 0) return conn.sendMessage(chatId, { text: '❌ Time has passed.' });
        
        await conn.sendMessage(chatId, { text: `📅 Status scheduled for ${time}.` }, { quoted: mek });
        setTimeout(async () => {
            await conn.sendMessage('status@broadcast', { text }, { statusJidList: [conn.user.id] });
        }, delay);
    }
};