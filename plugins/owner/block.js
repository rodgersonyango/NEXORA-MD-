const settings = require('../../settings');

module.exports = {
  name: 'block',
  aliases: ['ban'],
  category: 'owner',
  description: 'Block a user from messaging the bot',
  usage: '.block @user | reply | number',
  ownerOnly: true,
  react: '🚫',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      if (!isOwner) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `Access Denied: This command is restricted to the Bot Owner.\n\n${settings.footer}`
        }, { quoted: mek });
      }

      const contextInfo = mek.message?.extendedTextMessage?.contextInfo;
      let target;

      if (contextInfo?.mentionedJid && contextInfo.mentionedJid.length > 0) {
        target = contextInfo.mentionedJid[0];
      } else if (contextInfo?.participant) {
        target = contextInfo.participant;
      } else if (args[0]) {
        target = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
      } else {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text:
            `HOW TO USE:\n\n` +
            `1. Tag a user: .block @user\n` +
            `2. Reply to their message with .block\n` +
            `3. Enter their number: .block 2547xxxxxxxx\n\n` +
            `${settings.footer}`
        }, { quoted: mek });
      }

      await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });

      try {
        await conn.updateBlockStatus(target, 'block');
        await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
        await conn.sendMessage(chatId, {
          text: `User @${target.split('@')[0]} has been successfully blocked.`,
          mentions: [target]
        }, { quoted: mek });
      } catch (e) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        await conn.sendMessage(chatId, {
          text: `Failed to block the user. Ensure the number is valid and the bot is connected.\n\n${settings.footer}`
        }, { quoted: mek });
      }

    } catch (error) {
      console.log('[BLOCK] Error:', error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
    }
  }
};