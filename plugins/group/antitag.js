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

function writeConfig(cfg) {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

module.exports = {
  name: 'antitag',
  aliases: ['antistatus', 'notag', 'antimention'],
  category: 'group',
  description: 'Toggle anti-tag protection in groups',
  usage: '.antitag on|off',
  groupOnly: true,
  react: '🛡️',

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

      const cfg = readConfig();
      const sub = (args[0] || '').toLowerCase();

      if (!sub) {
        return conn.sendMessage(chatId, {
          text:
            `ANTI-TAG PROTECTION\n\n` +
            `Status: ${cfg.enabled ? 'ON' : 'OFF'}\n\n` +
            `Usage:\n` +
            `  .antitag on   (Delete & kick users who mention statuses or mass-tag)\n` +
            `  .antitag off  (Disable protection)\n\n` +
            `${settings.footer}`
        }, { quoted: mek });
      }

      if (sub === 'on' || sub === 'off') {
        cfg.enabled = sub === 'on';
        writeConfig(cfg);
        await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
        await conn.sendMessage(chatId, {
          text: sub === 'on'
            ? `ANTI-TAG ENABLED\n\nBot will now delete and kick users who tag @status or mass-tag non-admins.\n\n${settings.footer}`
            : `ANTI-TAG DISABLED\n\nProtection is now off.\n\n${settings.footer}`
        }, { quoted: mek });
        return;
      }

      await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
      await conn.sendMessage(chatId, {
        text: `Invalid choice. Use .antitag on or .antitag off\n\n${settings.footer}`
      }, { quoted: mek });

    } catch (error) {
      console.log('[ANTITAG-CMD] Error:', error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
      await conn.sendMessage(chatId, { text: `Error: ${error.message}\n\n${settings.footer}` }, { quoted: mek });
    }
  }
};