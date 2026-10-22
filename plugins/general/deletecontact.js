const settings = require('../../settings');

module.exports = {
  name: 'deletecontact',
  aliases: ['delmsg', 'unsend'],
  category: 'general',
  description: 'Delete (unsend) a message from the bot',
  usage: '.deletecontact (reply to message)',
  react: '🗑️',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      const quoted = mek.message?.extendedTextMessage?.contextInfo;

      if (!quoted || !quoted.stanzaId) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `Please reply to the contact card or message you want to delete.\n\n${settings.footer}`
        }, { quoted: mek });
      }

      // Build the key to target the quoted message
      const key = {
        remoteJid: chatId,
        fromMe: quoted.participant === conn.user.id.split(':')[0] + '@s.whatsapp.net' || false,
        id: quoted.stanzaId,
        participant: quoted.participant || undefined
      };

      // If the message was sent by the bot, force fromMe to true
      if (quoted.participant === conn.user.id.split(':')[0] + '@s.whatsapp.net' || !quoted.participant) {
        key.fromMe = true;
      }

      await conn.sendMessage(chatId, { delete: key });

      await conn.sendMessage(chatId, {
        text: `Message deleted.\n\n${settings.footer}`
      }, { quoted: mek });

      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

    } catch (error) {
      console.log('[DELETECONTACT] Error:', error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
      await conn.sendMessage(chatId, {
        text: `Failed to delete. Ensure the bot has admin privileges (if in a group).\n\n${settings.footer}`
      }, { quoted: mek });
    }
  }
};