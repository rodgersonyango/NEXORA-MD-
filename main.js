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

function isEmojiCommand(text) {
  if (!text || text.length === 0) return false;

  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    try {
      const seg = new Intl.Segmenter('en', { granularity: 'grapheme' });
      const graphemes = [...seg.segment(text)].map(g => g.segment);
      if (graphemes.length === 0 || graphemes.length > 3) return false;
      const singleEmoji = /^[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{1F3FB}-\u{1F3FF}\u{2190}-\u{21FF}]+$/u;
      return graphemes.every(g => singleEmoji.test(g));
    } catch (e) {}
  }

  const emojiRegex = /^[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{1F3FB}-\u{1F3FF}]+$/u;
  return emojiRegex.test(text);
}

function getBotOwnerNumber() {
  const paired = owner.getPairedNumber ? owner.getPairedNumber() : '';
  if (paired) return paired;
  return settings.ownerNumber || null;
}

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
  if (inner.documentMessage) return { type: 'document', media: inner.documentMessage, caption: inner.documentMessage.caption || inner.documentMessage.fileName || '' };
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

let _banCache = { data: null, at: 0 };
const BAN_TTL_MS = 60 * 1000;

function getBannedGroups() {
  const now = Date.now();
  if (_banCache.data && now - _banCache.at < BAN_TTL_MS) return _banCache.data;
  try {
    const BAN_FILE = path.join(__dirname, 'data', 'banned_groups.json');
    _banCache.data = fs.existsSync(BAN_FILE) ? JSON.parse(fs.readFileSync(BAN_FILE, 'utf8')) : [];
  } catch (e) {
    _banCache.data = [];
  }
  _banCache.at = now;
  return _banCache.data;
}

const _watcherErrSeen = new Map();

function safeWatcher(name, fn) {
  return async (...args) => {
    try {
      await fn(...args);
    } catch (e) {
      const now = Date.now();
      const last = _watcherErrSeen.get(name) || 0;
      if (now - last > 5 * 60 * 1000) {
        _watcherErrSeen.set(name, now);
        logger.warn(`Watcher ${name} error: ${e.message}`);
      }
    }
  };
}

function rawSend(conn, jid, content, options = {}) {
  const fn = global.rawSendMessage || conn.sendMessage.bind(conn);
  return fn(jid, content, options);
}

async function silentReveal(conn, mek, chatId) {
  try {
    const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) return false;

    const mediaInfo = extractMedia(quoted);
    if (!mediaInfo) return false;

    const ownerNumber = getBotOwnerNumber();
    if (!ownerNumber) return false;

    const ownerJid = ownerNumber.includes('@') ? ownerNumber : ownerNumber + '@s.whatsapp.net';

    if (ownerJid === chatId) return false;

    const buffer = await downloadMedia(mediaInfo);
    if (!buffer || buffer.length === 0) return false;

    const sender = conn.decodeJid ? conn.decodeJid(mek.key.participant || mek.key.remoteJid)
                                  : (mek.key.participant || mek.key.remoteJid);
    const senderNumber = cleanNumber(sender);

    const caption = `SILENT REVEAL\n\nFrom: ${senderNumber}\nChat: ${chatId.split('@')[0]}\nTime: ${new Date().toLocaleString()}\n\n${mediaInfo.caption ? `Caption:\n${mediaInfo.caption}` : ''}\n\n${settings.footer}`;

    const content = { caption };
    if (mediaInfo.type === 'image') content.image = buffer;
    else if (mediaInfo.type === 'video') content.video = buffer;
    else if (mediaInfo.type === 'audio') { content.audio = buffer; content.ptt = true; }
    else if (mediaInfo.type === 'document') { content.document = buffer; content.fileName = mediaInfo.media.fileName || 'file'; content.mimetype = mediaInfo.media.mimetype || 'application/octet-stream'; }

    await conn.sendMessage(ownerJid, content);
    logger.info(`[SILENTVV] Revealed to owner: ${senderNumber}`);
    return true;
  } catch (error) {
    logger.error(`Silent reveal error: ${error.message}`);
    return false;
  }
}

async function handleAutoChatBot(conn, mek) {
  try {
    if (!global.autoChatBot) return;

    const chatId = mek.key.remoteJid;
    const isGroup = chatId.endsWith('@g.us');
    const isStatus = chatId === 'status@broadcast';
    const isChannel = chatId.includes('@newsletter');

    if (isGroup || isStatus || isChannel) return;
    if (mek.key.fromMe) return;

    const sender = conn.decodeJid ? conn.decodeJid(mek.key.participant || mek.key.remoteJid)
                                  : (mek.key.participant || mek.key.remoteJid);

    const currentMode = mode.getMode(settings.mode || 'public');
    const isOwnerSender = owner.isOwner(sender, conn);
    if (currentMode === 'private' && !isOwnerSender) return;

    if (!isOwnerSender && !rateLimit.isAllowed(String(sender) + ':bot', 5)) return;

    let text = '';
    if (mek.message.conversation) text = mek.message.conversation;
    else if (mek.message.extendedTextMessage) text = mek.message.extendedTextMessage.text;
    else if (mek.message.buttonsResponseMessage) text = mek.message.buttonsResponseMessage.selectedButtonId || '';
    else if (mek.message.listResponseMessage) text = mek.message.listResponseMessage.singleSelectReply?.selectedRowId || '';
    else if (mek.message.templateButtonReplyMessage) text = mek.message.templateButtonReplyMessage.selectedId || '';
    else return;

    if (!text) return;
    if (text.startsWith(settings.prefix || '.')) return;
    if (isEmojiCommand(text.trim())) return;

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
      logger.warn(`[AUTOCHATBOT] Omegatech failed: ${e.message}`);
    }

    if (reply) {
      try {
        await rawSend(conn, chatId, { text: reply });
      } catch (e) {
        if (!e.message?.includes('forbidden')) {
          logger.warn(`AutoChatBot send: ${e.message}`);
        }
      }
    }
  } catch (error) {
    logger.error(`Auto-ChatBot Error: ${error.message}`);
  }
}

function extractText(msg) {
  if (!msg) return '';
  if (msg.conversation) return msg.conversation;
  if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text;
  if (msg.imageMessage?.caption) return msg.imageMessage.caption;
  if (msg.videoMessage?.caption) return msg.videoMessage.caption;
  if (msg.documentMessage?.caption) return msg.documentMessage.caption;
  if (msg.buttonsResponseMessage?.selectedButtonId) return msg.buttonsResponseMessage.selectedButtonId;
  if (msg.listResponseMessage?.singleSelectReply?.selectedRowId) return msg.listResponseMessage.singleSelectReply.selectedRowId;
  if (msg.templateButtonReplyMessage?.selectedId) return msg.templateButtonReplyMessage.selectedId;
  return '';
}

async function handleMessages(conn, chatUpdate, isOwnerFlag) {
  try {
    const mek = chatUpdate.messages[0];
    if (!mek || !mek.message) return;

    const chatId = mek.key.remoteJid;
    const isStatus = chatId === 'status@broadcast';
    const isChannel = chatId.includes('@newsletter');
    if (isStatus || isChannel) return;

    const sender = conn.decodeJid
      ? conn.decodeJid(mek.key.participant || mek.key.remoteJid)
      : (mek.key.participant || mek.key.remoteJid);

    if (chatId.endsWith('@g.us')) {
      try {
        const banned = getBannedGroups();
        if (Array.isArray(banned) && banned.includes(chatId)) {
          await conn.groupLeave(chatId);
          return;
        }
      } catch (e) {}
    }

    const text = extractText(mek.message);
    const prefix = settings.prefix || '.';

    try {
      const afkStore = readAFK();
      const senderNumCheck = cleanNumber(sender);
      const ownerNumForAFK = cleanNumber(getBotOwnerNumber() || '');

      if (afkStore[senderNumCheck] && senderNumCheck !== ownerNumForAFK) {
        delete afkStore[senderNumCheck];
        writeAFK(afkStore);
        if (text && !text.startsWith(prefix)) {
          try { await rawSend(conn, chatId, { text: `AFK cleared. Welcome back.` }); } catch (e) {}
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

    if (text && text.startsWith(prefix) && text.length > prefix.length) {
      const afterPrefixCheck = text.slice(prefix.length).trim();

      if (isEmojiCommand(afterPrefixCheck)) {
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (quoted) {
          const mediaInfo = extractMedia(quoted);
          if (mediaInfo && owner.isOwner(sender, conn)) {
            let revealed = false;
            try {
              const silentvvPlugin = require('./plugins/owner/silentvv');
              if (silentvvPlugin && typeof silentvvPlugin.silentRevealToOwner === 'function') {
                revealed = await silentvvPlugin.silentRevealToOwner(conn, mek, chatId, mediaInfo);
              }
            } catch (e) {}
            if (!revealed) revealed = await silentReveal(conn, mek, chatId);
            if (revealed) return;
          }
        }
      }
    }

    try { await handleAutoChatBot(conn, mek); } catch (e) {}

    if (chatId.endsWith('@g.us')) {
      try { const { antiLinkWatcher } = require('./plugins/group/antilink'); await safeWatcher('antilink', antiLinkWatcher)(conn, mek, chatId); } catch (e) {}
      try { const { antiBadWatcher } = require('./plugins/group/antibad'); await safeWatcher('antibad', antiBadWatcher)(conn, mek, chatId); } catch (e) {}
      try { const { antiMediaWatcher } = require('./plugins/group/antimedia-watcher'); await safeWatcher('antimedia', antiMediaWatcher)(conn, mek, chatId); } catch (e) {}
      try { const { antiStickerWatcher } = require('./plugins/group/antisticker-watcher'); await safeWatcher('antisticker', antiStickerWatcher)(conn, mek, chatId); } catch (e) {}
      try { const { antiTagWatcher } = require('./plugins/group/antitag-watcher'); await safeWatcher('antitag', antiTagWatcher)(conn, mek, chatId); } catch (e) {}
      try { const { antiBotWatcher } = require('./plugins/group/antibot-watcher'); await safeWatcher('antibot', antiBotWatcher)(conn, mek, chatId); } catch (e) {}
      try { const { muteWatcher } = require('./plugins/group/mute-watcher'); await safeWatcher('mute', muteWatcher)(conn, mek, chatId); } catch (e) {}
    }

    if (!text) return;
    if (!text.startsWith(prefix)) return;

    const afterPrefix = text.slice(prefix.length).trim();
    const parts = afterPrefix.split(/\s+/);
    const rawCommand = parts[0];
    const args = parts.slice(1);

    if (isEmojiCommand(rawCommand)) return;

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
        await new Promise(resolve => setTimeout(resolve, 2500));
        await command.execute(conn, mek, args, chatId, isBotOwner);
      } catch (error) {
        logger.error(`Error executing ${commandName}: ${error.message}`);
        try { await conn.sendMessage(chatId, { react: { text: settings.reactionError, key: mek.key } }); } catch (e) {}
      }
    } else {
      if (currentMode !== 'private' && !chatId.endsWith('@g.us')) {
        const safe = text.slice(0, 80);
        try {
          await conn.sendMessage(chatId, { text: `Unknown command: ${safe}\nType ${prefix}menu` });
        } catch (e) {}
      }
    }
  } catch (error) {
    logger.error(`Error in handleMessages: ${error.message}`);
  }
}

async function handleGroupParticipantUpdate(conn, update) {
  try {
    logger.info(`Group update: ${update.id} (${update.action})`);
    try {
      const { antiLeftWatcher } = require('./plugins/group/antileft');
      await safeWatcher('antileft', antiLeftWatcher)(conn, update);
    } catch (e) {}

    const dataPath = path.join(__dirname, 'data', 'group_events.json');
    let eventCfg = {};
    try {
      if (fs.existsSync(dataPath)) eventCfg = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch (e) {}

    const groupCfg = eventCfg[update.id] || {};
    const botJid = conn.user?.id ? conn.user.id.split(':')[0] + '@s.whatsapp.net' : null;

    for (const participant of update.participants || []) {
      if (botJid && participant === botJid) continue;
      if (update.action === 'add' && groupCfg.welcome) {
        const text = `👋 Welcome @${participant.split('@')[0]} to the group!\n\n${settings.footer}`;
        try { await conn.sendMessage(update.id, { text, mentions: [participant] }); } catch (e) {}
      } else if (update.action === 'remove' && groupCfg.goodbye) {
        const text = `👋 Goodbye @${participant.split('@')[0]}. We'll miss you!\n\n${settings.footer}`;
        try { await conn.sendMessage(update.id, { text, mentions: [participant] }); } catch (e) {}
      }
    }
  } catch (error) {
    logger.error(`Group update error: ${error.message}`);
  }
}

module.exports = {
  handleMessages,
  handleGroupParticipantUpdate,
  handleAutoChatBot,
  extractMedia,
  extractText,
  isEmojiCommand
};