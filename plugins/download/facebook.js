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

      // 🔥 THE FIX: Full browser spoofing headers to bypass Cloudflare 403
      const response = await axios.get(`https://fdown.net/download.php?URL=${encodeURIComponent(url)}`, {
          headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
              'Accept-Language': 'en-US,en;q=0.9',
              'Accept-Encoding': 'gzip, deflate, br',
              'Referer': 'https://fdown.net/',
              'Origin': 'https://fdown.net',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1',
              'Sec-Fetch-Dest': 'document',
              'Sec-Fetch-Mode': 'navigate',
              'Sec-Fetch-Site': 'same-origin',
              'Sec-Fetch-User': '?1',
              'Cache-Control': 'max-age=0'
          },
          timeout: 30000,
          maxRedirects: 5
      });
      
      const html = response.data;

      // Extract HD and SD links using Regex
      const hdMatch = html.match(/href="([^"]+)"[^>]*>Download in HD/);
      const sdMatch = html.match(/href="([^"]+)"[^>]*>Download in SD/);
      
      const fallbackHd = html.match(/href="([^"]+)"[^>]*>Download High Quality/);
      const fallbackSd = html.match(/href="([^"]+)"[^>]*>Download Normal Quality/);

      const videoHd = hdMatch ? hdMatch[1] : (fallbackHd ? fallbackHd[1] : null);
      const videoSd = sdMatch ? sdMatch[1] : (fallbackSd ? fallbackSd[1] : null);

      const finalVideoUrl = videoHd || videoSd;

      if (!finalVideoUrl) {
        throw new Error('Could not extract video URL. The video might be private or fdown changed its HTML.');
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
      
      // If it's still a 403, give the user a helpful tip
      const errorMsg = e.message.includes('403') 
        ? 'Your server IP is blocked by Cloudflare. Try again later or use a different video link.' 
        : e.message;

      await conn.sendMessage(chatId, {
        text: `❌ Failed to download Facebook video.\nReason: ${errorMsg}\n\n*Note: If this persists, the host IP is blacklisted.*\n\n${settings.footer}`
      }, { quoted: mek });
    }
  }
};