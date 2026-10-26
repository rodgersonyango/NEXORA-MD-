/**
 * NEXORA MD - Main Handlers
 * Simple MD-style owner check (paired number = owner)
 * Public/private mode + rate limit
 * Group watchers: anti-link, anti-bad, anti-left, anti-media, anti-sticker, anti-tag, anti-bot, rpp-watchdog
 * Auto-chatbot: Omegatech Chatbot + fallbacks (raw send, no branding)
 * Silent view-once reveal: owner replies with .<emoji>
 * AFK auto-reply for mentioned/DM'd users
 */

const settings = require('./settings');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const mode = require('./lib/mode');
const rateLimit = require('./lib/rateLimit');
const owner = require('./lib/owner');
const logger = require('./lib/logger');

const cleanNumber = owner.cleanNumber;

// ═══════════════════════════════════════════════════════
// EMOJI COMMAND DETECTION
// ═══════════════════════════════════════════════════════
function isEmojiCommand(text) {
  if (!text || text.length === 0) return false;
  const emojiRegex = /^[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{200D}]+$/u;
  return emojiRegex.test(text);
}

function getBotOwnerNumber() {
  const paired = owner.getPairedNumber ? owner.getPairedNumber() : '';
  if (paired) return paired;
  return settings.ownerNumber || null;
}

// ═══════════════════════════════════════════════════════
// MEDIA EXTRACTION
// ═══════════════════════════════════════════════════════
function extractMedia(quoted) {
  if (!quoted) return null;

  let inner = quoted;
  for (let i = 0; i < 4; i++) {
    const wrapper =
      inner.viewOnceMessageV2?.message ||
      inner.viewOnceMessage?.message ||
      inner.viewOnceMessageV2Extension?.message ||
      inner.documentWithCaptionMessage?.message ||
      inner.ephemeralMessage?.message;
    if (wrapper) inner = wrapper;
    else break;
  }

  if (inner.imageMessage) return { type: 'image', media: inner.imageMessage, caption: inner.imageMessage.caption || '' };
  if (inner.videoMessage) return { type: 'video', media: inner.videoMessage, caption: inner.videoMessage.caption || '' };
  if (inner.audioMessage) return { type: 'audio', media: inner.audioMessage, caption: inner.audioMessage.caption || '' };
  return null;
}

async function downloadMedia(mediaInfo) {
  try {
    const stream = await downloadContentFromMessage(mediaInfo.media, mediaInfo.type);
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
  } catch (error) {
    logger.error(`Download failed: ${error.message}`);
    return null;
  }
}

// ═══════════════════════════════════════════════════════
// AFK HELPERS
// ═══════════════════════════════════════════════════════
function readAFK() {
  try {
    if (fs.existsSync('./data/afk.json')) {
      return JSON.parse(fs.readFileSync('./data/afk.json', 'utf8'));
    }
  } catch (e) {}
  return {};
}

function writeAFK(data) {
  try {
    fs.writeFileSync('./data/afk.json', JSON.stringify(data, null, 2));
  } catch (e) {}
}

// ═══════════════════════════════════════════════════════
// RAW SEND — bypasses channel branding
// ═══════════════════════════════════════════════════════
function rawSend(conn, jid, content, options = {}) {
  const fn = global.rawSendMessage || conn.sendMessage.bind(conn);
  return fn(jid, content, options);
}

// ═══════════════════════════════════════════════════════
// SILENT REVEAL — internal fallback
// ═══════════════════════════════════════════════════════
async function silentReveal(conn, mek, chatId) {
  try {
    const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) return false;

    const mediaInfo = extractMedia(quoted);
    if (!mediaInfo) return false;

    const ownerNumber = getBotOwnerNumber();
    if (!ownerNumber) return false;

    const ownerJid = ownerNumber.includes('@') ? ownerNumber : ownerNumber + '@s.whatsapp.net';
    const buffer = await downloadMedia(mediaInfo);
    if (!buffer || buffer.length === 0) return false;

    const sender = mek.key.participant || mek.key.remoteJid;
    const senderNumber = cleanNumber(sender);

    const caption = `SILENT REVEAL

From: ${senderNumber}
Chat: ${chatId.split('@')[0]}
Time: ${new Date().toLocaleString()}

${mediaInfo.caption ? `Caption:\n${mediaInfo.caption}` : ''}

${settings.footer}`;

    const content = { caption };
    if (mediaInfo.type === 'image') content.image = buffer;
    else if (mediaInfo.type === 'video') content.video = buffer;
    else if (mediaInfo.type === 'audio') { content.audio = buffer; content.ptt = true; }

    await conn.sendMessage(ownerJid, content);
    console.log('[MAIN-SILENTVV] Revealed to owner (fallback):', senderNumber);
    return true;
  } catch (error) {
    logger.error(`Silent reveal error: ${error.message}`);
    return false;
  }
}

// ═══════════════════════════════════════════════════════
// AUTO CHATBOT — Omegatech Chatbot + fallbacks
// ═══════════════════════════════════════════════════════
async function handleAutoChatBot(conn, mek) {
  try {
    if (!global.autoChatBot) return;

    const chatId = mek.key.remoteJid;
    const isGroup = chatId.endsWith('@g.us');
    const isStatus = chatId === 'status@broadcast';
    const isChannel = chatId.includes('@newsletter');

    if (isGroup || isStatus || isChannel) return;
    if (mek.key.fromMe) return;

    let text = '';
    if (mek.message.conversation) text = mek.message.conversation;
    else if (mek.message.extendedTextMessage) text = mek.message.extendedTextMessage.text;
    else return;

    if (!text) return;
    if (text.startsWith(settings.prefix || '.')) return;
    if (/^[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]+$/u.test(text.trim())) return;

    const sender = mek.key.participant || mek.key.remoteJid;
    const pushName = mek.pushName || 'User';

    try {
      await conn.sendPresenceUpdate('composing', chatId);
    } catch (e) {}

    let reply = null;
    try {
      const url = `https://api.omegatech.app/api/ai/Chatbot?action=chat&message=${encodeURIComponent(text)}&needSearch=true`;
      const res = await axios.get(url, { headers: { 'Accept': 'application/json' }, timeout: 45000 });
      const candidate = res.data?.reply || res.data?.response || res.data?.message || res.data?.result || res.data?.answer;
      if (candidate && typeof candidate === 'string' && candidate.trim().length > 0) {
        reply = candidate.trim();
      }
    } catch (e) {
      console.log('[AUTOCHATBOT] ❌ Omegatech failed:', e.message);
    }

    if (reply) {
      await rawSend(conn, chatId, { text: reply });
    }
  } catch (error) {
    logger.error(`Auto-ChatBot Error: ${error.message}`);
  }
}

// ═══════════════════════════════════════════════════════
// MAIN MESSAGE HANDLER
// ═══════════════════════════════════════════════════════
async function handleMessages(conn, chatUpdate, isOwnerFlag) {
  try {
    const mek = chatUpdate.messages[0];
    if (!mek || !mek.message) return;

    const chatId = mek.key.remoteJid;
    const isStatus = chatId === 'status@broadcast';
    const isChannel = chatId.includes('@newsletter');

    if (isStatus || isChannel) return;

    // ═════════════════════════════════════════
    // RPP WATCHDOG (BANNED GROUPS)
    // ═════════════════════════════════════════
    if (chatId.endsWith('@g.us')) {
      try {
        const BAN_FILE = path.join(__dirname, 'data', 'banned_groups.json');
        if (fs.existsSync(BAN_FILE)) {
          const banned = JSON.parse(fs.readFileSync(BAN_FILE, 'utf8'));
          if (banned.includes(chatId)) {
            await conn.groupLeave(chatId);
            return; // Stop processing if group is banned
          }
        }
      } catch (e) {}
    }

    let text = '';
    if (mek.message.conversation) text = mek.message.conversation;
    else if (mek.message.extendedTextMessage) text = mek.message.extendedTextMessage.text;
    else if (mek.message.imageMessage) text = mek.message.imageMessage.caption || '';
    else if (mek.message.videoMessage) text = mek.message.videoMessage.caption || '';

    const prefix = settings.prefix || '.';
    const sender = mek.key.participant || mek.key.remoteJid;

    // PRIORITY 1 — AFK AUTO-REPLY
    try {
      const afkStore = readAFK();
      const senderNumCheck = cleanNumber(sender);

      if (afkStore[senderNumCheck]) {
        delete afkStore[senderNumCheck];
        writeAFK(afkStore);

        if (text && !text.startsWith(prefix)) {
          try {
            await rawSend(conn, chatId, { text: `AFK cleared. Welcome back.` });
          } catch (e) {}
        }
      }

      const mentioned = mek.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const quotedUser = mek.message?.extendedTextMessage?.contextInfo?.participant;

      const afkTargets = [...mentioned];
      if (quotedUser) afkTargets.push(quotedUser);

      for (const t of afkTargets) {
        const tNum = cleanNumber(t);
        if (afkStore[tNum]) {
          try {
            await rawSend(conn, chatId, {
              text: `@${tNum} is AFK: ${afkStore[tNum].reason}\nSince: ${afkStore[tNum].time}`,
              mentions: [t]
            });
          } catch (e) {}
        }
      }
    } catch (e) {}

    // PRIORITY 2 — SILENT VIEW-ONCE REVEAL (.emoji)
    if (text && text.startsWith(prefix) && text.length > prefix.length) {
      const afterPrefixCheck = text.slice(prefix.length).trim();

      if (isEmojiCommand(afterPrefixCheck)) {
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!quoted) return;
        const mediaInfo = extractMedia(quoted);
        if (!mediaInfo) return;
        if (!owner.isOwner(sender, conn)) return;

        let revealed = false;
        try {
          const silentvvPlugin = require('./plugins/owner/silentvv');
          if (silentvvPlugin && typeof silentvvPlugin.silentRevealToOwner === 'function') {
            revealed = await silentvvPlugin.silentRevealToOwner(conn, mek, chatId, mediaInfo);
          }
        } catch (e) {}
        if (!revealed) await silentReveal(conn, mek, chatId);
        return;
      }
    }

    // Auto-chatbot
    try { await handleAutoChatBot(conn, mek); } catch (e) {}

    // GROUP WATCHERS
    if (chatId.endsWith('@g.us')) {
      try { const { antiLinkWatcher } = require('./plugins/group/antilink'); await antiLinkWatcher(conn, mek, chatId); } catch (e) {}
      try { const { antiBadWatcher } = require('./plugins/group/antibad'); await antiBadWatcher(conn, mek, chatId); } catch (e) {}
      try { const { antiMediaWatcher } = require('./plugins/group/antimedia-watcher'); await antiMediaWatcher(conn, mek, chatId); } catch (e) {}
      try { const { antiStickerWatcher } = require('./plugins/group/antisticker-watcher'); await antiStickerWatcher(conn, mek, chatId); } catch (e) {}
      try { const { antiTagWatcher } = require('./plugins/group/antitag-watcher'); await antiTagWatcher(conn, mek, chatId); } catch (e) {}
      try { const { antiBotWatcher } = require('./plugins/group/antibot-watcher'); await antiBotWatcher(conn, mek, chatId); } catch (e) {}
      try { const { muteWatcher } = require('./plugins/group/mute-watcher'); await muteWatcher(conn, mek, chatId); } catch (e) {}
    }

    if (!text) return;
    if (!text.startsWith(prefix)) return;

    const afterPrefix = text.slice(prefix.length).trim();
    const parts = afterPrefix.split(' ');
    const rawCommand = parts[0];
    const args = parts.slice(1);

    if (isEmojiCommand(rawCommand)) {
      const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (quoted) {
        const mediaInfo = extractMedia(quoted);
        if (mediaInfo) { await silentReveal(conn, mek, chatId); return; }
      }
      return;
    }

    const commandName = rawCommand.toLowerCase();
    const isBotOwner = owner.isOwner(sender, conn);
    const currentMode = mode.getMode(settings.mode || 'public');

    if (currentMode === 'private' && !isBotOwner) return;
    if (!isBotOwner && !rateLimit.isAllowed(sender, settings.rateLimitPerMinute || 10)) return;

    if (global.commands && global.commands.has(commandName)) {
      const command = global.commands.get(commandName);

      if (command.ownerOnly && !isBotOwner) {
        try { await conn.sendMessage(chatId, { react: { text: settings.reactionError, key: mek.key } }); } catch (e) {}
        return;
      }
      if (command.groupOnly && !chatId.endsWith('@g.us')) {
        try { await conn.sendMessage(chatId, { react: { text: settings.reactionError, key: mek.key } }); } catch (e) {}
        return;
      }

      try {
        await command.execute(conn, mek, args, chatId, isBotOwner);
      } catch (error) {
        logger.error(`Error executing ${commandName}: ${error.message}`);
        try { await conn.sendMessage(chatId, { react: { text: settings.reactionError, key: mek.key } }); } catch (e) {}
      }
    } else {
      if (currentMode !== 'private') {
        await conn.sendMessage(chatId, { text: `Unknown command: ${text}\nType ${prefix}menu` });
      }
    }
  } catch (error) {
    logger.error(`Error in handleMessages: ${error.message}`);
  }
}

// ═══════════════════════════════════════════════════════
// GROUP PARTICIPANT UPDATE
// ═══════════════════════════════════════════════════════
async function handleGroupParticipantUpdate(conn, update) {
  try {
    logger.info(`Group update: ${update.id} (${update.action})`);
    try {
      const { antiLeftWatcher } = require('./plugins/group/antileft');
      await antiLeftWatcher(conn, update);
    } catch (e) {}

    // WELCOME & GOODBYE HANDLER
    const dataPath = path.join(__dirname, 'data', 'group_events.json');
    let eventCfg = {};
    try {
      if (fs.existsSync(dataPath)) eventCfg = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch (e) {}

    const groupCfg = eventCfg[update.id] || {};

    for (const participant of update.participants) {
      if (update.action === 'add' && groupCfg.welcome) {
        const text = `👋 Welcome @${participant.split('@')[0]} to the group!\n\n${settings.footer}`;
        await conn.sendMessage(update.id, { text, mentions: [participant] });
      } else if (update.action === 'remove' && groupCfg.goodbye) {
        const text = `👋 Goodbye @${participant.split('@')[0]}. We'll miss you!\n\n${settings.footer}`;
        await conn.sendMessage(update.id, { text, mentions: [participant] });
      }
    }
  } catch (error) {
    logger.error(`Group update error: ${error.message}`);
  }
}

module.exports = {
  handleMessages,
  handleGroupParticipantUpdate,
  handleAutoChatBot
};