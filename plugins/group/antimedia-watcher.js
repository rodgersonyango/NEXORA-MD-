const fs = require('fs');
const path = require('path');
const settings = require('../../settings');

const CONFIG_PATH = path.join(__dirname, '..', '..', 'data', 'antimedia.json');

function readConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }
  } catch (e) {}
  return { enabled: false, warn: true };
}

async function antiMediaWatcher(conn, mek, chatId) {
  try {
    if (!chatId || !chatId.endsWith('@g.us')) return;

    const cfg = readConfig();
    if (cfg.enabled !== true) return;

    const sender = mek.key?.participant || mek.key?.remoteJid || '';
    const senderNum = String(sender).split('@')[0].split(':')[0];
    const ownerNumber = settings.ownerNumber || '';
    const sudoList = Array.isArray(settings.sudoUsers) ? settings.sudoUsers : [];

    if (senderNum === ownerNumber) return;
    if (sudoList.includes(senderNum)) return;

    let senderIsAdmin = false;
    let botIsAdmin = false;

    try {
      const meta = await conn.groupMetadata(chatId);
      const p = meta.participants.find(x => x.id === sender);
      senderIsAdmin = p?.admin === 'admin' || p?.admin === 'superadmin';

      const botNumber = conn.user?.id?.split(':')[0] + '@s.whatsapp.net';
      const botP = meta.participants.find(x => x.id === botNumber);
      botIsAdmin = botP?.admin === 'admin' || botP?.admin === 'superadmin';
    } catch (e) {
      return;
    }

    if (!botIsAdmin) return;
    if (senderIsAdmin) return;

    const msg = mek.message || {};
    const inner = msg.ephemeralMessage?.message || msg;

    const isMedia =
      inner.imageMessage ||
      inner.videoMessage ||
      inner.audioMessage ||
      inner.stickerMessage ||
      inner.documentMessage;

    if (!isMedia) return;

    try {
      await conn.sendMessage(chatId, { delete: mek.key });
    } catch (e) {
      console.log('[ANTIMEDIA] Delete failed:', e.message);
    }

    if (cfg.warn !== false) {
      try {
        await conn.sendMessage(chatId, {
          text: `Media is not allowed in this group.`,
          mentions: [sender]
        }, { quoted: mek });
      } catch (e) {}
    }

  } catch (e) {
    console.log('[ANTIMEDIA] Hook error:', e.message);
  }
}

module.exports = { antiMediaWatcher };