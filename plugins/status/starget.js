const settings = require('../../settings');

module.exports = {
    name: 'starget',
    aliases: ['targetstatus'],
    category: 'status',
    description: 'Post a status visible to only ONE person',
    usage: '.starget <number> <text>',
    ownerOnly: true,
    react: '🎯',
    async execute(conn, mek, args, chatId) {
        const num = (args[0] || '').replace(/[^0-9]/g, '');
        const text = args.slice(1).join(' ');
        
        if (!num || !text) return conn.sendMessage(chatId, { text: '❌ Usage: .starget 2547... Hello' });

        try {
            const targetJid = num + '@s.whatsapp.net';
            
            // Send the status ONLY to the target and yourself
            await conn.sendMessage('status@broadcast', { text }, { 
                statusJidList: [conn.user.id, targetJid] 
            });
            
            await conn.sendMessage(chatId, { text: `🎯 Status posted! Only +${num} can see it.` }, { quoted: mek });
        } catch (e) {
            conn.sendMessage(chatId, { text: '❌ Failed to target status.' });
        }
    }
};