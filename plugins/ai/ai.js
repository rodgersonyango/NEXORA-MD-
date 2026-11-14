const settings = require('../../settings');
const axios = require('axios');
const logger = require('../../lib/logger');

const API_BASE = 'https://api.omegatech.xyz';

// 🩺 SELF-HEALING MEMORY: Remembers failed APIs for 5 minutes
const deadProviders = new Map();
const DEAD_PROVIDER_TTL = 5 * 60 * 1000;

function isProviderDead(name) {
  const lastFail = deadProviders.get(name);
  if (!lastFail) return false;
  if (Date.now() - lastFail > DEAD_PROVIDER_TTL) {
    deadProviders.delete(name);
    return false;
  }
  return true;
}

function markProviderDead(name, reason) {
  deadProviders.set(name, Date.now());
  logger.warn(`🩺 [AI] Provider "${name}" marked DEAD for 5 mins. Reason: ${reason}`);
}

module.exports = {
  name: 'ai',
  aliases: ['ask', 'gpt', 'chat'],
  category: 'ai',
  description: 'Ask the AI anything',
  usage: '.ai <question>',
  react: '✅',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      let question = args.join(' ').trim();

      if (!question) {
        const contextInfo = mek.message?.extendedTextMessage?.contextInfo;
        const quoted = contextInfo?.quotedMessage;
        if (quoted) {
          const text = quoted.conversation || quoted.extendedTextMessage?.text || quoted.imageMessage?.caption || quoted.videoMessage?.caption || '';
          if (text) question = text.trim();
        }
      }

      if (!question) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        await conn.sendMessage(chatId, {
          text: `🤖 *AI CHAT*\n\nUsage:\n  ${settings.prefix || '.'}ai <question>\n  Reply to a message with ${settings.prefix || '.'}ai\n\nExamples:\n  ${settings.prefix || '.'}ai What is quantum physics?\n  ${settings.prefix || '.'}ai Write a short poem about rain\n\n${settings.footer}`
        });
        return;
      }

      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
      await conn.sendMessage(chatId, { text: `🤖 _Thinking..._` });

      const sender = mek.key.participant || mek.key.remoteJid;
      const senderNum = sender.split('@')[0].split(':')[0];
      const sessionId = 'nexora_' + senderNum;
      const pushName = mek.pushName || 'User';

      let reply = null;

      // 🩺 TIER 1: Omegatech POST (Skipped if dead)
      if (!reply && !isProviderDead('omegatech_post')) {
        try {
          const res = await axios.post(`${API_BASE}/ai/chat`, { message: question, sessionId, name: pushName }, {
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            timeout: 20000
          });
          const candidate = res.data?.reply || res.data?.response || res.data?.message;
          if (candidate && candidate.trim().length > 0) reply = candidate.trim();
          else markProviderDead('omegatech_post', 'Empty Response');
        } catch (e) {
          markProviderDead('omegatech_post', e.message);
        }
      }

      // 🩺 TIER 2: Omegatech GET (Skipped if dead)
      if (!reply && !isProviderDead('omegatech_get')) {
        try {
          const res = await axios.get(`${API_BASE}/ai/chat`, {
            params: { message: question, sessionId, name: pushName },
            timeout: 20000
          });
          const candidate = res.data?.reply || res.data?.response || res.data?.message;
          if (candidate && candidate.trim().length > 0) reply = candidate.trim();
          else markProviderDead('omegatech_get', 'Empty Response');
        } catch (e) {
          markProviderDead('omegatech_get', e.message);
        }
      }

      // 🩺 TIER 3: Pollinations (Skipped if dead)
      if (!reply && !isProviderDead('pollinations')) {
        try {
          const res = await axios.post('https://text.pollinations.ai/openai', {
            model: 'openai',
            messages: [
              { role: 'system', content: 'You are NEXORA, a helpful WhatsApp AI assistant.' },
              { role: 'user', content: question }
            ]
          }, { headers: { 'Content-Type': 'application/json' }, timeout: 25000 });
          const candidate = res.data?.choices?.[0]?.message?.content || (typeof res.data === 'string' ? res.data : null);
          if (candidate && candidate.trim().length > 0) reply = candidate.trim();
          else markProviderDead('pollinations', 'Empty Response');
        } catch (e) {
          markProviderDead('pollinations', e.message);
        }
      }

      if (!reply) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        await conn.sendMessage(chatId, {
          text: `❌ *AI is currently unavailable.*\n\nAll servers are down. The bot will auto-recover when they are back online.\n\n${settings.footer}`
        });
        return;
      }

      reply = reply.replace(/\*\*/g, '*').trim();

      const MAX_LEN = 4000;
      if (reply.length > MAX_LEN) {
        const chunks = [];
        for (let i = 0; i < reply.length; i += MAX_LEN) {
          chunks.push(reply.slice(i, i + MAX_LEN));
        }
        for (let i = 0; i < chunks.length; i++) {
          const label = chunks.length > 1 ? `\n\n_(Part ${i + 1}/${chunks.length})_` : '';
          await conn.sendMessage(chatId, { text: chunks[i] + label });
          await new Promise(r => setTimeout(r, 500));
        }
      } else {
        await conn.sendMessage(chatId, { text: reply });
      }

      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

    } catch (error) {
      logger.error(`[AI] Error: ${error.message}`);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
    }
  }
};