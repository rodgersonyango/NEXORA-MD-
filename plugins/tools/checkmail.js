/**
 * NEXORA MD - Temp Mail Inbox Checker
 * Checks the inbox of a disposable email
 * Usage:
 *   .checkmail <email>            - check inbox
 *   .checkmail                    - reply to a message with an email
 */

const settings = require('../../settings');
const axios = require('axios');

const API_KEY = 'zanta_wfZEvdAaYG8BjA4ydc5avtPa';
const CHECK_URL = 'https://api.zanta-mini.store/api/tempmail/check';

module.exports = {
  name: 'checkmail',
  aliases: ['checkinbox', 'inbox', 'mailcheck'],
  category: 'tools',
  description: 'Check inbox of a temporary email',
  usage: '.checkmail <email>',
  react: '📬',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      let email = args.join(' ').trim();

      // If no email in args, check if replying to a message with an email
      if (!email) {
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (quoted) {
          const text =
            quoted.conversation ||
            quoted.extendedTextMessage?.text ||
            quoted.imageMessage?.caption ||
            quoted.videoMessage?.caption ||
            '';
          const found = text.split(/\s+/).find(x => x.includes('@'));
          if (found) email = found.trim();
        }
      }

      if (!email || !email.includes('@')) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text:
            `CHECK MAIL INBOX\n\n` +
            `Usage:\n` +
            `  .checkmail <email>\n` +
            `  Reply to a message with an email\n\n` +
            `Example:\n` +
            `  .checkmail hqlr0daedorcr@tanpony.com\n\n` +
            `${settings.footer}`
        }, { quoted: mek });
      }

      await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });

      const res = await axios.get(CHECK_URL, {
        params: { apiKey: API_KEY, query: email },
        timeout: 30000,
        headers: { 'Accept': 'application/json' }
      });

      const data = res.data;

      if (!data?.success) {
        throw new Error('Check failed');
      }

      const count = data.count || 0;
      const messages = data.messages || [];

      if (count === 0 || messages.length === 0) {
        await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
        return conn.sendMessage(chatId, {
          text:
            `INBOX: ${email}\n\n` +
            `No messages yet.\n\n` +
            `Send something to this address and check again.\n\n` +
            `${settings.footer}`
        }, { quoted: mek });
      }

      let text = `INBOX: ${email}\n`;
      text += `Messages: ${count}\n\n`;

      messages.slice(0, 5).forEach((m, i) => {
        const from = m.from || m.sender || m.from_address || 'Unknown';
        const subject = m.subject || '(no subject)';
        const body = m.body || m.text || m.message || m.content || m.snippet || '';
        const snippet = String(body).slice(0, 200).replace(/\s+/g, ' ');

        text += `${i + 1}. From: ${from}\n`;
        text += `   Subject: ${subject}\n`;
        if (snippet) {
          text += `   ${snippet}${String(body).length > 200 ? '...' : ''}\n`;
        }
        text += `\n`;
      });

      if (messages.length > 5) {
        text += `Showing 5 of ${count}.\n\n`;
      }

      text += `${settings.footer}`;

      await conn.sendMessage(chatId, { text }, { quoted: mek });
      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

    } catch (error) {
      console.log('[CHECKMAIL] Error:', error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
      await conn.sendMessage(chatId, {
        text: `Check mail failed: ${error.message}\n\n${settings.footer}`
      }, { quoted: mek });
    }
  }
};