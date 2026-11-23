const settings = require('../../settings');
const logger = require('../../lib/logger');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

function extractViewOnce(quoted) {
  if (!quoted) return null;
  let inner = quoted;
  if (quoted.viewOnceMessageV2?.message) inner = quoted.viewOnceMessageV2.message;
  else if (quoted.viewOnceMessage?.message) inner = quoted.viewOnceMessage.message;
  else if (quoted.viewOnceMessageV2Extension?.message) inner = quoted.viewOnceMessageV2Extension.message;
  else if (quoted.documentWithCaptionMessage?.message) inner = quoted.documentWithCaptionMessage.message;

  if (inner.imageMessage) return { type: 'image', media: inner.imageMessage, caption: inner.imageMessage.caption || '' };
  if (inner.videoMessage) return { type: 'video', media: inner.videoMessage, caption: inner.videoMessage.caption || '' };
  if (inner.audioMessage) return { type: 'audio', media: inner.audioMessage, caption: inner.audioMessage.caption || '' };
  return null;
}

async function downloadMedia(mediaInfo) {
  const stream = await downloadContentFromMessage(mediaInfo.media, mediaInfo.type);
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

module.exports = {
  name: 'vv2',
  aliases: ['vreveal', 'vvd'],
  category: 'tools',
  description: 'Reveal a view-once and delete the original',
  usage: '.vv2 (reply to a view-once)',
  react: '🕵️‍♂️',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      const contextInfo = mek.message?.extendedTextMessage?.contextInfo;
      const quoted = contextInfo?.quotedMessage;
      const quotedKey = contextInfo?.stanzaId;

      if (!quoted || !quotedKey) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `❌ Reply to a *View-Once* message to reveal it.\n\n${settings.footer}`
        }, { quoted: mek });
      }

      const mediaInfo = extractViewOnce(quoted);
      if (!mediaInfo) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `❌ No view-once media found in the replied message.\n\n${settings.footer}`
        }, { quoted: mek });
      }

      await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });

      const buffer = await downloadMedia(mediaInfo);
      if (!buffer || buffer.length === 0) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, { text: `❌ Failed to download media.` }, { quoted: mek });
      }

      const caption = `🕵️‍♂️ *VIEW-ONCE REVEALED*\n\n⏰ Time: ${new Date().toLocaleString()}\n\n${mediaInfo.caption ? `📝 Caption:\n${mediaInfo.caption}\n\n` : ''}${settings.footer}`;

      const content = { caption };
      if (mediaInfo.type === 'image') content.image = buffer;
      else if (mediaInfo.type === 'video') content.video = buffer;
      else if (mediaInfo.type === 'audio') { content.audio = buffer; content.ptt = true; }

      await conn.sendMessage(chatId, content, { quoted: mek });

      // 🔥 THE FIX: Correct protocol deletion
      try {
        const msgKey = {
            remoteJid: chatId,
            fromMe: false,
            id: quotedKey,
            participant: contextInfo?.participant || chatId
        };
        
        await conn.relayMessage(chatId, {
            protocolMessage: {
                key: msgKey,
                type: 0, // 0 = REVOKE
                timestampMs: Date.now().toString()
            }
        }, { messageId: '3EB0' + Math.random().toString(36).substring(2, 18).toUpperCase() });
        
        logger.info(`[VV2] Original view-once deleted successfully.`);
      } catch (delErr) {
        logger.warn(`[VV2] Delete failed: ${delErr.message}`);
      }

      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

    } catch (error) {
      logger.error(`[VV2] Error: ${error.message}`);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
    }
  }
};