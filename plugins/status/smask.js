const settings = require('../../settings');

module.exports = {
    name: 'smask',
    aliases: ['ghoststatus'],
    category: 'status',
    description: 'Toggle invisible status viewing',
    usage: '.smask on',
    ownerOnly: true,
    react: '🕶️',
    async execute(conn, mek, args, chatId) {
        if (args[0] === 'on') {
            global.ghostMode = true;
            await conn.updateReadReceiptsPrivacy('none');
            await conn.sendMessage(chatId, { text: '🕶️ Ghost Mode ENABLED. Status views are now invisible.' }, { quoted: mek });
        } else {
            global.ghostMode = false;
            await conn.updateReadReceiptsPrivacy('all');
            await conn.sendMessage(chatId, { text: 'Ghost Mode DISABLED.' }, { quoted: mek });
        }
    }
};