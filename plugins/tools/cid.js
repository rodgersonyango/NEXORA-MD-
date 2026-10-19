const settings = require('../../settings');

module.exports = {
  name: 'cid',
  aliases: ['newsletter', 'channelid', 'cinfo'],
  category: 'tools',
  description: 'Get WhatsApp Channel info from a link',
  usage: '.cid https://whatsapp.com/channel/xxxxx',
  react: '🔍',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      const q = args.join(' ');

      if (!q) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text:
            `CHANNEL INFO\n\n` +
            `Please provide a WhatsApp Channel link.\n\n` +
            `Example:\n` +
            `.cid https://whatsapp.com/channel/0029VbCwZHACXC3PNHgtMT31\n\n` +
            `${settings.footer}`
        }, { quoted: mek });
      }

      const match = q.match(/whatsapp\.com\/channel\/([\w-]+)/);
      if (!match) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `Invalid channel link format.\n\nMake sure it looks like:\nhttps://whatsapp.com/channel/xxxxxxxxx\n\n${settings.footer}`
        }, { quoted: mek });
      }

      const inviteId = match[1];
      await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });

      let metadata;
      try {
        metadata = await conn.newsletterMetadata('invite', inviteId);
      } catch (e) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `Failed to fetch channel metadata. Make sure the link is correct.\n\n${settings.footer}`
        }, { quoted: mek });
      }

      if (!metadata || !metadata.id) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `Channel not found or inaccessible.\n\n${settings.footer}`
        }, { quoted: mek });
      }

      const infoText =
        `CHANNEL INFO\n\n` +
        `ID: ${metadata.id}\n` +
        `Name: ${metadata.name || 'Unknown'}\n` +
        `Followers: ${metadata.subscribers?.toLocaleString() || 'N/A'}\n` +
        `Created: ${metadata.creation_time ? new Date(metadata.creation_time * 1000).toLocaleString() : 'Unknown'}\n\n` +
        `${settings.footer}`;

      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

      if (metadata.preview) {
        await conn.sendMessage(chatId, {
          image: { url: `https://pps.whatsapp.net${metadata.preview}` },
          caption: infoText
        }, { quoted: mek });
      } else {
        await conn.sendMessage(chatId, { text: infoText }, { quoted: mek });
      }

    } catch (error) {
      console.log('[CID] Error:', error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
      await conn.sendMessage(chatId, {
        text: `An unexpected error occurred: ${error.message}\n\n${settings.footer}`
      }, { quoted: mek });
    }
  }
};