const settings = require('../../settings');
const axios = require('axios');
const logger = require('../../lib/logger');

module.exports = {
  name: 'instagram',
  aliases: ['ig', 'insta'],
  category: 'download',
  description: 'Download Instagram videos and reels',
  usage: '.instagram <url>',
  react: '📸',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      const url = args[0];

      if (!url || (!url.includes('instagram.com') && !url.includes('instagr.am'))) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `Please provide a valid Instagram link.\n\nExample: .ig https://www.instagram.com/reel/xxxxx\n\n${settings.footer}`
        }, { quoted: mek });
      }

      await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
      await conn.sendMessage(chatId, { text: `📸 *Downloading Instagram media...*\n\n_Testing servers..._\n\n${settings.footer}` }, { quoted: mek });

      let mediaUrl = null;
      let mediaType = 'video';
      let title = 'Instagram Media';

      // 🩺 TIER 1: Primary API (Vreden)
      try {
        const res1 = await axios.get(`https://api.vreden.my.id/api/igdownload?url=${encodeURIComponent(url)}`, { timeout: 15000 });
        if (res1.data?.result?.[0]?.url) {
          mediaUrl = res1.data.result[0].url;
          // Check if it's an image (photo post)
          if (res1.data.result[0].type === 'image' || mediaUrl.includes('.jpg') || mediaUrl.includes('.webp')) {
            mediaType = 'image';
          }
          logger.info('[IG] Success with Primary API (Vreden)');
        }
      } catch (e) {
        logger.warn(`[IG] Primary API (Vreden) failed: ${e.message}`);
      }

      // 🩺 TIER 2: Self-Healing Fallback 1 (Nexoracle)
      if (!mediaUrl) {
        try {
          const res2 = await axios.get(`https://api.nexoracle.com/downloader/instagram?url=${encodeURIComponent(url)}&apikey=free_key`, { timeout: 15000 });
          if (res2.data?.result?.video || res2.data?.result?.image) {
            mediaUrl = res2.data.result.video || res2.data.result.image;
            mediaType = res2.data.result.video ? 'video' : 'image';
            if (res2.data.result.title) title = res2.data.result.title;
            logger.info('[IG] Success with Backup 1 (Nexoracle)');
          }
        } catch (e) {
          logger.warn(`[IG] Backup 1 (Nexoracle) failed: ${e.message}`);
        }
      }

      // 🩺 TIER 3: Self-Healing Fallback 2 (RyzenDesu)
      if (!mediaUrl) {
        try {
          const res3 = await axios.get(`https://api.ryzendesu.vip/api/downloader/igdl?url=${encodeURIComponent(url)}`, { timeout: 15000 });
          if (res3.data?.data?.length > 0) {
            mediaUrl = res3.data.data[0].url;
            if (mediaUrl.includes('.jpg') || mediaUrl.includes('.webp')) mediaType = 'image';
            logger.info('[IG] Success with Backup 2 (RyzenDesu)');
          }
        } catch (e) {
          logger.warn(`[IG] Backup 2 (RyzenDesu) failed: ${e.message}`);
        }
      }

      // 🛑 If all 3 APIs fail, throw error
      if (!mediaUrl) {
        throw new Error('All download servers are down. Try again later.');
      }

      // Send the media (Video or Image)
      const content = { caption: `✅ *INSTAGRAM DOWNLOADED*\n\n${settings.footer}` };
      if (mediaType === 'video') {
        content.video = { url: mediaUrl };
      } else {
        content.image = { url: mediaUrl };
      }

      await conn.sendMessage(chatId, content, { quoted: mek });
      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

    } catch (e) {
      logger.error(`[INSTAGRAM] Error: ${e.message}`);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (err) {}
      await conn.sendMessage(chatId, {
        text: `❌ *Download Failed*\n\nReason: ${e.message}\n\n_Make sure the link is valid and the account is public._\n\n${settings.footer}`
      }, { quoted: mek });
    }
  }
};