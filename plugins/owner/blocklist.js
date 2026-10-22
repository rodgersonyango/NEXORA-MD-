const settings = require('../../settings');

module.exports = {
  name: 'blocklist',
  aliases: ['listblock', 'blacklist'],
  category: 'owner',
  description: 'Show the list of blocked contacts',
  usage: '.blocklist',
  ownerOnly: true,
  react: '📋',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      if (!isOwner) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `Access Denied: This command is restricted to the Bot Owner.\n\n${settings.footer}`
        }, { quoted: mek });
      }

      await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });

      const blocklist = await conn.fetchBlocklist();

      if (!blocklist || blocklist.length === 0) {
        await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `No blocked contacts found.\n\n${settings.footer}`
        }, { quoted: mek });
      }

      let text = `BLOCKED CONTACTS (${blocklist.length})\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      blocklist.forEach((jid, index) => {
        const phoneNumber = jid.split('@')[0];
        text += `${index + 1}. +${phoneNumber}\n`;
      });

      text += `\n━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `${settings.footer}`;

      await conn.sendMessage(chatId, { text }, { quoted: mek });
      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

    } catch (error) {
      console.log('[BLOCKLIST] Error:', error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
      await conn.sendMessage(chatId, {
        text: `Error: ${error.message}\n\n${settings.footer}`
      }, { quoted: mek });
    }
  }
};