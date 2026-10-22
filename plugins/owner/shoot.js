const settings = require('../../settings');

module.exports = {
  name: 'shoot',
  aliases: ['spam', 'blast'],
  category: 'owner',
  description: 'Send a message multiple times in the current chat',
  usage: '.shoot [count] [message]',
  ownerOnly: true,
  react: '📣',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      if (!isOwner) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `This command is for the Owner only to prevent abuse.\n\n${settings.footer}`
        }, { quoted: mek });
      }

      if (!args[0]) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `Usage: .shoot [count] [message]\n\nExample:\n.shoot 5 Hello everyone!\n\n${settings.footer}`
        }, { quoted: mek });
      }

      const count = parseInt(args[0]);
      const textToSend = args.slice(1).join(' ');

      if (isNaN(count) || count < 1 || count > 20) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `Please provide a number between 1 and 20 to avoid being banned.\n\n${settings.footer}`
        }, { quoted: mek });
      }

      if (!textToSend) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `Please provide a message to send.\n\n${settings.footer}`
        }, { quoted: mek });
      }

      await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
      await conn.sendMessage(chatId, {
        text: `Starting shoot of ${count} messages...\n\n${settings.footer}`
      }, { quoted: mek });

      for (let i = 0; i < count; i++) {
        await conn.sendMessage(chatId, {
          text: textToSend
        });
        
        // Delay to prevent WhatsApp ban
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
      await conn.sendMessage(chatId, {
        text: `Shoot completed. ${count} messages sent.\n\n${settings.footer}`
      }, { quoted: mek });

    } catch (error) {
      console.log('[SHOOT] Error:', error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
      await conn.sendMessage(chatId, {
        text: `Error: ${error.message}\n\n${settings.footer}`
      }, { quoted: mek });
    }
  }
};