const settings = require('../../settings');
const axios = require('axios');

const API_URL = 'https://mkzstyleee.vercel.app/ai/blackbox';
const API_KEY = 'FREE-OKBCJB3N-Q9TC';

module.exports = {
  name: 'bot',
  aliases: ['blackbox', 'ask'],
  category: 'ai',
  description: 'Ask the AI anything',
  usage: '.bot <question>',
  react: '🤖',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      let question = args.join(' ').trim();

      // Support replying to a message
      if (!question) {
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (quoted) {
          question =
            quoted.conversation ||
            quoted.extendedTextMessage?.text ||
            quoted.imageMessage?.caption ||
            quoted.videoMessage?.caption ||
            '';
          question = question.trim();
        }
      }

      if (!question) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `Please provide a question.\n\nExample: .bot What is quantum physics?\n\nOr reply to a message with .bot\n\n${settings.footer}`
        }, { quoted: mek });
      }

      await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });

      const res = await axios.get(API_URL, {
        params: {
          text: question,
          apikey: API_KEY
        },
        timeout: 45000,
        headers: { 'Accept': 'application/json' }
      });

      const reply = res.data?.result;

      if (!reply || typeof reply !== 'string' || reply.trim().length === 0) {
        throw new Error('No response from AI');
      }

      // Cleanup formatting
      let cleanReply = reply.replace(/\*\*/g, '*').trim();

      // Split long messages
      const MAX_LEN = 4000;
      if (cleanReply.length > MAX_LEN) {
        const chunks = [];
        for (let i = 0; i < cleanReply.length; i += MAX_LEN) {
          chunks.push(cleanReply.slice(i, i + MAX_LEN));
        }
        for (let i = 0; i < chunks.length; i++) {
          const label = chunks.length > 1 ? `\n\n(Part ${i + 1}/${chunks.length})` : '';
          await conn.sendMessage(chatId, { text: chunks[i] + label }, { quoted: mek });
          await new Promise(r => setTimeout(r, 500));
        }
      } else {
        await conn.sendMessage(chatId, { text: cleanReply }, { quoted: mek });
      }

      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

    } catch (error) {
      console.log('[BOT-AI] Error:', error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
      await conn.sendMessage(chatId, {
        text: `AI is currently unavailable. Try again later.\n\n${settings.footer}`
      }, { quoted: mek });
    }
  }
};