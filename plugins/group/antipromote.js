const fs = require('fs');
const path = require('path');
const settings = require('../../settings');

const DATA_PATH = path.join(__dirname, '..', '..', 'data', 'group_events.json');
const EVENT = 'antipromote';

function readData() {
  try {
    if (fs.existsSync(DATA_PATH)) return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  } catch (e) {}
  return {};
}

function writeData(data) {
  const dir = path.dirname(DATA_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

module.exports = {
  name: EVENT,
  category: 'group',
  description: 'Prevent non-admins from promoting members',
  usage: `.${EVENT} on|off`,
  groupOnly: true,
  react: '⚙️',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      const sender = mek.key.participant || mek.key.remoteJid;
      const meta = await conn.groupMetadata(chatId);
      const p = meta.participants.find(x => x.id === sender);
      const isAdmin = p?.admin === 'admin' || p?.admin === 'superadmin';

      if (!isAdmin && !isOwner) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `This command is restricted to Group Admins and the Bot Owner.\n\n${settings.footer}`
        }, { quoted: mek });
      }

      const sub = (args[0] || '').toLowerCase();

      if (!sub || (sub !== 'on' && sub !== 'off')) {
        const data = readData();
        const current = data[chatId]?.[EVENT] ? 'ON' : 'OFF';
        return conn.sendMessage(chatId, {
          text:
            `ANTI-PROMOTE SETTINGS\n\n` +
            `Status: ${current}\n\n` +
            `Usage:\n` +
            `  .${EVENT} on\n` +
            `  .${EVENT} off\n\n` +
            `${settings.footer}`
        }, { quoted: mek });
      }

      const data = readData();
      if (!data[chatId]) data[chatId] = {};
      data[chatId][EVENT] = sub === 'on';
      writeData(data);

      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
      await conn.sendMessage(chatId, {
        text: `${EVENT.toUpperCase()} has been ${sub === 'on' ? 'ENABLED' : 'DISABLED'}.\n\n${settings.footer}`
      }, { quoted: mek });

    } catch (error) {
      console.log(`[${EVENT.toUpperCase()}] Error:`, error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
    }
  }
};