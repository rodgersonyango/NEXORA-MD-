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

function writeConfig(cfg) {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

module.exports = {
  name: 'antimedia',
  aliases: ['nomedia', 'blockmedia'],
  category: 'group',
  description: 'Toggle anti-media protection in groups',
  usage: '.antimedia on|off',
  groupOnly: true,
  react: '🚫',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      const sender = mek.key.participant || mek.key.remoteJid;
      const meta = await conn.groupMetadata(chatId);
      const p = meta.participants.find(x => x.id === sender);
      const isAdmin = p?.admin === 'admin' || p?.admin === 'superadmin';

      if (!isAdmin && !isOwner) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `Only Admins can toggle the Anti-Media system.\n\n${settings.footer}`
        }, { quoted: mek });
      }

      const cfg = readConfig();
      const sub = (args[0] || '').toLowerCase();

      if (!sub) {
        return conn.sendMessage(chatId, {
          text:
            `ANTI-MEDIA STATUS\n\n` +
            `Enabled : ${cfg.enabled ? 'ON' : 'OFF'}\n\n` +
            `Usage:\n` +
            `  .antimedia on   (Block all media)\n` +
            `  .antimedia off  (Allow media)\n\n` +
            `${settings.footer}`
        }, { quoted: mek });
      }

      if (sub === 'on' || sub === 'off') {
        cfg.enabled = sub === 'on';
        writeConfig(cfg);
        await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
        await conn.sendMessage(chatId, {
          text: sub === 'on'
            ? `ANTI-MEDIA ENABLED\n\nAll images, videos, audios, and stickers sent by non-admins will be deleted automatically.\n\n${settings.footer}`
            : `ANTI-MEDIA DISABLED\n\nMembers are now allowed to send media files.\n\n${settings.footer}`
        }, { quoted: mek });
        return;
      }

      await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
      await conn.sendMessage(chatId, {
        text: `Invalid choice. Use .antimedia on or .antimedia off\n\n${settings.footer}`
      }, { quoted: mek });

    } catch (error) {
      console.log('[ANTIMEDIA-CMD] Error:', error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
      await conn.sendMessage(chatId, { text: `Error: ${error.message}\n\n${settings.footer}` }, { quoted: mek });
    }
  }
};