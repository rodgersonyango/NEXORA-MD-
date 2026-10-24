const settings = require('../../settings');
const axios = require('axios');

const API_BASE = 'https://rodgers-smart-apis.onrender.com';

module.exports = {
  name: 'img',
  aliases: ['image', 'imagine'],
  category: 'ai',
  description: 'Generate an AI image from a text prompt',
  usage: '.img <prompt>',
  react: '🎨',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      const prompt = args.join(' ').trim();

      if (!prompt) {
        return conn.sendMessage(chatId, {
          text: `Provide a prompt. Example: .img a cat coding\n\n${settings.footer}`
        }, { quoted: mek });
      }

      await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });

      const response = await axios.get(`${API_BASE}/api/ai/image?prompt=${encodeURIComponent(prompt)}`);
      const data = response.data;

      if (data.success) {
        await conn.sendMessage(chatId, {
          image: { url: data.data.image_url },
          caption: `Generated Image\n\n${settings.footer}`
        }, { quoted: mek });

        await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
      } else {
        throw new Error('API returned failure');
      }

    } catch (error) {
      console.log('[IMG] Error:', error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
      await conn.sendMessage(chatId, {
        text: `Image generation failed.\n\n${settings.footer}`
      }, { quoted: mek });
    }
  }
};