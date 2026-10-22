const settings = require('../../settings');
const axios = require('axios');

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
      
      if (!url) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `Please provide an Instagram link.\n\nExample: .ig https://www.instagram.com/reel/xxxxx\n\n${settings.footer}`
        }, { quoted: mek });
      }

      await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
      await conn.sendMessage(chatId, { text: `Downloading Instagram media...\n\n${settings.footer}` }, { quoted: mek });

      const res = await axios.get(`https://api.vreden.my.id/api/igdownload?url=${encodeURIComponent(url)}`, { timeout: 30000 });
      
      if (!res.data?.result || !res.data.result[0]?.url) {
        throw new Error('No media found');
      }

      const media = res.data.result[0].url;
      
      await conn.sendMessage(chatId, {
        video: { url: media },
        caption: `INSTAGRAM\n\n${settings.footer}`
      }, { quoted: mek });

      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

    } catch (e) {
      console.log('[INSTAGRAM] Error:', e.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (err) {}
      await conn.sendMessage(chatId, {
        text: `Failed to download Instagram media. The link might be invalid or private.\n\n${settings.footer}`
      }, { quoted: mek });
    }
  }
};