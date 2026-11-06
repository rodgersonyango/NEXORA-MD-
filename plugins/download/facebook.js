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

      if (!url || !url.includes('facebook.com') && !url.includes('fb.watch')) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `Please provide a valid Facebook link.\n\nExample: .fb https://www.facebook.com/watch/?v=xxxxx\n\n${settings.footer}`
        }, { quoted: mek });
      }

      await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
      await conn.sendMessage(chatId, { text: `🔵 *Downloading Facebook video...*\n\nPlease wait...\n\n${settings.footer}` }, { quoted: mek });

      // 1. Try API 1 (Nexoracle)
      let videoUrl = null;
      let title = 'Facebook Video';

      try {
        const res = await axios.get(`https://api.nexoracle.com/downloader/facebook?url=${encodeURIComponent(url)}&apikey=free_key`, { timeout: 30000 });
        
        // Look for HD first, then SD
        videoUrl = res.data?.result?.hd || res.data?.result?.sd || res.data?.result?.video;
        if (res.data?.result?.title) title = res.data.result.title;

      } catch (e) {
        logger.warn(`[FACEBOOK] API 1 Failed: ${e.message}`);
      }

      // 2. Fallback to API 2 (If API 1 fails)
      if (!videoUrl) {
        try {
          const res2 = await axios.get(`https://api.ryzendesu.vip/api/downloader/fbdl?url=${encodeURIComponent(url)}`, { timeout: 30000 });
          videoUrl = res2.data?.data?.hd || res2.data?.data?.sd || res2.data?.data;
          if (res2.data?.title) title = res2.data.title;
        } catch (e) {
          logger.warn(`[FACEBOOK] API 2 Failed: ${e.message}`);
        }
      }

      // If both APIs failed, throw error
      if (!videoUrl) {
        throw new Error('Could not extract video. The link may be private or the API is down.');
      }

      // 3. Send the Video
      await conn.sendMessage(chatId, {
        video: { url: videoUrl },
        caption: `✅ *Facebook Video Downloaded*\n\n📝 Title: ${title}\n\n${settings.footer}`
      }, { quoted: mek });

      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

    } catch (e) {
      logger.error(`[FACEBOOK] Error: ${e.message}`);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (err) {}
      
      await conn.sendMessage(chatId, {
        text: `❌ Failed to download Facebook video.\nReason: ${e.message}\n\n*Note: Facebook links expire quickly. Try a different link.*\n\n${settings.footer}`
      }, { quoted: mek });
    }
  }
};