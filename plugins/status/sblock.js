const settings = require('../../settings');

module.exports = {
    name: 'sblock',
    aliases: ['hidestatus'],
    category: 'status',
    description: 'Hide your status from a specific number',
    usage: '.sblock <number>',
    ownerOnly: true,
    react: '🛡️',
    async execute(conn, mek, args, chatId) {
        const num = (args[0] || '').replace(/[^0-9]/g, '');
        if (!num) return conn.sendMessage(chatId, { text: '❌ Provide a number.' });
        
        try {
            // Uses Baileys internal privacy API
            await conn.updateStatusPrivacy({
                type: 'contact_blacklist',
                list: [num + '@s.whatsapp.net']
            });
            await conn.sendMessage(chatId, { text: `🛡️ +${num} can no longer see your statuses.` }, { quoted: mek });
        } catch (e) {
            await conn.sendMessage(chatId, { text: '❌ Failed to update privacy settings.' });
        }
    }
};