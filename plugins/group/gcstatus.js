const settings = require('../../settings');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
  name: 'gcstatus',
  aliases: ['groupstatus', 'gstatus'],
  category: 'group',
  description: 'Post a status update directly to the group icon',
  usage: '.gcstatus text <message> OR reply to media with .gcstatus image|video <caption>',
  groupOnly: true,
  react: '⏳',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      const type = (args[0] || '').toLowerCase();
      const content = args.slice(1).join(' ').trim();
      const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;

      if (!['text', 'image', 'video'].includes(type)) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `Usage:\n.gcstatus text <message>\nReply to an image/video with .gcstatus image|video <caption>\n\n${settings.footer}`
        }, { quoted: mek });
      }

      await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });

      if (type === 'text') {
        if (!content) throw new Error('Please provide a message for the text status.');
        
        // Native group status function from blacklord-socket
        await conn.sendGroupStatus(chatId, { text: content });
        
      } else if (type === 'image' || type === 'video') {
        if (!quoted) throw new Error(`Please reply to an ${type} to post it as a status.`);
        
        const mediaType = type === 'image' ? 'imageMessage' : 'videoMessage';
        if (!quoted[mediaType]) throw new Error(`The replied message is not an ${type}.`);

        const stream = await downloadContentFromMessage(quoted[mediaType], type);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }

        const mediaInput = type === 'image' 
          ? { image: buffer, caption: content } 
          : { video: buffer, caption: content };
          
        // Native group status function for media
        await conn.sendGroupStatus(chatId, mediaInput);
      }

      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
      await conn.sendMessage(chatId, { 
        text: `Group status posted successfully.\n\n${settings.footer}` 
      }, { quoted: mek });

    } catch (error) {
      console.log('[GCSTATUS] Error:', error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
      await conn.sendMessage(chatId, {
        text: `Failed to post group status: ${error.message}\n\n${settings.footer}`
      }, { quoted: mek });
    }
  }
};