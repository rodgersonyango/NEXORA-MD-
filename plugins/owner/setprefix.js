const fs = require('fs');
const path = require('path');
const settings = require('../../settings');

module.exports = {
  name: 'setprefix',
  aliases: ['prefix'],
  category: 'owner',
  description: 'Change the bot command prefix',
  usage: '.setprefix <new_prefix>',
  ownerOnly: true,
  react: '⚙️',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      if (!isOwner) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `Only the owner can change the prefix.\n\n${settings.footer}`
        }, { quoted: mek });
      }

      const newPrefix = args[0];

      if (!newPrefix) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text:
            `CURRENT PREFIX\n\n` +
            `Prefix: ${settings.prefix}\n\n` +
            `Usage:\n` +
            `.setprefix <new_prefix>\n` +
            `Example: .setprefix !\n\n` +
            `${settings.footer}`
        }, { quoted: mek });
      }

      const settingsPath = path.join(__dirname, '..', '..', 'settings.js');
      
      if (!fs.existsSync(settingsPath)) {
        throw new Error('settings.js not found');
      }

      let fileContent = fs.readFileSync(settingsPath, 'utf8');

      const prefixRegex = /(prefix:\s*)(['"])(.*?)\2/;
      
      if (!prefixRegex.test(fileContent)) {
        throw new Error('Could not find "prefix" property in settings.js');
      }

      fileContent = fileContent.replace(prefixRegex, `$1"${newPrefix}"`);

      fs.writeFileSync(settingsPath, fileContent, 'utf8');

      settings.prefix = newPrefix;

      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
      
      await conn.sendMessage(chatId, {
        text:
          `SYSTEM UPDATED\n\n` +
          `New Prefix : ${newPrefix}\n` +
          `Example    : ${newPrefix}menu\n\n` +
          `Note: The bot will use this prefix immediately. It has also been saved to settings.js permanently.\n\n` +
          `${settings.footer}`
      }, { quoted: mek });

    } catch (error) {
      console.log('[SETPREFIX] Error:', error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
      await conn.sendMessage(chatId, {
        text: `Failed to update prefix: ${error.message}\n\n${settings.footer}`
      }, { quoted: mek });
    }
  }
};