const settings = require('../../settings');

module.exports = {
    name: 'fakename',
    aliases: ['setname'],
    category: 'owner',
    description: 'Change the bot profile name temporarily',
    usage: '.fakename <name>',
    ownerOnly: true,
    react: '📝',

    async execute(conn, mek, args, chatId, isOwner) {
        if (!isOwner) return;
        const newName = args.join(' ');

        if (!newName) {
            return conn.sendMessage(chatId, { text: `❌ Provide a name. Example: ${settings.prefix}fakename crying...` }, { quoted: mek });
        }

        try {
            await conn.updateProfileName(newName);
            await conn.sendMessage(chatId, { text: `✅ Bot name changed to: *${newName}*` }, { quoted: mek });
        } catch (e) {
            await conn.sendMessage(chatId, { text: `❌ Failed to update name.` }, { quoted: mek });
        }
    }
};