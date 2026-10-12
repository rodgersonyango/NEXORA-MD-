/**
 * NEXORA MD - Website Screenshot
 * Take a screenshot of any website
 * Usage:
 *   .ss <url>          - desktop screenshot
 *   .ss <url> mobile   - mobile screenshot
 *   .ssweb <url>       - alias
 */

const settings = require('../../settings');
const axios = require('axios');

const API_URL = 'https://api.omegatech.app/api/tools/ssweb';

async function takeScreenshot(url, device = 'desktop') {
  const res = await axios.get(API_URL, {
    params: {
      action: 'screenshot',
      url,
      device,
      raw: 'false'
    },
    timeout: 60000,
    headers: { 'Accept': 'application/json' }
  });
  if (!res.data?.success) throw new Error('Screenshot failed');
  return res.data.data;
}

module.exports = {
  name: 'ss',
  aliases: ['ssweb', 'screenshot', 'webss'],
  category: 'tools',
  description: 'Take a screenshot of any website',
  usage: '.ss <url>',
  react: '📸',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      let input = args.join(' ').trim();

      if (!input) {
        return conn.sendMessage(chatId, {
          text:
            `WEBSITE SCREENSHOT\n\n` +
            `Usage:\n` +
            `  .ss <url>            Desktop screenshot\n` +
            `  .ss <url> mobile     Mobile screenshot\n\n` +
            `Examples:\n` +
            `  .ss google.com\n` +
            `  .ss github.com mobile\n\n` +
            `${settings.footer}`
        }, { quoted: mek });
      }

      // Extract URL
      const urlMatch = input.match(/(https?:\/\/[^\s]+|[a-z0-9.-]+\.[a-z]{2,}[^\s]*)/i);
      if (!urlMatch) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `Please provide a valid URL.\n\nExample: .ss google.com\n\n${settings.footer}`
        }, { quoted: mek });
      }

      let url = urlMatch[0];
      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
      }

      // Detect mobile flag
      const device = /\bmobile\b|\bphone\b/i.test(input) ? 'mobile' : 'desktop';

      await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
      await conn.sendMessage(chatId, {
        text:
          `Taking screenshot of:\n${url}\n` +
          `Device: ${device}\n\n` +
          `This may take 10-30 seconds...\n\n${settings.footer}`
      }, { quoted: mek });

      const result = await takeScreenshot(url, device);

      if (!result?.screenshot_url) {
        throw new Error('No screenshot URL returned');
      }

      const caption =
        `WEBSITE SCREENSHOT\n\n` +
        `URL: ${result.target_url || url}\n` +
        `Device: ${result.device || device}\n` +
        `Format: ${(result.format || 'png').toUpperCase()}\n` +
        `Dimensions: ${result.dimensions?.width || '?'}x${result.dimensions?.height || '?'}\n` +
        `Size: ${result.size || 'N/A'}\n\n` +
        `${settings.footer}`;

      await conn.sendMessage(chatId, {
        image: { url: result.screenshot_url },
        caption
      }, { quoted: mek });

      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

    } catch (error) {
      console.log('[SSWEB] Error:', error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
      await conn.sendMessage(chatId, {
        text: `Screenshot failed: ${error.message}\n\n${settings.footer}`
      }, { quoted: mek });
    }
  }
};