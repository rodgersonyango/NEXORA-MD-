const settings = require('../../settings');
const axios = require('axios');

const API_BASE = 'https://rodgers-smart-apis.onrender.com';

module.exports = {
  name: 'dl',
  aliases: ['download'],
  category: 'download',
  description: 'Universal media downloader',
  usage: '.dl <url>',
  react: '⏳',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      const url = args.join(' ').trim();

      if (!url) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `Please provide a valid link.\n\n${settings.footer}`
        }, { quoted: mek });
      }

      await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });

      const apiUrl = `${API_BASE}/api/download/all?url=${encodeURIComponent(url)}`;
      const response = await axios.get(apiUrl, { timeout: 60000 });
      const data = response.data;

      if (!data.success || !data.data?.video_url) {
        throw new Error('No video URL returned');
      }

      await conn.sendMessage(chatId, {
        video: { url: data.data.video_url },
        caption: `${data.data.title || 'Downloaded Video'}\n\n${settings.footer}`
      }, { quoted: mek });

      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

    } catch (error) {
      console.log('[DL] Error:', error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
      await conn.sendMessage(chatId, {
        text: `Download failed or API offline.\n\n${settings.footer}`
      }, { quoted: mek });
    }
  }
};