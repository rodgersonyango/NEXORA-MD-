const fs = require('fs');
const path = require('path');
const settings = require('../../settings');

const CONFIG_PATH = path.join(__dirname, '..', '..', 'data', 'muted_users.json');

function readConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (e) {}
  return [];
}

async function muteWatcher(conn, mek, chatId) {
  try {
    if (!chatId || !chatId.endsWith('@g.us')) return;

    const muted = readConfig();
    if (muted.length === 0) return;

    const sender = mek.key?.participant || mek.key?.remoteJid || '';
    const senderNum = String(sender).split('@')[0].split(':')[0];
    const ownerNumber = settings.ownerNumber || '';
    const sudoList = Array.isArray(settings.sudoUsers) ? settings.sudoUsers : [];

    if (senderNum === ownerNumber) return;
    if (sudoList.includes(senderNum)) return;

    // Check if sender is in the muted list
    if (!muted.includes(sender)) return;

    let senderIsAdmin = false;
    try {
      const meta = await conn.groupMetadata(chatId);
      const p = meta.participants.find(x => x.id === sender);
      senderIsAdmin = p?.admin === 'admin' || p?.admin === 'superadmin';
    } catch (e) {
      return;
    }

    if (senderIsAdmin) return;

    // Delete the message
    try {
      await conn.sendMessage(chatId, { delete: mek.key });
    } catch (e) {
      console.log('[MUTE] Delete failed:', e.message);
    }

    // Warn the user silently
    try {
      await conn.sendMessage(chatId, {
        text: `You are muted in this group.`,
        mentions: [sender]
      }, { quoted: mek });
    } catch (e) {}

  } catch (e) {
    console.log('[MUTE] Hook error:', e.message);
  }
}

module.exports = { muteWatcher };