/**
 * NEXORA MD - Repo Downloader
 * Sends the NEXORA MD repo as a ZIP file
 * Usage:
 *   .repo           - download the repo
 *   .source         - alias
 */

const settings = require('../../settings');
const axios = require('axios');

const REPO_ZIP_URL = 'https://github.com/queenbellabots-cloud/NEXORA-MD-/archive/refs/heads/main.zip';
const REPO_URL = 'https://github.com/queenbellabots-cloud/NEXORA-MD-';

module.exports = {
  name: 'repo',
  aliases: ['source', 'repodl'],
  category: 'general',
  description: 'Download the NEXORA MD repo as a ZIP',
  usage: '.repo',
  react: '📦',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });

      await conn.sendMessage(chatId, {
        text:
          `▎📦 Fetching NEXORA MD source...\n\n` +
          `▎${settings.footer}`
      }, { quoted: mek });

      const res = await axios.get(REPO_ZIP_URL, {
        responseType: 'arraybuffer',
        timeout: 120000,
        maxRedirects: 5,
        maxContentLength: 200 * 1024 * 1024,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/zip,*/*'
        }
      });

      const buffer = Buffer.from(res.data);
      const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);

      if (buffer.length > 100 * 1024 * 1024) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text:
            `▎File is ${sizeMB} MB — over WhatsApp's 100 MB limit.\n` +
            `▎\n` +
            `▎Download manually:\n` +
            `▎${REPO_URL}\n\n` +
            `▎${settings.footer}`
        }, { quoted: mek });
      }

      await conn.sendMessage(chatId, {
        document: buffer,
        mimetype: 'application/zip',
        fileName: `NEXORA-MD-${Date.now()}.zip`,
        caption:
          `▎NEXORA MD source\n` +
          `▎\n` +
          `▎Size : ${sizeMB} MB\n` +
          `▎Repo : ${REPO_URL}\n` +
          `▎\n` +
          `▎Setup:\n` +
          `▎  1. Extract the ZIP\n` +
          `▎  2. npm install\n` +
          `▎  3. Set SESSION_ID\n` +
          `▎  4. node index.js\n` +
          `▎\n` +
          `▎${settings.footer}`
      }, { quoted: mek });

      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

    } catch (error) {
      console.log('[REPO] Error:', error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
      await conn.sendMessage(chatId, {
        text:
          `▎Download failed: ${error.message}\n` +
          `▎\n` +
          `▎Try manually:\n` +
          `▎${REPO_URL}\n\n` +
          `▎${settings.footer}`
      }, { quoted: mek });
    }
  }
};