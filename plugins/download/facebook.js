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
      await conn.sendMessage(chatId, { text: `🔵 *Downloading Facebook video...*\n\nPlease wait...\n\n${settings.footer}` }, { quoted: mek });

      let videoUrl = null;
      let title = 'Facebook Video';

      // Try API 1 (Fresh endpoint)
      try {
        const res = await axios.get(`https://api.ryzendesu.vip/api/downloader/fbdl?url=${encodeURIComponent(url)}`, { timeout: 30000 });
        videoUrl = res.data?.data?.hd || res.data?.data?.sd || res.data?.data;
        if (res.data?.title) title = res.data.title;
      } catch (e) {
        logger.warn(`[FACEBOOK] API 1 Failed: ${e.message}`);
      }

      // Try API 2 (Fallback)
      if (!videoUrl) {
        try {
          const res2 = await axios.get(`https://api.vreden.my.id/api/fbdownload?url=${encodeURIComponent(url)}`, { timeout: 30000 });
          videoUrl = res2.data?.result?.hd || res2.data?.result?.sd;
          if (res2.data?.result?.title) title = res2.data.result.title;
        } catch (e) {
          logger.warn(`[FACEBOOK] API 2 Failed: ${e.message}`);
        }
      }

      if (!videoUrl) {
        throw new Error('All download APIs failed. The link may be private or the APIs are down.');
      }

      // Send the Video
      await conn.sendMessage(chatId, {
        video: { url: videoUrl },
        caption: `✅ *Facebook Video Downloaded*\n\n📝 Title: ${title}\n\n${settings.footer}`
      }, { quoted: mek });

      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

    } catch (e) {
      logger.error(`[FACEBOOK] Error: ${e.message}`);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (err) {}
      
      await conn.sendMessage(chatId, {
        text: `❌ Failed to download Facebook video.\nReason: ${e.message}\n\n*Note: Public APIs are unreliable. If this keeps failing, we need to use a paid/free-tier API.*\n\n${settings.footer}`
      }, { quoted: mek });
    }
  }
};