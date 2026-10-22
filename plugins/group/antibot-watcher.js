const fs = require('fs');
const path = require('path');
const settings = require('../../settings');

const CONFIG_PATH = path.join(__dirname, '..', '..', 'data', 'antibot.json');

function readConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }
  } catch (e) {}
  return { enabled: false };
}

async function antiBotWatcher(conn, mek, chatId) {
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
    let isSenderBot = false;

    try {
      const meta = await conn.groupMetadata(chatId);
      const p = meta.participants.find(x => x.id === sender);
      senderIsAdmin = p?.admin === 'admin' || p?.admin === 'superadmin';

      // WhatsApp marks bot accounts with the 'bot' field
      // However, for Baileys bots, we check if the message has specific properties 
      // or if the sender's name suggests it's a bot.
      if (mek.key?.fromMe === false) {
        const pushName = mek.pushName || '';
        const msgKeys = Object.keys(mek.message || {});
        
        // Detect Baileys bots by their protocol messages or interactive messages
        const isBaileysBot = 
          msgKeys.includes('protocolMessage') || 
          msgKeys.includes('interactiveMessage') ||
          msgKeys.includes('buttonsMessage') ||
          msgKeys.includes('listMessage') ||
          msgKeys.includes('templateMessage') ||
          msgKeys.includes('carouselMessage') ||
          pushName.toLowerCase().includes('bot') ||
          pushName.toLowerCase().includes('md');

        if (isBaileysBot) {
          isSenderBot = true;
        }
      }

      const botNumber = conn.user?.id?.split(':')[0] + '@s.whatsapp.net';
      const botP = meta.participants.find(x => x.id === botNumber);
      botIsAdmin = botP?.admin === 'admin' || botP?.admin === 'superadmin';
    } catch (e) {
      return;
    }

    if (!botIsAdmin) return;
    if (senderIsAdmin) return;
    if (!isSenderBot) return;

    // Kick the bot
    try {
      await conn.groupParticipantsUpdate(chatId, [sender], 'remove');
    } catch (e) {
      console.log('[ANTIBOT] Kick failed:', e.message);
    }

  } catch (e) {
    console.log('[ANTIBOT] Hook error:', e.message);
  }
}

module.exports = { antiBotWatcher };