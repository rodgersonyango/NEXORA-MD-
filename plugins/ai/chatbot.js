const settings = require('../../settings');
const axios = require('axios');
const logger = require('../../lib/logger');

const OMEGATECH_URL = 'https://api.omegatech.xyz/ai/chat';

// 🩺 SELF-HEALING MEMORY: Remembers failed APIs for 5 minutes to speed up responses
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
  logger.warn(`🩺 [CHATBOT] Provider "${name}" marked DEAD for 5 mins. Reason: ${reason}`);
}

function extractReply(data) {
  if (!data) return null;
  if (data.data && typeof data.data === 'object') {
    const nested = data.data.reply || data.data.response || data.data.message;
    if (nested && typeof nested === 'string') return nested;
  }
  const flat = data.reply || data.response || data.message || data.answer;
  if (flat && typeof flat === 'string') return flat;
  if (data.choices?.[0]?.message?.content) return data.choices[0].message.content;
  if (typeof data === 'string') return data;
  return null;
}

function isQuotaMessage(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return (
    lower.includes('usage limit') || lower.includes('upgrade to vip') ||
    lower.includes('quota') || lower.includes('rate limit') ||
    lower.includes('limit reached') || lower.includes('please upgrade') ||
    lower.includes('not available right now')
  );
}

async function tryOmegatech(question, sessionId, pushName) {
  const res = await axios.post(OMEGATECH_URL, { message: question, sessionId, name: pushName }, {
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    timeout: 25000
  });
  const reply = extractReply(res.data);
  if (!reply) return { ok: false, reason: 'empty' };
  if (isQuotaMessage(reply)) return { ok: false, reason: 'quota', reply };
  return { ok: true, reply: reply.trim() };
}

async function tryPollinationsPost(question) {
  const res = await axios.post('https://text.pollinations.ai/openai', {
    model: 'openai',
    messages: [
      { role: 'system', content: 'You are NEXORA, a helpful WhatsApp AI assistant.' },
      { role: 'user', content: question }
    ]
  }, { headers: { 'Content-Type': 'application/json' }, timeout: 25000 });
  const reply = extractReply(res.data);
  if (!reply || isQuotaMessage(reply)) return { ok: false };
  return { ok: true, reply: reply.trim() };
}

async function tryPollinationsGet(question) {
  const url = `https://text.pollinations.ai/${encodeURIComponent(question)}?model=openai`;
  const res = await axios.get(url, { timeout: 25000 });
  const reply = typeof res.data === 'string' ? res.data : extractReply(res.data);
  if (!reply || isQuotaMessage(reply)) return { ok: false };
  return { ok: true, reply: reply.trim() };
}

async function trySimSimi(question) {
  const url = `https://api.simsimi.net/v2/?text=${encodeURIComponent(question)}&lc=en`;
  const res = await axios.get(url, { timeout: 15000 });
  const reply = res.data?.success || res.data?.response || res.data?.msg;
  if (!reply || reply === 'success' || isQuotaMessage(reply)) return { ok: false };
  return { ok: true, reply: reply.trim() };
}

module.exports = {
  name: 'chatbot',
  aliases: ['bot', 'nexora', 'ai'],
  category: 'ai',
  description: 'Chat with the AI chatbot',
  usage: '.chatbot <question>',
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
          text: `🤖 *AI CHATBOT*\n\nUsage:\n  ${settings.prefix || '.'}chatbot <question>\n  Reply to a message with ${settings.prefix || '.'}chatbot\n\n${settings.footer}`
        });
        return;
      }

      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
      await conn.sendMessage(chatId, { text: `🤖 _Thinking..._` });

      const sender = mek.key.participant || mek.key.remoteJid;
      const senderNum = sender.split('@')[0].split(':')[0];
      const sessionId = 'chatbot_' + senderNum;
      const pushName = mek.pushName || 'User';

      let reply = null;

      // 🩺 TIER 1: Omegatech (Skipped if marked dead)
      if (!reply && !isProviderDead('omegatech')) {
        try {
          const r = await tryOmegatech(question, sessionId, pushName);
          if (r.ok) reply = r.reply;
          else if (r.reason === 'quota') markProviderDead('omegatech', 'Quota Exceeded');
          else markProviderDead('omegatech', 'Empty Response');
        } catch (e) {
          markProviderDead('omegatech', e.message);
        }
      }

      // 🩺 TIER 2: Pollinations POST
      if (!reply && !isProviderDead('pollinations_post')) {
        try {
          const r = await tryPollinationsPost(question);
          if (r.ok) reply = r.reply;
          else markProviderDead('pollinations_post', 'Empty Response');
        } catch (e) {
          markProviderDead('pollinations_post', e.message);
        }
      }

      // 🩺 TIER 3: Pollinations GET
      if (!reply && !isProviderDead('pollinations_get')) {
        try {
          const r = await tryPollinationsGet(question);
          if (r.ok) reply = r.reply;
          else markProviderDead('pollinations_get', 'Empty Response');
        } catch (e) {
          markProviderDead('pollinations_get', e.message);
        }
      }

      // 🩺 TIER 4: SimSimi (Last Resort)
      if (!reply && !isProviderDead('simsimi')) {
        try {
          const r = await trySimSimi(question);
          if (r.ok) reply = r.reply;
          else markProviderDead('simsimi', 'Empty Response');
        } catch (e) {
          markProviderDead('simsimi', e.message);
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
      logger.error(`[CHATBOT] Error: ${error.message}`);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
    }
  }
};