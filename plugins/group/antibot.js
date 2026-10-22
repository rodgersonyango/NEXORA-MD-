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

function writeConfig(cfg) {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

module.exports = {
  name: 'antibot',
  aliases: ['nobot'],
  category: 'group',
  description: 'Toggle anti-bot protection in groups',
  usage: '.antibot on|off',
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
            `ANTI-BOT PROTECTION\n\n` +
            `Status: ${cfg.enabled ? 'ON' : 'OFF'}\n\n` +
            `Usage:\n` +
            `  .antibot on   (Kick any other bot that sends a message)\n` +
            `  .antibot off  (Disable protection)\n\n` +
            `${settings.footer}`
        }, { quoted: mek });
      }

      if (sub === 'on' || sub === 'off') {
        cfg.enabled = sub === 'on';
        writeConfig(cfg);
        await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
        await conn.sendMessage(chatId, {
          text: sub === 'on'
            ? `ANTI-BOT ACTIVE\n\nOther bots are not allowed to send messages in this group from now on.\n\n${settings.footer}`
            : `ANTI-BOT DEACTIVATED\n\nProtection is now off.\n\n${settings.footer}`
        }, { quoted: mek });
        return;
      }

      await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
      await conn.sendMessage(chatId, {
        text: `Invalid choice. Use .antibot on or .antibot off\n\n${settings.footer}`
      }, { quoted: mek });

    } catch (error) {
      console.log('[ANTIBOT-CMD] Error:', error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
      await conn.sendMessage(chatId, { text: `Error: ${error.message}\n\n${settings.footer}` }, { quoted: mek });
    }
  }
};