const settings = require('../../settings');
const axios = require('axios');

const API_BASE = 'https://rodgers-smart-apis.onrender.com';

module.exports = {
  name: 'img',
  aliases: ['image', 'imagine', 'aiimg'],
  category: 'ai',
  description: 'Generate an AI image from a text prompt',
  usage: '.img <prompt>',
  react: '🎨',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      let prompt = args.join(' ').trim();

      // Support replying to a message
      if (!prompt) {
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (quoted) {
          prompt =
            quoted.conversation ||
            quoted.extendedTextMessage?.text ||
            '';
          prompt = prompt.trim();
        }
      }

      if (!prompt) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `Please provide a prompt.\n\nExample: .img a cat coding\n\n${settings.footer}`
        }, { quoted: mek });
      }

      await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });

      const response = await axios.get(`${API_BASE}/api/ai/image?prompt=${encodeURIComponent(prompt)}`, {
        timeout: 60000
      });
      const data = response.data;

      if (!data.success || !data.data?.image_url) {
        throw new Error('No image URL returned from API');
      }

      await conn.sendMessage(chatId, {
        image: { url: data.data.image_url },
        caption: `Generated Image\n\nPrompt: ${prompt}\n\n${settings.footer}`
      }, { quoted: mek });

      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

    } catch (error) {
      console.log('[IMG] Error:', error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
      await conn.sendMessage(chatId, {
        text: `Image generation failed. The API might be offline or rate-limited.\n\n${settings.footer}`
      }, { quoted: mek });
    }
  }
};