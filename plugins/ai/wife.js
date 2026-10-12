/**
 * NEXORA MD - Wife AI
 * Chat with a caring AI companion
 * Usage:
 *   .wife <message>          - send a message
 *   .wife                    - reply to a message
 */

const settings = require('../../settings');
const axios = require('axios');

const API_URL = 'https://api.zanta-mini.store/api/wife';
const API_KEY = 'zanta_wfZEvdAaYG8BjA4ydc5avtPa';

module.exports = {
  name: 'wife',
  aliases: ['wifey', 'bae'],
  category: 'ai',
  description: 'Chat with a caring AI companion',
  usage: '.wife <message>',
  react: '💕',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      let text = args.join(' ').trim();

      if (!text) {
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (quoted) {
          text =
            quoted.conversation ||
            quoted.extendedTextMessage?.text ||
            quoted.imageMessage?.caption ||
            quoted.videoMessage?.caption ||
            '';
          text = text.trim();
        }
      }

      if (!text) {
        return conn.sendMessage(chatId, {
          text:
            `WIFE AI\n\n` +
            `Usage:\n` +
            `  .wife <message>\n` +
            `  Reply to a message with .wife\n\n` +
            `Example:\n` +
            `  .wife how was your day?\n\n` +
            `${settings.footer}`
        }, { quoted: mek });
      }

      await conn.sendMessage(chatId, { react: { text: '💕', key: mek.key } });

      const res = await axios.get(API_URL, {
        params: {
          apiKey: API_KEY,
          text
        },
        timeout: 45000,
        headers: { 'Accept': 'application/json' }
      });

      const data = res.data;
      const reply = data?.result?.reply;

      if (!reply || typeof reply !== 'string' || reply.trim().length === 0) {
        throw new Error('No reply from AI');
      }

      await conn.sendMessage(chatId, {
        text: `${reply.trim()}\n\n${settings.footer}`
      }, { quoted: mek });

      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

    } catch (error) {
      console.log('[WIFE] Error:', error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
      await conn.sendMessage(chatId, {
        text: `Wife AI is unavailable right now.\n\nReason: ${error.message}\n\n${settings.footer}`
      }, { quoted: mek });
    }
  }
};