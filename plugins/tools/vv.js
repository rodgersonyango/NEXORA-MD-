const settings = require('../../settings');
const logger = require('../../lib/logger');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const ownerLib = require('../../lib/owner');

const REVEAL_REACTIONS = ['👁️', '🔓', '✨', '👀', '🔍'];

function extractViewOnce(quoted) {
  if (!quoted) return null;
  let inner = quoted;

  if (quoted.viewOnceMessageV2?.message) inner = quoted.viewOnceMessageV2.message;
  else if (quoted.viewOnceMessage?.message) inner = quoted.viewOnceMessage.message;
  else if (quoted.viewOnceMessageV2Extension?.message) inner = quoted.viewOnceMessageV2Extension.message;

  if (inner.imageMessage) {
    return { type: 'image', media: inner.imageMessage, caption: inner.imageMessage.caption || '' };
  }
  if (inner.videoMessage) {
    return { type: 'video', media: inner.videoMessage, caption: inner.videoMessage.caption || '' };
  }
  if (inner.audioMessage) {
    return { type: 'audio', media: inner.audioMessage, caption: inner.audioMessage.caption || '' };
  }
  return null;
}

async function downloadMedia(mediaInfo) {
  const stream = await downloadContentFromMessage(mediaInfo.media, mediaInfo.type);
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

module.exports = {
  name: 'vv',
  aliases: ['vo', 'viewonce', 'reveal'],
  category: 'tools',
  description: 'Reveal a view-once image, video, or audio',
  usage: '.vv (reply to view-once) or .vv silent',
  react: '👁️',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      const contextInfo = mek.message?.extendedTextMessage?.contextInfo;
      const quoted = contextInfo?.quotedMessage;

      if (!quoted) {
        await conn.sendMessage(chatId, {
          text:
            `❌ Reply to a view-once image, video, or audio with ${settings.prefix || '.'}vv.\n` +
            `Use ${settings.prefix || '.'}vv silent to send it to the owner only.\n\n${settings.footer}`
        }, { quoted: mek });
        return;
      }

      const mediaInfo = extractViewOnce(quoted);
      if (!mediaInfo) {
        await conn.sendMessage(chatId, {
          text: `❌ No view-once media found in the replied message.\n\n${settings.footer}`
        }, { quoted: mek });
        return;
      }

      try {
        const emoji = REVEAL_REACTIONS[Math.floor(Math.random() * REVEAL_REACTIONS.length)];
        await conn.sendMessage(chatId, { react: { text: emoji, key: mek.key } });
      } catch (e) {}

      const buffer = await downloadMedia(mediaInfo);
      if (!buffer || buffer.length === 0) {
        await conn.sendMessage(chatId, {
          text: `❌ Download failed. Try again.\n\n${settings.footer}`
        }, { quoted: mek });
        return;
      }

      const silent = (args[0] || '').toLowerCase() === 'silent';
      const sender = mek.key.participant || mek.key.remoteJid;
      const senderNumber = ownerLib.cleanNumber(sender);

      const caption = silent
        ? `🕵️‍♂️ *SILENT REVEAL*\n\nFrom: ${senderNumber}\nChat: ${chatId.split('@')[0]}\nTime: ${new Date().toLocaleString()}\n\n${mediaInfo.caption ? 'Caption:\n' + mediaInfo.caption : ''}\n\n${settings.footer}`
        : `🕵️‍♂️ *VIEW-ONCE REVEALED*\n\nTime: ${new Date().toLocaleString()}\n\n${mediaInfo.caption ? 'Caption:\n' + mediaInfo.caption : ''}\n\n${settings.footer}`;

      const content = { caption };
      if (mediaInfo.type === 'image') content.image = buffer;
      else if (mediaInfo.type === 'video') content.video = buffer;
      else if (mediaInfo.type === 'audio') { content.audio = buffer; content.ptt = true; }

      // 🚨 REMOVED THE FORWARD TAG (it was breaking the message)
      let target = chatId;
      if (silent) {
        const owners = ownerLib.getOwnerNumbers(conn);
        const ownerNum = owners[0] || settings.ownerNumber;
        if (!ownerNum) {
          await conn.sendMessage(chatId, {
            text: `❌ Silent reveal failed: no owner number detected.\n\n${settings.footer}`
          }, { quoted: mek });
          return;
        }
        target = ownerNum + '@s.whatsapp.net';
      }

      await conn.sendMessage(target, content, { quoted: silent ? null : mek });

    } catch (error) {
      logger.error(`[VIEWONCE] Error: ${error.message}`);
      try {
        await conn.sendMessage(chatId, {
          text: `❌ View-once error: ${error.message}\n\n${settings.footer}`
        }, { quoted: mek });
      } catch (e) {}
    }
  }
};