/**
 * NEXORA MD - Pair Code Generator
 * Requests a pair code from the web pair server on demand
 * Usage:
 *   .pair <number>       - get pair code for a number
 *   .pair                - reply to a message with a number
 */

const settings = require('../../settings');
const axios = require('axios');

// Rate limit: one request per number per 2 minutes
const lastRequest = new Map();
const COOLDOWN_MS = 2 * 60 * 1000;

module.exports = {
  name: 'pair',
  aliases: ['paircode', 'getcode', 'session'],
  category: 'general',
  description: 'Get a WhatsApp pair code from the web pair server',
  usage: '.pair <number>',
  react: '🔗',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      // ─── Extract number ───
      let number = (args[0] || '').replace(/[^0-9]/g, '');

      if (!number) {
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (quoted) {
          const txt = quoted.conversation || quoted.extendedTextMessage?.text || '';
          const found = txt.match(/\d{10,15}/);
          if (found) number = found[0];
        }
      }

      if (!number || number.length < 10 || number.length > 15) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text:
            `▎PAIR CODE\n` +
            `▎\n` +
            `▎Usage: .pair <number>\n` +
            `▎  or reply to a message containing a number\n` +
            `▎\n` +
            `▎Example:\n` +
            `▎  .pair 254755660053\n` +
            `▎\n` +
            `▎Enter the number with country code, no + sign\n\n` +
            `▎${settings.footer}`
        }, { quoted: mek });
      }

      // ─── Rate limit ───
      const now = Date.now();
      const last = lastRequest.get(number) || 0;
      if (now - last < COOLDOWN_MS) {
        const remaining = Math.ceil((COOLDOWN_MS - (now - last)) / 1000);
        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        return conn.sendMessage(chatId, {
          text:
            `▎Slow down.\n` +
            `▎\n` +
            `▎Wait ${remaining}s before requesting another code for this number.\n\n` +
            `▎${settings.footer}`
        }, { quoted: mek });
      }

      // ─── Check server URL configured ───
      const serverBase = (settings.sessionServerUrl || '').replace(/\/+$/, '');
      if (!serverBase || serverBase.includes('your-render-url')) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text:
            `▎Pair server not configured.\n` +
            `▎\n` +
            `▎Owner: set sessionServerUrl in settings.js\n\n` +
            `▎${settings.footer}`
        }, { quoted: mek });
      }

      await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
      await conn.sendMessage(chatId, {
        text:
          `▎Requesting pair code for:\n` +
          `▎  ${number}\n` +
          `▎\n` +
          `▎This may take 10-20 seconds...\n\n` +
          `▎${settings.footer}`
      }, { quoted: mek });

      // ─── Call pair server ───
      const res = await axios.get(`${serverBase}/code`, {
        params: { number, type: 'short' },
        timeout: 45000,
        headers: { 'Accept': 'application/json' }
      });

      const data = res.data;
      const code = data?.code || data?.pairCode || null;

      if (!code || typeof code !== 'string' || code.trim().length === 0) {
        throw new Error(data?.error || 'No code returned from server');
      }

      lastRequest.set(number, now);

      // ─── Send code ───
      await conn.sendMessage(chatId, {
        text:
          `▎PAIR CODE READY\n` +
          `▎\n` +
          `▎Number : ${number}\n` +
          `▎Code   : ${code}\n` +
          `▎\n` +
          `▎How to use:\n` +
          `▎  1. Open WhatsApp on that phone\n` +
          `▎  2. Settings → Linked Devices\n` +
          `▎  3. Link with phone number\n` +
          `▎  4. Enter the code above\n` +
          `▎\n` +
          `▎Code expires in 2 minutes.\n\n` +
          `▎${settings.footer}`
      }, { quoted: mek });

      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

    } catch (error) {
      console.log('[PAIR] Error:', error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}

      let reason = error.message || 'Unknown error';
      if (error.response?.data?.error) reason = error.response.data.error;

      await conn.sendMessage(chatId, {
        text:
          `▎Pair code request failed.\n` +
          `▎\n` +
          `▎Reason: ${reason}\n` +
          `▎\n` +
          `▎Try again later or use the web portal:\n` +
          `▎${settings.sessionServerUrl || 'contact owner'}\n\n` +
          `▎${settings.footer}`
      }, { quoted: mek });
    }
  }
};