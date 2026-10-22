const fs = require('fs');
const path = require('path');
const settings = require('../../settings');

const CONFIG_PATH = path.join(__dirname, '..', '..', 'data', 'antitag.json');

function readConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }
  } catch (e) {}
  return { enabled: false };
}

async function antiTagWatcher(conn, mek, chatId) {
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
    
    // Get the mentions and context info
    const contextInfo = 
      inner.extendedTextMessage?.contextInfo || 
      inner.imageMessage?.contextInfo || 
      inner.videoMessage?.contextInfo;
      
    if (!contextInfo) return;

    const mentioned = contextInfo.mentionedJid || [];
    
    // Check if they mentioned the "status" broadcast
    const mentionsStatus = mentioned.includes('status@broadcast');

    // Check if they mass-tagged (e.g., tagged 10 or more people)
    const isMassTag = mentioned.length >= 10;

    if (!mentionsStatus && !isMassTag) return;

    // 1. Delete the message
    try {
      await conn.sendMessage(chatId, { delete: mek.key });
    } catch (e) {
      console.log('[ANTITAG] Delete failed:', e.message);
    }

    // 2. Send warning
    try {
      await conn.sendMessage(chatId, {
        text: mentionsStatus 
          ? `Mentioning statuses is not allowed here.` 
          : `Mass-tagging is not allowed here.`,
        mentions: [sender]
      }, { quoted: mek });
    } catch (e) {}

    // 3. Kick the user (as requested in the prompt)
    try {
      await conn.groupParticipantsUpdate(chatId, [sender], 'remove');
      await conn.sendMessage(chatId, {
        text: `User has been removed for violating the tag protection rules.`
      });
    } catch (e) {
      console.log('[ANTITAG] Kick failed:', e.message);
    }

  } catch (e) {
    console.log('[ANTITAG] Hook error:', e.message);
  }
}

module.exports = { antiTagWatcher };