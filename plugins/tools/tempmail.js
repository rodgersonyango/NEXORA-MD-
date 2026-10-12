/**
 * NEXORA MD - Temporary Mail Generator
 * Generates a disposable email address
 * Usage: .tempmail
 */

const settings = require('../../settings');
const axios = require('axios');

const API_KEY = 'zanta_wfZEvdAaYG8BjA4ydc5avtPa';
const GENERATE_URL = 'https://api.zanta-mini.store/api/tempmail/generate';

module.exports = {
  name: 'tempmail',
  aliases: ['temp', 'tmpmail', 'fakeemail'],
  category: 'tools',
  description: 'Generate a temporary email address',
  usage: '.tempmail',
  react: '📧',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });

      const res = await axios.get(GENERATE_URL, {
        params: { apiKey: API_KEY },
        timeout: 30000,
        headers: { 'Accept': 'application/json' }
      });

      const data = res.data;

      if (!data?.success || !data?.email) {
        throw new Error('No email returned from API');
      }

      const email = data.email;

      await conn.sendMessage(chatId, {
        text:
          `TEMPORARY EMAIL\n\n` +
          `Email: ${email}\n\n` +
          `Use it for signups or verifications.\n` +
          `Check the inbox with:\n` +
          `  .checkmail ${email}\n\n` +
          `${settings.footer}`
      }, { quoted: mek });

      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

    } catch (error) {
      console.log('[TEMPMAIL] Error:', error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
      await conn.sendMessage(chatId, {
        text: `Temp mail failed: ${error.message}\n\n${settings.footer}`
      }, { quoted: mek });
    }
  }
};