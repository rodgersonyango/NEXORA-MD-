/**
 * NEXORA MD - WhatsApp Bot
 * Consolidated state loaders + all handlers
 * Owner: paired number (from creds.json)
 */

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('NEXORA MD - WhatsApp Bot is Online');
});

app.listen(PORT, () => {
  console.log(`[NEXORA MD] Web server running on port ${PORT}`);
});

process.env.PUPPETEER_SKIP_DOWNLOAD = 'true';
process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = 'true';

require('./config');
const settings = require('./settings');
const fs = require('fs');
const chalk = require('chalk');
const path = require('path');
const axios = require('axios');

try {
  if (!fs.existsSync('./data')) fs.mkdirSync('./data', { recursive: true });
  if (!fs.existsSync('./data/session')) fs.mkdirSync('./data/session', { recursive: true });
  if (!fs.existsSync('./data/tmp')) fs.mkdirSync('./data/tmp', { recursive: true });
} catch (e) {
  console.log('[NEXORA] Could not create data folders:', e.message);
}

const { handleMessages, handleGroupParticipantUpdate } = require('./main');
const PhoneNumber = require('awesome-phonenumber');
const mode = require('./lib/mode');
const owner = require('./lib/owner');
const logger = require('./lib/logger');
const { wrapSend } = require('./lib/channel');

const { proto } = require('@whiskeysockets/baileys');

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  delay,
  jidNormalizedUser,
  jidDecode
} = require("@whiskeysockets/baileys");

const NodeCache = require("node-cache");
const pino = require("pino");
const readline = require("readline");
const { rmSync } = require('fs');

global.botMode = mode.getMode(settings.mode || 'public');
global.autoWipeSeconds = 0;
global.commands = new Map();
global.autoReadPM = false;
global.hasSentWelcome = false;
global.completeMessageCache = new Map();

const ANTIDELETE_CONFIG_PATH = './data/antidelete_config.json';
const ANTIEDIT_CONFIG_PATH = './data/antiedit.json';
const ANTIBLOCK_CONFIG_PATH = './data/antiblock.json';
const STATUS_CONFIG_PATH = './data/status.json';

function loadAntiDeleteState() {
  try {
    if (fs.existsSync(ANTIDELETE_CONFIG_PATH)) {
      const cfg = JSON.parse(fs.readFileSync(ANTIDELETE_CONFIG_PATH, 'utf8'));
      global.antiDelete = cfg.enabled === true;
      return;
    }
  } catch (e) {
    logger.warn(`[ANTIDELETE] Config read failed: ${e.message}`);
  }
  try {
    if (fs.existsSync('./data/antidelete.json')) {
      const adData = JSON.parse(fs.readFileSync('./data/antidelete.json', 'utf8'));
      global.antiDelete = adData.enabled === true;
      return;
    }
  } catch (e) {}
  global.antiDelete = settings.antiDelete === true;
}
loadAntiDeleteState();

/* Status flags — reloadable at runtime so .statusreact on/off takes effect instantly */
function loadStatusFlags() {
  try {
    if (fs.existsSync(STATUS_CONFIG_PATH)) {
      const sd = JSON.parse(fs.readFileSync(STATUS_CONFIG_PATH, 'utf8'));
      global.autoStatusFlags = {
        seen: sd.view !== false,
        react: sd.react === true
      };
      return;
    }
  } catch (e) {}
  global.autoStatusFlags = {
    seen: settings.autoStatusSeen === true,
    react: settings.autoStatusReact === true
  };
}
loadStatusFlags();

try {
  if (fs.existsSync(ANTIEDIT_CONFIG_PATH)) {
    const aeData = JSON.parse(fs.readFileSync(ANTIEDIT_CONFIG_PATH, 'utf8'));
    global.antiEdit = aeData.enabled === true;
  } else {
    global.antiEdit = false;
  }
} catch (e) {
  global.antiEdit = false;
}

try {
  if (fs.existsSync(ANTIBLOCK_CONFIG_PATH)) {
    const abData = JSON.parse(fs.readFileSync(ANTIBLOCK_CONFIG_PATH, 'utf8'));
    global.antiBlock = abData.enabled === true;
  } else {
    global.antiBlock = false;
  }
} catch (e) {
  global.antiBlock = false;
}

try {
  if (fs.existsSync('./data/alwaysonline.json')) {
    const aoData = JSON.parse(fs.readFileSync('./data/alwaysonline.json', 'utf8'));
    global.alwaysOnline = aoData.enabled === true;
  } else {
    global.alwaysOnline = false;
  }
} catch (e) {
  global.alwaysOnline = false;
}

try {
  if (fs.existsSync('./data/autotyping.json')) {
    const atData = JSON.parse(fs.readFileSync('./data/autotyping.json', 'utf8'));
    global.autoTyping = {
      enabled: atData.enabled === true,
      dm: atData.dm === true,
      groups: atData.groups === true,
      status: atData.status === true
    };
  } else {
    global.autoTyping = { enabled: false, dm: false, groups: false, status: false };
  }
} catch (e) {
  global.autoTyping = { enabled: false, dm: false, groups: false, status: false };
}

try {
  if (fs.existsSync('./data/autorecording.json')) {
    const arData = JSON.parse(fs.readFileSync('./data/autorecording.json', 'utf8'));
    global.autoRecording = {
      enabled: arData.enabled === true,
      dm: arData.dm === true,
      groups: arData.groups === true,
      status: arData.status === true
    };
  } else {
    global.autoRecording = { enabled: false, dm: false, groups: false, status: false };
  }
} catch (e) {
  global.autoRecording = { enabled: false, dm: false, groups: false, status: false };
}

try {
  if (fs.existsSync('./data/autochatbot.json')) {
    const acData = JSON.parse(fs.readFileSync('./data/autochatbot.json', 'utf8'));
    global.autoChatBot = acData.enabled === true;
  } else {
    global.autoChatBot = settings.autoChatBot === true;
  }
} catch (e) {
  global.autoChatBot = settings.autoChatBot === true;
}

try {
  if (fs.existsSync('./data/ghost.json')) {
    const gData = JSON.parse(fs.readFileSync('./data/ghost.json', 'utf8'));
    global.ghostMode = gData.enabled === true;
  } else {
    global.ghostMode = settings.ghostMode === true;
  }
} catch (e) {
  global.ghostMode = false;
}

try {
  if (fs.existsSync('./data/anticall.json')) {
    const acData = JSON.parse(fs.readFileSync('./data/anticall.json', 'utf8'));
    global.antiCall = acData.enabled === true;
  } else {
    global.antiCall = settings.antiCall === true;
  }
} catch (e) {
  global.antiCall = settings.antiCall === true;
}

async function fetchImageBuffer(url) {
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 20000,
    maxRedirects: 5,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'image/*,*/*;q=0.8'
    }
  });

  const type = res.headers['content-type'] || '';
  if (!type.startsWith('image/')) {
    throw new Error(`Not an image: content-type=${type}`);
  }

  return Buffer.from(res.data);
}

function getDefaultReactionEmojis() {
  if (Array.isArray(settings.statusReactionEmojis) && settings.statusReactionEmojis.length > 0) {
    return settings.statusReactionEmojis.slice();
  }
  return [
    '🔥', '❤️', '😍', '👑', '✨', '🌟', '💯', '🎉', '💪', '👏',
    '🙌', '🤩', '😎', '💥', '⭐', '🌈', '🎊', '🎈', '💖', '💗',
    '👍', '🙏', '✌️', '🤝', '😊', '😃', '😂', '🥳', '🤗', '🤔'
  ];
}

function loadReactionEmojis() {
  try {
    if (fs.existsSync('./data/status.json')) {
      const data = JSON.parse(fs.readFileSync('./data/status.json', 'utf8'));
      if (Array.isArray(data.emojis) && data.emojis.length > 0) {
        return data.emojis;
      }
    }
  } catch (e) {}
  return getDefaultReactionEmojis();
}

let REACTION_EMOJIS = loadReactionEmojis();

function loadCommands() {
  const rootDir = path.join(process.cwd(), 'plugins');
  if (!fs.existsSync(rootDir)) fs.mkdirSync(rootDir, { recursive: true });

  const files = [];

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith('.js')) files.push(full);
    }
  }

  walk(rootDir);

  logger.info(`Loading plugins...`);
  global.commands.clear();

  let loaded = 0;

  for (const filePath of files) {
    try {
      delete require.cache[require.resolve(filePath)];
      const command = require(filePath);

      const cmds = Array.isArray(command) ? command : [command];

      for (const cmd of cmds) {
        if (cmd && cmd.name && typeof cmd.execute === 'function') {
          global.commands.set(cmd.name.toLowerCase(), cmd);
          if (Array.isArray(cmd.aliases)) {
            cmd.aliases.forEach(a => global.commands.set(a.toLowerCase(), cmd));
          }
          loaded++;
        }
      }
    } catch (error) {
      logger.error(`Failed to load ${path.basename(filePath)}: ${error.message}`);
    }
  }

  logger.success(`Loaded ${loaded} commands.`);
}

const store = require('./lib/lightweight_store');
store.readFromFile();
setInterval(() => store.writeToFile(), settings.storeWriteInterval || 10000);

const processedMessages = new Set();
setInterval(() => processedMessages.clear(), 3 * 60 * 1000);

let highMemCount = 0;
setInterval(() => {
  const used = process.memoryUsage().rss / 1024 / 1024;
  const limit = settings.maxRamMB || 800;
  if (used > limit) {
    highMemCount++;
    logger.warn(`RAM high (${used.toFixed(0)}MB) — count ${highMemCount}/3`);
    if (highMemCount >= 3) {
      logger.warn('RAM over limit 3x consecutively, restarting...');
      process.exit(1);
    }
  } else {
    highMemCount = 0;
  }
}, 120000);

const CHANNEL_ID = settings.channelId;
const CHANNEL_REACTIONS = settings.channelReactions;
const TOTAL_CHANNEL_REACTIONS = settings.channelReactionsCount;

const pairingCode = settings.usePairingCode;

const rl = process.stdin.isTTY ? readline.createInterface({ input: process.stdin, output: process.stdout }) : null;
const question = (text) => {
  if (rl) return new Promise((resolve) => rl.question(text, resolve));
  return Promise.resolve(settings.ownerNumber || '');
};

const isSystemJid = (jid) => {
  if (!jid) return true;
  if (jid === 'status@broadcast') return false;
  return jid.includes('@broadcast') || jid.includes('@newsletter');
};

function normalizeJidForStore(jid) {
  if (!jid) return jid;
  try {
    if (jid.includes('@s.whatsapp.net') || jid.includes('@g.us')) return jid;
    return jidNormalizedUser(jid);
  } catch (e) { return jid; }
}

/* Resolve a status author into a valid @s.whatsapp.net JID.
   Handles @lid by stripping to bare number only if we can't map it.
   Returns null if we truly can't resolve. */
function resolveStatusAuthorJid(Nexora, mek) {
  let candidate =
    mek.key?.participant ||
    mek.participant ||
    mek.key?.remoteJidAlt ||
    null;

  if (!candidate && mek.message) {
    const keys = Object.keys(mek.message || {});
    for (const k of keys) {
      const inner = mek.message[k];
      const ctx = inner?.contextInfo;
      if (ctx?.participant) { candidate = ctx.participant; break; }
      if (ctx?.remoteJid) { candidate = ctx.remoteJid; break; }
    }
  }

  if (!candidate) return null;

  /* Prefer Baileys' LID→PN mapping if available */
  try {
    if (candidate.includes('@lid') && Nexora?.signalRepository?.lidMapping?.getPNForLID) {
      const mapped = Nexora.signalRepository.lidMapping.getPNForLID(candidate);
      if (mapped) return mapped.includes('@') ? mapped : mapped + '@s.whatsapp.net';
    }
  } catch (e) {}

  if (candidate.includes('@s.whatsapp.net')) return candidate;

  /* Fallback: strip @lid / device and produce a best-effort PN JID */
  const bare = String(candidate).split('@')[0].split(':')[0];
  if (!bare) return null;
  return bare + '@s.whatsapp.net';
}

/* Correct status reaction: use relayMessage with reactionMessage + statusJidList */
async function reactToStatus(Nexora, mek, emoji, statusAuthorJid) {
  const jidList = [statusAuthorJid];
  if (Nexora.user?.id) {
    const botJid = Nexora.user.id.split(':')[0] + '@s.whatsapp.net';
    if (!jidList.includes(botJid)) jidList.push(botJid);
  }

  /* Path A: relayMessage — works on modern Baileys */
  try {
    await Nexora.relayMessage(
      'status@broadcast',
      {
        reactionMessage: {
          key: mek.key,
          text: emoji,
          senderTimestampMs: Date.now()
        }
      },
      {
        messageId: mek.key.id,
        statusJidList: jidList
      }
    );
    return true;
  } catch (e) {
    logger.warn(`[STATUSREACT] relayMessage failed: ${e.message}`);
  }

  /* Path B: sendMessage fallback with explicit react content */
  try {
    await Nexora.sendMessage(
      'status@broadcast',
      { react: { text: emoji, key: mek.key } },
      { statusJidList: jidList }
    );
    return true;
  } catch (e) {
    logger.warn(`[STATUSREACT] sendMessage fallback failed: ${e.message}`);
  }

  return false;
}

let activeSock = null;
let isReconnecting = false;

async function startNexora() {
  try {
    loadCommands();

    try {
      const { loadSession } = require('./lib/session');
      const loaded = await loadSession();
      if (loaded) {
        logger.success('Web session loaded — skipping console pairing');
      } else {
        logger.info('No web session — using console pairing / QR flow');
      }
    } catch (e) {
      logger.warn(`Session loader error: ${e.message}`);
    }

    const sessionFolder = settings.sessionFolder || './data/session';
    if (!fs.existsSync(sessionFolder)) fs.mkdirSync(sessionFolder, { recursive: true });

    let { version } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
    const msgRetryCounterCache = new NodeCache();

    const Nexora = makeWASocket({
      version,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: !pairingCode,
      browser: ["Ubuntu", "Chrome", "20.0.04"],
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
      },
      markOnlineOnConnect: false,
      syncFullHistory: false,
      downloadHistory: false,
      generateHighQualityLinkPreview: false,
      getMessage: async (key) => {
        try {
          const jid = jidNormalizedUser(key.remoteJid);
          const msg = await store.loadMessage(jid, key.id);
          return msg?.message || { conversation: "" };
        } catch (e) {
          return { conversation: "" };
        }
      },
      msgRetryCounterCache,
      defaultQueryTimeoutMs: 60000,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 30000,
      emitOwnEvents: false,
      fireInitQueries: false,
      retryRequestDelayMs: 250,
    });

    activeSock = Nexora;

    const baseSend = Nexora.sendMessage.bind(Nexora);

    const _origRelayMessage = Nexora.relayMessage.bind(Nexora);
    Nexora.relayMessage = async (jid, message, options = {}) => {
      const result = await _origRelayMessage(jid, message, options);
      try {
        if (!(global.antiDelete || global.antiEdit)) return result;
        const messageId = options.messageId || result;
        if (jid && messageId && typeof messageId === 'string') {
          let rawBytes;
          try { rawBytes = Buffer.from(proto.Message.encode(message).finish()); }
          catch { rawBytes = Buffer.from(proto.Message.encode(proto.Message.fromObject(message)).finish()); }
          global.completeMessageCache.set(`${jid}:${messageId}`, rawBytes);
          while (global.completeMessageCache.size > 1000) {
            global.completeMessageCache.delete(global.completeMessageCache.keys().next().value);
          }
        }
      } catch (e) { console.log('[OUTGOING CACHE ERROR]', e.message); }
      return result;
    };

    const wipeSend = async function(jid, content, options = {}) {
      try {
        if (content?.text && options.quoted) {
          const qJid = options.quoted?.key?.remoteJid;
          if (!qJid || qJid !== jid || !options.quoted?.message) {
            delete options.quoted;
          }
        }

        const result = await baseSend(jid, content, options);

        if (global.autoWipeSeconds > 0 &&
            result?.key &&
            !content?.delete &&
            !content?.react &&
            !content?.protocolMessage) {
          setTimeout(async () => {
            try {
              await baseSend(jid, {
                delete: { remoteJid: jid, fromMe: true, id: result.key.id }
              });
            } catch (e) {}
          }, global.autoWipeSeconds * 1000);
        }

        return result;
      } catch (err) {
        if (global.antiBlock &&
            err.message &&
            (err.message.includes('forbidden') ||
             err.message.includes('unauthorized') ||
             err.message.includes('not-authorized'))) {
          try {
            const num = String(jid).split('@')[0];
            const detectedPath = './data/antiblock_detected.json';
            let detected = {};
            if (fs.existsSync(detectedPath)) {
              detected = JSON.parse(fs.readFileSync(detectedPath, 'utf8'));
            }
            if (!detected[num]) {
              detected[num] = { date: new Date().toLocaleString() };
              fs.writeFileSync(detectedPath, JSON.stringify(detected, null, 2));

              const ownerNum = (owner.getPairedNumber && owner.getPairedNumber()) || settings.ownerNumber;
              if (ownerNum) {
                const ownerJid = ownerNum.includes('@') ? ownerNum : ownerNum + '@s.whatsapp.net';
                await baseSend(ownerJid, {
                  text:
                    `ANTI-BLOCK DETECTED\n\n` +
                    `Number: ${num}\n` +
                    `Time: ${new Date().toLocaleString()}\n\n` +
                    `The bot's message to this user failed — likely blocked.\n\n` +
                    `${settings.footer}`
                });
              }
            }
          } catch (e) {}
        }
        throw err;
      }
    };

    Nexora.sendMessage = wrapSend(wipeSend, settings);
    global.rawSendMessage = baseSend;

    Nexora.ev.on('creds.update', async () => {
      await saveCreds();
      try { owner.invalidateCredsCache?.(); } catch (e) {}
    });
    store.bind(Nexora.ev);

    Nexora.ev.on('messages.upsert', async chatUpdate => {
      try {
        if (chatUpdate.type !== 'notify') return;
        const mek = chatUpdate.messages[0];
        if (!mek || !mek.message || !mek.key?.id) return;

        try {
          if ((global.antiDelete || global.antiEdit) &&
              mek?.key?.remoteJid && mek?.key?.id && mek?.message) {
            const cacheKey = `${mek.key.remoteJid}:${mek.key.id}`;
            const rawMessage = proto.Message.fromObject(mek.message);
            const rawBytes = Buffer.from(proto.Message.encode(rawMessage).finish());
            global.completeMessageCache.set(cacheKey, rawBytes);
            while (global.completeMessageCache.size > 1000) {
              global.completeMessageCache.delete(global.completeMessageCache.keys().next().value);
            }
          }
        } catch (cacheError) {
          console.error('[COMPLETE MESSAGE CACHE ERROR]', cacheError.message);
        }

        const chatId = mek.key.remoteJid;
        if (!chatId || isSystemJid(chatId)) return;
        if (processedMessages.has(mek.key.id)) return;
        processedMessages.add(mek.key.id);

        try {
          if (!store.messages[chatId]) store.messages[chatId] = {};
          store.messages[chatId][mek.key.id] = {
            key: mek.key,
            message: mek.message,
            pushName: mek.pushName,
            messageTimestamp: mek.messageTimestamp
          };
          const keys = Object.keys(store.messages[chatId]);
          if (keys.length > 500) {
            const toDelete = keys.slice(0, keys.length - 500);
            toDelete.forEach(k => delete store.messages[chatId][k]);
          }
        } catch (e) {}

        mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage')
          ? mek.message.ephemeralMessage.message
          : mek.message;

        if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return;

        setImmediate(() => {
          handleMessages(Nexora, chatUpdate, true).catch(err => {
            if (!err.message?.includes('rate-overlimit')) {
              logger.error(`Message handler: ${err.message}`);
            }
          });
        });

        if (!global.ghostMode) {
          setImmediate(async () => {
            try {
              if (settings.autoRead && chatId.endsWith('@g.us')) {
                await Nexora.readMessages([mek.key]);
              }
              if (global.autoReadPM && !chatId.endsWith('@g.us')) {
                await Nexora.readMessages([mek.key]);
              }
            } catch (e) {}
          });
        }

        try {
          if (global.autoTyping && global.autoTyping.enabled === true && !mek.key.fromMe) {
            const isGroup = chatId.endsWith('@g.us');
            const isStatus = chatId === 'status@broadcast';

            let send = false;
            if (isStatus && global.autoTyping.status === true) send = true;
            else if (isGroup && global.autoTyping.groups === true) send = true;
            else if (!isGroup && !isStatus && global.autoTyping.dm === true) send = true;

            if (send) {
              await Nexora.sendPresenceUpdate('composing', chatId);
            }
          }
        } catch (error) {}

        try {
          if (global.autoRecording && global.autoRecording.enabled === true && !mek.key.fromMe) {
            const isGroup = chatId.endsWith('@g.us');
            const isStatus = chatId === 'status@broadcast';

            let send = false;
            if (isStatus && global.autoRecording.status === true) send = true;
            else if (isGroup && global.autoRecording.groups === true) send = true;
            else if (!isGroup && !isStatus && global.autoRecording.dm === true) send = true;

            if (send) {
              await Nexora.sendPresenceUpdate('recording', chatId);
            }
          }
        } catch (error) {}

        /* ═══════════════════════════════════════════════════════
           STATUS HANDLER — view + react (FIXED)
           Re-reads status.json each time so .statusreact on/off is instant
        ═══════════════════════════════════════════════════════ */
        try {
          if (chatId === 'status@broadcast') {
            if (!mek || !mek.message) return;

            loadStatusFlags();               // ← fresh flags
            REACTION_EMOJIS = loadReactionEmojis(); // ← fresh emojis

            const autoView = global.autoStatusFlags?.seen === true;
            const autoReact = global.autoStatusFlags?.react === true;

            if (autoView) {
              try {
                await Nexora.readMessages([mek.key]);

                const DATA_PATH = path.join(process.cwd(), 'data', 'status_views.json');
                const today = new Date().toLocaleDateString('en-GB', { timeZone: settings.timeZone || 'Africa/Nairobi' });
                let viewsData = { date: today, count: 0 };
                try {
                  if (fs.existsSync(DATA_PATH)) {
                    viewsData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
                  }
                } catch (e) {}
                if (viewsData.date !== today) {
                  viewsData.date = today;
                  viewsData.count = 0;
                }
                viewsData.count += 1;
                try {
                  if (!fs.existsSync(path.dirname(DATA_PATH))) fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
                  fs.writeFileSync(DATA_PATH, JSON.stringify(viewsData, null, 2));
                } catch (e) {}

              } catch (e) {
                if (e.message?.includes('rate-overlimit')) {
                  await new Promise(r => setTimeout(r, 2000));
                  try { await Nexora.readMessages([mek.key]); } catch (e2) {}
                }
              }
            }

            if (autoReact) {
              try {
                const statusAuthorJid = resolveStatusAuthorJid(Nexora, mek);

                if (!statusAuthorJid) {
                  logger.warn('[STATUSREACT] Could not resolve status author JID — skipping');
                } else if (REACTION_EMOJIS.length === 0) {
                  logger.warn('[STATUSREACT] No emojis configured — skipping');
                } else {
                  const randomEmoji = REACTION_EMOJIS[Math.floor(Math.random() * REACTION_EMOJIS.length)];
                  const ok = await reactToStatus(Nexora, mek, randomEmoji, statusAuthorJid);
                  if (!ok) logger.warn('[STATUSREACT] Reaction failed on all paths');
                }
              } catch (e) {
                if (e.message?.includes('rate-overlimit')) {
                  await new Promise(r => setTimeout(r, 2000));
                } else {
                  logger.warn(`[STATUSREACT] Error: ${e.message}`);
                }
              }
            }
          }
        } catch (error) {
          logger.error(`Status handler: ${error.message}`);
        }

        try {
          if (chatId !== CHANNEL_ID) return;
          if (mek.key.fromMe) return;

          if (Array.isArray(CHANNEL_REACTIONS) && CHANNEL_REACTIONS.length > 0) {
            const randomEmoji = CHANNEL_REACTIONS[Math.floor(Math.random() * CHANNEL_REACTIONS.length)];
            try {
              await Nexora.newsletterReactMessage(CHANNEL_ID, mek.key.id, randomEmoji);
            } catch (e) {
              console.log('[CHANNEL-REACT] Failed:', e.message);
            }
          }
        } catch (error) {}

      } catch (err) {
        logger.error(`messages.upsert: ${err.message}`);
      }
    });

    Nexora.ev.on('messages.update', async (updates) => {
      try {
        for (const update of updates) {
          if (!update.update) continue;

          const protocol = update.update.protocolMessage;

          if (protocol && protocol.type === 0) {
            let adEnabled = false;
            let adDest = 'dm';
            try {
              if (fs.existsSync(ANTIDELETE_CONFIG_PATH)) {
                const cfg = JSON.parse(fs.readFileSync(ANTIDELETE_CONFIG_PATH, 'utf8'));
                adEnabled = cfg.enabled === true;
                adDest = cfg.dest === 'group' ? 'group' : 'dm';
              } else {
                adEnabled = global.antiDelete === true;
              }
            } catch (e) {
              adEnabled = global.antiDelete === true;
            }

            if (!adEnabled) continue;

            const key = protocol.key;
            if (!key) continue;
            if (key.fromMe) continue;

            const rawJid = key.remoteJid;
            const normalizedJid = normalizeJidForStore(rawJid);

            let originalMsg = null;
            try { originalMsg = await store.loadMessage(normalizedJid, key.id); } catch (e) {}
            if (!originalMsg || !originalMsg.message) {
              try { originalMsg = await store.loadMessage(rawJid, key.id); } catch (e) {}
            }

            if ((!originalMsg || !originalMsg.message) && store.messages) {
              const bucket = store.messages[normalizedJid] || store.messages[rawJid];
              if (bucket && bucket[key.id]) originalMsg = bucket[key.id];
            }

            if (!originalMsg || !originalMsg.message) {
              try {
                const messages = await Nexora.loadMessages(normalizedJid, 100);
                originalMsg = messages.find(m => m?.key?.id === key.id);
              } catch (e) {}
            }

            if (!originalMsg || !originalMsg.message) {
              logger.warn(`[ANTIDELETE] Could not find original message ${key.id} in ${normalizedJid}`);
              continue;
            }

            const msgKey = originalMsg.key || key;
            const sender = msgKey.participant || msgKey.remoteJid;

            let senderName = 'Unknown';
            try { senderName = await Nexora.getName(sender) || sender.split('@')[0]; }
            catch { senderName = String(sender).split('@')[0]; }

            const caption = `🛡️ ANTI-DELETE DETECTED

User: ${senderName}
Number: ${String(sender).split('@')[0]}
Chat: ${String(normalizedJid).split('@')[0]}
Time: ${new Date().toLocaleString()}

RECOVERED MESSAGE:`;

            let ownerNum = (owner.getPairedNumber && owner.getPairedNumber()) || settings.ownerNumber;
            let targetJid;
            if (adDest === 'group') {
              targetJid = normalizedJid;
            } else {
              if (!ownerNum) {
                logger.warn('[ANTIDELETE] No owner number — cannot forward to DM');
                continue;
              }
              targetJid = String(ownerNum).includes('@')
                ? ownerNum
                : ownerNum + '@s.whatsapp.net';
            }

            try {
              await Nexora.sendMessage(targetJid, { text: caption, mentions: [sender] });
            } catch (e) {
              logger.error(`[ANTIDELETE] Header send failed: ${e.message}`);
              continue;
            }

            let forwarded = false;
            try {
              await Nexora.copyNForward(targetJid, originalMsg, true);
              forwarded = true;
            } catch (e) {
              logger.warn(`[ANTIDELETE] copyNForward failed: ${e.message}`);
            }

            if (!forwarded) {
              try {
                const m = originalMsg.message;
                const textContent =
                  m.conversation ||
                  m.extendedTextMessage?.text ||
                  m.imageMessage?.caption ||
                  m.videoMessage?.caption ||
                  m.documentMessage?.caption ||
                  null;

                if (textContent) {
                  await Nexora.sendMessage(targetJid, { text: textContent });
                  forwarded = true;
                } else if (m.imageMessage || m.videoMessage || m.audioMessage || m.documentMessage) {
                  const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
                  let mediaType, mediaMsg;
                  if (m.imageMessage) { mediaType = 'image'; mediaMsg = m.imageMessage; }
                  else if (m.videoMessage) { mediaType = 'video'; mediaMsg = m.videoMessage; }
                  else if (m.audioMessage) { mediaType = 'audio'; mediaMsg = m.audioMessage; }
                  else { mediaType = 'document'; mediaMsg = m.documentMessage; }

                  const stream = await downloadContentFromMessage(mediaMsg, mediaType);
                  const chunks = [];
                  for await (const chunk of stream) chunks.push(chunk);
                  const buffer = Buffer.concat(chunks);

                  if (buffer.length > 0) {
                    const content = { caption: mediaMsg.caption || '' };
                    content[mediaType] = buffer;
                    if (mediaType === 'document') {
                      content.fileName = mediaMsg.fileName || 'file';
                      content.mimetype = mediaMsg.mimetype || 'application/octet-stream';
                    }
                    if (mediaType === 'audio' && mediaMsg.ptt) content.ptt = true;
                    await Nexora.sendMessage(targetJid, content);
                    forwarded = true;
                  }
                }
              } catch (e) {
                logger.warn(`[ANTIDELETE] Manual forward failed: ${e.message}`);
              }
            }

            if (!forwarded) {
              try {
                await Nexora.sendMessage(targetJid, {
                  text: '[Could not recover content — message was not in cache]'
                });
              } catch (e) {}
            }
          }

          if (global.antiEdit) {
            const editedMessage = update.update.message?.editedMessage;
            if (!editedMessage) continue;

            const key = update.key;
            if (!key) continue;

            const chatId = key.remoteJid;
            if (!chatId || chatId.endsWith('@g.us')) continue;
            if (chatId === 'status@broadcast' || chatId.includes('@newsletter')) continue;

            let originalMsg = null;
            try { originalMsg = await store.loadMessage(chatId, key.id); } catch (e) {}

            const sender = key.participant || key.remoteJid;
            const senderName = await Nexora.getName(sender) || sender.split('@')[0];

            let originalText = 'unknown';
            if (originalMsg && originalMsg.message) {
              const m = originalMsg.message;
              originalText = m.conversation || m.extendedTextMessage?.text || m.imageMessage?.caption || m.videoMessage?.caption || '[media]';
            }

            let newText = 'unknown';
            const inner = editedMessage.message || editedMessage;
            newText = inner.conversation || inner.extendedTextMessage?.text || inner.imageMessage?.caption || inner.videoMessage?.caption || '[media]';

            const ownerNum = (owner.getPairedNumber && owner.getPairedNumber()) || settings.ownerNumber;
            if (!ownerNum) continue;

            const ownerJid = ownerNum.includes('@') ? ownerNum : ownerNum + '@s.whatsapp.net';

            const caption =
              `ANTI-EDIT DETECTED\n\n` +
              `User: ${senderName}\n` +
              `Number: ${sender.split('@')[0]}\n` +
              `Time: ${new Date().toLocaleString()}\n\n` +
              `ORIGINAL:\n${originalText}\n\n` +
              `EDITED TO:\n${newText}\n\n` +
              `${settings.footer}`;

            try {
              await Nexora.sendMessage(ownerJid, {
                text: caption,
                mentions: [sender]
              });
            } catch (e) {}
          }
        }
      } catch (error) {
        logger.error(`messages.update: ${error.message}`);
      }
    });

    Nexora.ev.on('groups.update', async (updates) => {
      for (const update of updates) {
        try {
          if (!update?.id) continue;
        } catch (e) {}
      }
    });

    Nexora.ev.on('call', async (calls) => {
      try {
        if (!global.antiCall) return;

        let blockedList = [];
        try {
          if (fs.existsSync('./data/callblocked.json')) {
            blockedList = JSON.parse(fs.readFileSync('./data/callblocked.json', 'utf8'));
          }
        } catch (e) {}

        const callWhitelist = Array.isArray(settings.callWhitelist) ? settings.callWhitelist : [];

        for (const call of calls) {
          if (!call.from) continue;

          const callerNum = String(call.from).split('@')[0].split(':')[0].replace(/[^0-9]/g, '');

          try {
            if (typeof Nexora.rejectCall === 'function' && call.id) {
              try {
                await Nexora.rejectCall(call.id, call.from);
              } catch (e1) {
                try {
                  await Nexora.rejectCall(call.id);
                } catch (e2) {}
              }
            }
          } catch (rejectErr) {}

          if (blockedList.some(b => b.number === callerNum)) {
            try {
              await Nexora.updateBlockStatus(call.from, 'block');
            } catch (e) {}
            continue;
          }

          if (callWhitelist.some(n => String(n).replace(/[^0-9]/g, '') === callerNum)) continue;

          const politeMsg =
            `Hi. This number is a WhatsApp bot and cannot receive voice or video calls.\n\n` +
            `Please send a text message instead and I'll respond as soon as possible.\n\n` +
            `Thank you for understanding.`;

          try {
            await Nexora.sendMessage(call.from, { text: politeMsg });
          } catch (e) {}

          try {
            const logPath = './data/call_log.json';
            let log = [];
            if (fs.existsSync(logPath)) {
              log = JSON.parse(fs.readFileSync(logPath, 'utf8'));
            }

            let callerName = 'Unknown';
            try {
              callerName = await Nexora.getName(call.from) || 'Unknown';
            } catch (e) {}

            log.push({
              number: callerNum,
              name: callerName,
              time: new Date().toLocaleString(),
              action: 'rejected-warned'
            });

            if (log.length > 500) log = log.slice(-500);
            fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
          } catch (e) {}
        }
      } catch (error) {
        logger.error(`Anti-Call Error: ${error.message}`);
      }
    });

    Nexora.decodeJid = (jid) => {
      if (!jid) return jid;
      if (/:\d+@/i.test(jid)) {
        let decode = jidDecode(jid) || {};
        return decode.user && decode.server && decode.user + '@' + decode.server || jid;
      }
      return jid;
    };

    Nexora.getName = (jid, withoutContact = false) => {
      let id = Nexora.decodeJid(jid);
      withoutContact = Nexora.withoutContact || withoutContact;
      let v;
      if (id.endsWith("@g.us")) return new Promise(async (resolve) => {
        v = store.contacts[id] || {};
        if (!(v.name || v.subject)) v = Nexora.groupMetadata(id) || {};
        resolve(v.name || v.subject || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international'));
      });
      else v = id === '0@s.whatsapp.net' ? { id, name: 'WhatsApp' } :
        (Nexora.user?.id && id === Nexora.decodeJid(Nexora.user.id)) ? Nexora.user :
        (store.contacts[id] || {});
      return (withoutContact ? '' : v.name) || v.subject || v.verifiedName ||
        PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international');
    };

    let pairingDone = false;

    Nexora.ev.on('connection.update', async (s) => {
      const { connection, lastDisconnect, qr } = s;

      if (pairingCode && !Nexora.authState.creds.registered && !pairingDone && connection === 'connecting') {
        pairingDone = true;
        let phoneNumber = settings.ownerNumber || '';

        if (!phoneNumber) {
          phoneNumber = await question('Enter your WhatsApp number with country code (no + or spaces): ');
        }

        phoneNumber = String(phoneNumber).replace(/[^0-9]/g, '');

        logger.info(`Requesting pairing code...`);

        setTimeout(async () => {
          try {
            let code = await Nexora.requestPairingCode(phoneNumber);
            code = code?.match(/.{1,4}/g)?.join("-") || code;
            console.log(chalk.green(`Pairing code: `) + chalk.white.bold(code));
            console.log(chalk.yellow('Enter this code in WhatsApp > Linked Devices > Link with phone number'));
          } catch (error) {
            pairingDone = false;
            logger.error(`Pairing code error: ${error.message}`);
          }
        }, 5000);
      }

      if (qr && !pairingCode) logger.warn('QR code generated.');
      if (connection === 'connecting') logger.info('Connecting...');

      if (connection === "open") {
        console.log(chalk.magenta.bold(`
    =====================================
           NEXORA MD - ONLINE
    =====================================
        `));
        logger.info(`Bot name : ${settings.botName}`);
        logger.info(`Owner    : ${settings.botOwner}`);
        logger.success('Connected.');

        loadAntiDeleteState();
        loadStatusFlags();
        REACTION_EMOJIS = loadReactionEmojis();

        try {
          const paired = owner.getPairedNumber ? owner.getPairedNumber() : '';
          if (paired) {
            logger.success(`Paired number loaded`);
          } else {
            logger.warn('Could not read paired number from creds.json');
          }
        } catch (e) {}

        try {
          const { startAntiMuteEngine } = require('./plugins/group/antimute-engine');
          startAntiMuteEngine(Nexora);
          logger.success('Auto-Mute Engine started.');
        } catch (e) {
          console.log('[ANTIMUTE] Failed to start engine:', e.message);
        }

        try {
          if (global.alwaysOnline === true) {
            await Nexora.sendPresenceUpdate('available');

            setInterval(async () => {
              try {
                await Nexora.sendPresenceUpdate('available');
              } catch (e) {}
            }, 4 * 60 * 1000);

            logger.success('Always online enabled (global only)');
          }
        } catch (e) {
          console.log('[ALWAYS ONLINE] Failed:', e.message);
        }

        try {
          if (global.ghostMode === true) {
            await Nexora.updateReadReceiptsPrivacy('none');
            logger.success('Ghost mode applied (read receipts off)');
          }
        } catch (e) {
          console.log('[GHOST] Apply failed:', e.message);
        }

        try {
          const autobio = require('./plugins/owner/autobio');
          if (autobio && typeof autobio.startTimer === 'function') {
            autobio.startTimer(Nexora);
          }
        } catch (e) {}

        setTimeout(async () => {
          try {
            const botNumber = Nexora.user?.id ? Nexora.user.id.split(':')[0] + '@s.whatsapp.net' : null;
            if (!botNumber) return;

            const welcomedPath = './data/welcomed.json';
            let welcomedData = {};

            try {
              if (fs.existsSync(welcomedPath)) {
                welcomedData = JSON.parse(fs.readFileSync(welcomedPath, 'utf8'));
              }
            } catch (e) {}

            if (global.hasSentWelcome || welcomedData[botNumber]) {
              return;
            }

            const currentPrefix = settings.prefix || '.';
            const userName = settings.botOwner || 'USER';
            const userNumber = settings.ownerNumber || Nexora.user.id.split(':')[0];

            const welcomeText = `NEXORA MD
Connected successfully.

Bot: ${settings.botName}
Owner: ${userName}
Developer: ${settings.developerName}
Number: ${userNumber}
Prefix: ${currentPrefix}
Status: Online and Ready
Join our channel for updates.

${settings.footer}`;

            const channelContext = settings.channelId ? {
              forwardingScore: 999,
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: settings.channelId,
                newsletterName: settings.botName || 'NEXORA MD',
                serverMessageId: 1
              }
            } : undefined;

            const welcomeImages = Array.isArray(settings.welcomeImages) ? settings.welcomeImages : [];
            const randomImage = welcomeImages.length > 0
              ? welcomeImages[Math.floor(Math.random() * welcomeImages.length)]
              : null;

            let imageSent = false;

            if (randomImage) {
              try {
                const buffer = await fetchImageBuffer(randomImage);
                await Nexora.sendMessage(botNumber, {
                  image: buffer,
                  caption: welcomeText,
                  ...(channelContext ? { contextInfo: channelContext } : {})
                });
                imageSent = true;
                logger.success('Welcome message sent with image.');
              } catch (imgErr) {
                logger.warn(`Welcome image failed: ${imgErr.message}`);
              }
            }

            if (!imageSent) {
              await Nexora.sendMessage(botNumber, {
                text: welcomeText,
                ...(channelContext ? { contextInfo: channelContext } : {})
              });
              logger.success('Welcome message sent (text only).');
            }

            global.hasSentWelcome = true;
            welcomedData[botNumber] = true;
            try {
              if (!fs.existsSync('./data')) fs.mkdirSync('./data', { recursive: true });
              fs.writeFileSync(welcomedPath, JSON.stringify(welcomedData, null, 2));
            } catch (e) {}

          } catch (error) {
            logger.error(`Welcome message error: ${error.message}`);
          }
        }, 5000);
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode ||
          lastDisconnect?.error?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        if (statusCode === DisconnectReason.loggedOut) {
          try {
            rmSync(sessionFolder, { recursive: true, force: true });
            try { owner.invalidateCredsCache?.(); } catch (e) {}
            logger.warn('Session cleared. Please re-authenticate.');
          } catch (e) {}
        }

        if (shouldReconnect && !isReconnecting) {
          isReconnecting = true;
          try {
            activeSock?.ev?.removeAllListeners?.();
            activeSock?.end?.(undefined);
          } catch (e) {}
          activeSock = null;
          await delay(3000);
          isReconnecting = false;
          startNexora();
        }
      }
    });

    Nexora.ev.on('group-participants.update', async (update) => {
      try {
        await handleGroupParticipantUpdate(Nexora, update);
      } catch (e) {
        logger.error(`Group participant update: ${e.message}`);
      }
    });

    return Nexora;
  } catch (error) {
    logger.error(`Error starting bot: ${error.message}`);
    await delay(5000);
    if (!isReconnecting) {
      isReconnecting = true;
      try {
        activeSock?.ev?.removeAllListeners?.();
        activeSock?.end?.(undefined);
      } catch (e) {}
      activeSock = null;
      isReconnecting = false;
      startNexora();
    }
  }
}

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
});

process.on('unhandledRejection', (err) => {
  if (err?.message && err.message.includes('rate-overlimit')) return;
  logger.error(`Unhandled Rejection: ${err?.message}`);
});

startNexora().catch(error => {
  logger.error(`Fatal crash: ${error.message}`);
  process.exit(1);
});