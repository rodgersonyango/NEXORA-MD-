const fs = require('fs');
const path = require('path');
const settings = require('../../settings');

const DATA_PATH = path.join(__dirname, '..', '..', 'data', 'nsfw_groups.json');

function readData() {
  try {
    if (fs.existsSync(DATA_PATH)) return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  } catch (e) {}
  return [];
}

function writeData(data) {
  const dir = path.dirname(DATA_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

module.exports = {
  name: 'nsfw',
  aliases: ['hentai', 'adult'],
  category: 'owner',
  description: 'Toggle NSFW content in this group',
  usage: '.nsfw on|off',
  groupOnly: true,
  react: '🔞',

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
      let groups = readData();
      const isEnabled = groups.includes(chatId);

      if (!sub) {
        return conn.sendMessage(chatId, {
          text:
            `NSFW SETTINGS\n\n` +
            `Status: ${isEnabled ? 'ENABLED' : 'DISABLED'}\n\n` +
            `Usage:\n` +
            `  .nsfw on   (Enable NSFW commands)\n` +
            `  .nsfw off  (Disable NSFW commands)\n\n` +
            `${settings.footer}`
        }, { quoted: mek });
      }

      if (sub === 'on') {
        if (!isEnabled) {
          groups.push(chatId);
          writeData(groups);
        }
        await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `NSFW mode ENABLED for this group.\n\n${settings.footer}`
        }, { quoted: mek });
      }

      if (sub === 'off') {
        if (isEnabled) {
          groups = groups.filter(id => id !== chatId);
          writeData(groups);
        }
        await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `NSFW mode DISABLED for this group.\n\n${settings.footer}`
        }, { quoted: mek });
      }

      await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
      await conn.sendMessage(chatId, {
        text: `Invalid choice. Use .nsfw on or .nsfw off\n\n${settings.footer}`
      }, { quoted: mek });

    } catch (error) {
      console.log('[NSFW] Error:', error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
    }
  }
};