const settings = require('../../settings');

module.exports = {
  name: 'unblock',
  aliases: ['unban'],
  category: 'owner',
  description: 'Unblock a user so they can message the bot again',
  usage: '.unblock number',
  ownerOnly: true,
  react: '🔓',

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
          text: `Please provide a number, tag, or reply to a message.\n\nExample: .unblock 2547xxxxxxxx\n\n${settings.footer}`
        }, { quoted: mek });
      }

      await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });

      try {
        await conn.updateBlockStatus(target, 'unblock');
        await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
        await conn.sendMessage(chatId, {
          text: `User @${target.split('@')[0]} has been unblocked. They can now message the bot again.`,
          mentions: [target]
        }, { quoted: mek });
      } catch (e) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        await conn.sendMessage(chatId, {
          text: `Error: Could not unblock the user. Make sure the number is valid.\n\n${settings.footer}`
        }, { quoted: mek });
      }

    } catch (error) {
      console.log('[UNBLOCK] Error:', error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
    }
  }
};