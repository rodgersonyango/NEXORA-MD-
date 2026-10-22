const settings = require('../../settings');
const axios = require('axios');

module.exports = {
  name: 'facebook',
  aliases: ['fb'],
  category: 'download',
  description: 'Download Facebook videos',
  usage: '.facebook <url>',
  react: '🔵',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      const url = args[0];

      if (!url) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `Please provide a Facebook link.\n\nExample: .fb https://www.facebook.com/watch/?v=xxxxx\n\n${settings.footer}`
        }, { quoted: mek });
      }

      await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
      await conn.sendMessage(chatId, { text: `Downloading Facebook video...\n\n${settings.footer}` }, { quoted: mek });

      const res = await axios.get(`https://api.vreden.my.id/api/fbdownload?url=${encodeURIComponent(url)}`, { timeout: 30000 });

      if (!res.data?.result) {
        throw new Error('No video found');
      }

      const video = res.data.result.hd || res.data.result.sd;

      if (!video) {
        throw new Error('No video URL available');
      }

      await conn.sendMessage(chatId, {
        video: { url: video },
        caption: `FACEBOOK\n\n${settings.footer}`
      }, { quoted: mek });

      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

    } catch (e) {
      console.log('[FACEBOOK] Error:', e.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (err) {}
      await conn.sendMessage(chatId, {
        text: `Failed to download Facebook video. The link might be private or invalid.\n\n${settings.footer}`
      }, { quoted: mek });
    }
  }
};