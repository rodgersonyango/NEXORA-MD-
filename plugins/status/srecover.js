const settings = require('../../settings');

module.exports = {
    name: 'srecover',
    aliases: ['recoverstatus'],
    category: 'status',
    description: 'Auto-recovers deleted statuses',
    usage: '.srecover on',
    ownerOnly: true,
    react: '🚨',
    async execute(conn, mek, args, chatId) {
        if (args[0] === 'on') {
            global.recoverStatus = true;
            await conn.sendMessage(chatId, { text: '🚨 Status Recovery ENABLED. Deleted statuses will be sent to your DM.' }, { quoted: mek });
        } else {
            global.recoverStatus = false;
            await conn.sendMessage(chatId, { text: 'Status Recovery DISABLED.' }, { quoted: mek });
        }
    }
};