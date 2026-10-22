const fs = require('fs');
const path = require('path');
const settings = require('../../settings');

const DATA_PATH = path.join(__dirname, '..', '..', 'data', 'antimute.json');

function readData() {
  try {
    if (fs.existsSync(DATA_PATH)) return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  } catch (e) {}
  return {};
}

function writeData(data) {
  try {
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
  } catch (e) {}
}

module.exports = {
  name: 'antimute',
  aliases: ['schedule', 'autoclose', 'autoopen'],
  category: 'group',
  description: 'Schedule automatic group close/open times',
  usage: '.antimute <close/open> <HH:MM>',
  groupOnly: true,
  react: '⏲️',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      const sender = mek.key.participant || mek.key.remoteJid;
      const meta = await conn.groupMetadata(chatId);
      const p = meta.participants.find(x => x.id === sender);
      const isAdmin = p?.admin === 'admin' || p?.admin === 'superadmin';

      if (!isAdmin && !isOwner) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `This command is for Admins only.\n\n${settings.footer}`
        }, { quoted: mek });
      }

      const action = (args[0] || '').toLowerCase();
      const time = args[1];

      if (!action || !time) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text:
            `Correct Usage:\n\n` +
            `.antimute close 22:00 (Locks group at 10 PM)\n` +
            `.antimute open 06:00  (Unlocks group at 6 AM)\n` +
            `.antimute off         (Removes the schedule)\n\n` +
            `${settings.footer}`
        }, { quoted: mek });
      }

      if (action === 'off') {
        const data = readData();
        delete data[chatId];
        writeData(data);
        await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `Auto-Mute schedule has been removed for this group.\n\n${settings.footer}`
        }, { quoted: mek });
      }

      const [hour, minute] = time.split(':');
      
      if (isNaN(hour) || isNaN(minute) || hour > 23 || hour < 0 || minute > 59 || minute < 0) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `Invalid time format. Use HH:MM (e.g., 22:00)\n\n${settings.footer}`
        }, { quoted: mek });
      }

      const data = readData();
      if (!data[chatId]) data[chatId] = {};
      
      // action can be 'close' or 'open'
      data[chatId][action] = time;
      
      // Keep existing data if only one action is set
      writeData(data);

      // Apply the engine to the running bot instantly
      if (global.antimuteEngine) {
        global.antimuteEngine();
      }

      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
      await conn.sendMessage(chatId, {
        text: `Schedule saved.\nGroup will automatically ${action === 'close' ? 'lock' : 'unlock'} at ${time} daily (Africa/Nairobi time).\n\n${settings.footer}`
      }, { quoted: mek });

    } catch (error) {
      console.log('[ANTIMUTE] Error:', error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
      await conn.sendMessage(chatId, { text: `Error: ${error.message}\n\n${settings.footer}` }, { quoted: mek });
    }
  }
};