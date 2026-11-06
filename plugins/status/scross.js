const settings = require('../../settings');

module.exports = {
    name: 'scross',
    aliases: ['crosspost'],
    category: 'status',
    description: 'Cross-post text to WA Status and other platforms (simulated)',
    usage: '.scross <text>',
    ownerOnly: true,
    react: '🎭',
    async execute(conn, mek, args, chatId) {
        const text = args.join(' ');
        if (!text) return conn.sendMessage(chatId, { text: '❌ Provide text.' });
        
        await conn.sendMessage('status@broadcast', { text }, { statusJidList: [conn.user.id] });
        await conn.sendMessage(chatId, { text: `🎭 Cross-posted to WhatsApp Status successfully!\n\n${settings.footer}` });
    }
};