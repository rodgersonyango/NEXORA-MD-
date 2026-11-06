const settings = require('../../settings');

module.exports = {
    name: 'scountdown',
    aliases: ['timerstatus'],
    category: 'status',
    description: 'Post a status that updates every hour',
    usage: '.scountdown <text> <hours>',
    ownerOnly: true,
    react: '⏱️',
    async execute(conn, mek, args, chatId) {
        const hours = parseInt(args.pop());
        const text = args.join(' ');
        
        if (!text || isNaN(hours)) return conn.sendMessage(chatId, { text: '❌ Usage: .scountdown <text> <hours>' });

        await conn.sendMessage(chatId, { text: `⏱️ Countdown started for ${hours} hours!` }, { quoted: mek });
        
        let remaining = hours;
        const interval = setInterval(async () => {
            if (remaining <= 0) return clearInterval(interval);
            
            try {
                await conn.sendMessage('status@broadcast', { 
                    text: `${text}\n\n⏱️ Time remaining: ${remaining} hours.` 
                }, { statusJidList: [conn.user.id] });
            } catch (e) {}
            
            remaining--;
        }, 60 * 60 * 1000); // Every 1 hour
    }
};