const settings = require('../../settings');
const { downloadContentFromMessage, generateWAMessageFromContent, prepareWAMessageMedia, jidNormalizedUser } = require('@whiskeysockets/baileys');

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

      await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });

      const contextInfo = {
        forwardingScore: 0,
        featureEligibilities: { canBeReshared: true, canReceiveMultiReact: true },
        pairedMediaType: 0,
        statusSourceType: 4,
        statusAttributions: [{ type: 10 }],
        isGroupStatus: true,
        statusAudienceMetadata: { audienceType: 1, listEmoji: '📌', listName: 'NEXORA MD' }
      };

      let messageContent = {};

      if (type === 'text') {
        if (!content) throw new Error('Please provide a message.');
        
        messageContent = {
          extendedTextMessage: {
            text: content,
            contextInfo: contextInfo
          }
        };
      } 
      
      else if (type === 'image' || type === 'video') {
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
          
        const prepared = await prepareWAMessageMedia(mediaInput, { upload: conn.waUploadToServer });
        
        if (type === 'image') {
          messageContent = { imageMessage: prepared.imageMessage };
          messageContent.imageMessage.contextInfo = contextInfo;
          messageContent.imageMessage.caption = content;
        } else {
          messageContent = { videoMessage: prepared.videoMessage };
          messageContent.videoMessage.contextInfo = contextInfo;
          messageContent.videoMessage.caption = content;
        }
      } else {
        throw new Error('Usage: .gcstatus text <message> OR reply to an image/video with .gcstatus image|video <caption>');
      }

      const msg = generateWAMessageFromContent(chatId, messageContent, {
        userJid: jidNormalizedUser(conn.user.id)
      });

      await conn.relayMessage(chatId, msg.message, { messageId: msg.key.id });

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