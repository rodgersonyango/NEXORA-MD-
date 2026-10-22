const settings = require('../../settings');

module.exports = {
  name: 'savecontact',
  aliases: ['vcard', 'getcontact'],
  category: 'general',
  description: 'Generate a vCard contact card for a user',
  usage: '.savecontact [Name] (reply) OR .savecontact [Number] [Name]',
  react: '💾',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      const quoted = mek.message?.extendedTextMessage?.contextInfo;
      let number, name;

      // 1. Extract number and name
      if (quoted && quoted.participant) {
        // User replied to a message
        number = quoted.participant.split('@')[0].split(':')[0];
        name = args.join(' ') || `Contact_${number}`;
      } else if (args[0] && args[1]) {
        // User typed: .savecontact 2547xxx Name
        number = args[0].replace(/[^0-9]/g, '');
        name = args.slice(1).join(' ');
      } else if (args[0] && !args[1]) {
        // User typed just a number
        number = args[0].replace(/[^0-9]/g, '');
        name = `Contact_${number}`;
      } else {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text:
            `CONTACT SAVER\n\n` +
            `▸ Reply to a message: .savecontact [Name]\n` +
            `▸ Type manually: .savecontact [Number] [Name]\n\n` +
            `${settings.footer}`
        }, { quoted: mek });
      }

      if (!number) {
        throw new Error('Invalid number');
      }

      // 2. Build the vCard
      const vcard =
        'BEGIN:VCARD\n' +
        'VERSION:3.0\n' +
        `FN:${name}\n` +
        `ORG:NEXORA Contact;\n` +
        `TEL;type=CELL;type=VOICE;waid=${number}:+${number}\n` +
        'END:VCARD';

      // 3. Send the Contact Card
      await conn.sendMessage(chatId, {
        contacts: {
          displayName: name,
          contacts: [{ vcard }]
        }
      }, { quoted: mek });

      // 4. Success Message
      await conn.sendMessage(chatId, {
        text: `Contact for ${name} created successfully.\n\n${settings.footer}`
      }, { quoted: mek });

      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

    } catch (error) {
      console.log('[SAVECONTACT] Error:', error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
      await conn.sendMessage(chatId, {
        text: `Failed to create contact: ${error.message}\n\n${settings.footer}`
      }, { quoted: mek });
    }
  }
};