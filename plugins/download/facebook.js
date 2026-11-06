const settings = require('../../settings');
const axios = require('axios');
const logger = require('../../lib/logger');

module.exports = {
  name: 'facebook',
  aliases: ['fb', 'fbdl'],
  category: 'download',
  description: 'Download Facebook videos',
  usage: '.facebook <url>',
  react: '🔵',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      const url = args[0];

      if (!url || (!url.includes('facebook.com') && !url.includes('fb.watch'))) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `Please provide a valid Facebook link.\n\nExample: .fb https://www.facebook.com/watch/?v=xxxxx\n\n${settings.footer}`
        }, { quoted: mek });
      }

      await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
      await conn.sendMessage(chatId, { text: `🔵 *Bypassing Facebook Servers...*\n\nPlease wait...\n\n${settings.footer}` }, { quoted: mek });

      // 🔥 THE HACK: Scraping fdown.net just like your website does
      const response = await axios.get(`https://fdown.net/download.php?URL=${encodeURIComponent(url)}`, {
          headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
          },
          timeout: 30000
      });
      
      const html = response.data;

      // Extract HD and SD links using Regex
      // Note: fdown.net sometimes changes their HTML slightly, so we check both patterns
      const hdMatch = html.match(/href="([^"]+)"[^>]*>Download in HD/);
      const sdMatch = html.match(/href="([^"]+)"[^>]*>Download in SD/);
      
      // Fallback pattern if the first one fails
      const fallbackHd = html.match(/href="([^"]+)"[^>]*>Download High Quality/);
      const fallbackSd = html.match(/href="([^"]+)"[^>]*>Download Normal Quality/);

      const videoHd = hdMatch ? hdMatch[1] : (fallbackHd ? fallbackHd[1] : null);
      const videoSd = sdMatch ? sdMatch[1] : (fallbackSd ? fallbackSd[1] : null);

      // Choose HD first, then SD
      const finalVideoUrl = videoHd || videoSd;

      if (!finalVideoUrl) {
        throw new Error('Could not extract video URL. The video might be private.');
      }

      // Send the Video
      await conn.sendMessage(chatId, {
        video: { url: finalVideoUrl },
        caption: `✅ *Facebook Video Downloaded*\n\n_If HD failed to send, it might be too large for WhatsApp._\n\n${settings.footer}`
      }, { quoted: mek });

      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

    } catch (e) {
      logger.error(`[FACEBOOK] Error: ${e.message}`);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (err) {}
      
      await conn.sendMessage(chatId, {
        text: `❌ Failed to download Facebook video.\nReason: ${e.message}\n\n*Note: If the video is private or Facebook blocked the bot IP, it will fail.*\n\n${settings.footer}`
      }, { quoted: mek });
    }
  }
};