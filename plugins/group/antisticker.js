const fs = require('fs');
const path = require('path');
const settings = require('../../settings');

const CONFIG_PATH = path.join(__dirname, '..', '..', 'data', 'antisticker.json');

function readConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }
  } catch (e) {}
  return { enabled: false };
}

function writeConfig(cfg) {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

module.exports = {
  name: 'antisticker',
  aliases: ['nosticker', 'blocksticker'],
  category: 'group',
  description: 'Toggle anti-sticker protection in groups',
  usage: '.antisticker on|off',
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
          text: `This command is restricted to Group Admins only.\n\n${settings.footer}`
        }, { quoted: mek });
      }

      const cfg = readConfig();
      const sub = (args[0] || '').toLowerCase();

      if (!sub) {
        return conn.sendMessage(chatId, {
          text:
            `ANTI-STICKER CONTROL\n\n` +
            `Current Status: ${cfg.enabled ? 'ON' : 'OFF'}\n\n` +
            `Usage:\n` +
            `  .antisticker on   (Delete all stickers from non-admins)\n` +
            `  .antisticker off  (Allow stickers)\n\n` +
            `${settings.footer}`
        }, { quoted: mek });
      }

      if (sub === 'on' || sub === 'off') {
        cfg.enabled = sub === 'on';
        writeConfig(cfg);
        await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
        await conn.sendMessage(chatId, {
          text: sub === 'on'
            ? `ANTI-STICKER ENABLED\n\nAll stickers sent by non-admins will be deleted automatically.\n\n${settings.footer}`
            : `ANTI-STICKER DISABLED\n\nMembers are now allowed to send stickers.\n\n${settings.footer}`
        }, { quoted: mek });
        return;
      }

      await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
      await conn.sendMessage(chatId, {
        text: `Invalid choice. Use .antisticker on or .antisticker off\n\n${settings.footer}`
      }, { quoted: mek });

    } catch (error) {
      console.log('[ANTISTICKER-CMD] Error:', error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
      await conn.sendMessage(chatId, { text: `Error: ${error.message}\n\n${settings.footer}` }, { quoted: mek });
    }
  }
};