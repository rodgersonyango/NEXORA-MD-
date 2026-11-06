const settings = require('../../settings');
const axios = require('axios');
const logger = require('../../lib/logger');

// 🔥 YOUR VERCEL PROXY URL
const MY_WEBSITE_API = 'https://queenbella-fb-dl.vercel.app/api/proxy'; 

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
      await conn.sendMessage(chatId, { text: `🔵 *Connecting to QueenBella Proxy...*\n\nPlease wait...\n\n${settings.footer}` }, { quoted: mek });

      // 1. Ask your Vercel site to fetch the video
      const response = await axios.get(MY_WEBSITE_API, {
          params: { url: url },
          timeout: 45000 
      });
      
      // 2. Look for the video URL in the response
      // The davidcyril API usually returns { result: { hd: "...", sd: "..." } } or { hd: "...", sd: "..." }
      const data = response.data;
      const videoUrl = data.result?.hd || data.result?.sd || data.hd || data.sd || data.result?.video;

      if (!videoUrl) {
          throw new Error('No video link found in the API response.');
      }

      // 3. Send the Video
      await conn.sendMessage(chatId, {
        video: { url: videoUrl },
        caption: `✅ *Facebook Video Downloaded*\n\n_Processed via QueenBella Proxy._\n\n${settings.footer}`
      }, { quoted: mek });

      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

    } catch (e) {
      logger.error(`[FACEBOOK] Error: ${e.message}`);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (err) {}
      
      await conn.sendMessage(chatId, {
        text: `❌ Failed to download Facebook video.\nReason: ${e.message}\n\n*Note: Make sure the video is public and your Vercel site is working.*\n\n${settings.footer}`
      }, { quoted: mek });
    }
  }
};