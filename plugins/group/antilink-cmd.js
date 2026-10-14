/**
 * NEXORA MD - Anti-Link Command
 * Toggle antilink on/off
 * Usage:
 *   .antilink           - show status
 *   .antilink on        - enable
 *   .antilink off       - disable
 *   .antilink warn on   - enable warnings
 *   .antilink kick on   - enable auto-kick
 */

const settings = require('../../settings');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', '..', 'data', 'antilink.json');

function readConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }
  } catch (e) {}
  return { enabled: settings.antiLink !== false, warn: true, kick: false };
}

function writeConfig(cfg) {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

module.exports = {
  name: 'antilink',
  aliases: ['nolink', 'linkguard'],
  category: 'group',
  description: 'Toggle anti-link protection',
  usage: '.antilink',
  groupOnly: true,
  react: '🔗',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      // Must be admin or owner
      const sender = mek.key.participant || mek.key.remoteJid;
      const meta = await conn.groupMetadata(chatId);
      const p = meta.participants.find(x => x.id === sender);
      const isAdmin = p?.admin === 'admin' || p?.admin === 'superadmin';

      if (!isAdmin && !isOwner) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `Admins only.\n\n${settings.footer}`
        }, { quoted: mek });
      }

      const cfg = readConfig();
      const sub = (args[0] || '').toLowerCase();

      if (!sub) {
        return conn.sendMessage(chatId, {
          text:
            `ANTILINK STATUS\n\n` +
            `Enabled : ${cfg.enabled ? 'ON' : 'OFF'}\n` +
            `Warn    : ${cfg.warn !== false ? 'ON' : 'OFF'}\n` +
            `Kick    : ${cfg.kick === true ? 'ON' : 'OFF'}\n\n` +
            `Commands:\n` +
            `  .antilink on\n` +
            `  .antilink off\n` +
            `  .antilink warn on|off\n` +
            `  .antilink kick on|off\n\n` +
            `${settings.footer}`
        }, { quoted: mek });
      }

      if (sub === 'on' || sub === 'off') {
        cfg.enabled = sub === 'on';
        writeConfig(cfg);
        await conn.sendMessage(chatId, {
          text: `Antilink ${sub === 'on' ? 'ENABLED' : 'DISABLED'}.\n\n${settings.footer}`
        }, { quoted: mek });
        await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
        return;
      }

      if (sub === 'warn') {
        const t = (args[1] || '').toLowerCase();
        if (t === 'on' || t === 'off') {
          cfg.warn = t === 'on';
          writeConfig(cfg);
          await conn.sendMessage(chatId, {
            text: `Warn ${t === 'on' ? 'ENABLED' : 'DISABLED'}.\n\n${settings.footer}`
          }, { quoted: mek });
          await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
        }
        return;
      }

      if (sub === 'kick') {
        const t = (args[1] || '').toLowerCase();
        if (t === 'on' || t === 'off') {
          cfg.kick = t === 'on';
          writeConfig(cfg);
          await conn.sendMessage(chatId, {
            text: `Kick ${t === 'on' ? 'ENABLED' : 'DISABLED'}.\n\n${settings.footer}`
          }, { quoted: mek });
          await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
        }
        return;
      }

      await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
      await conn.sendMessage(chatId, {
        text: `Unknown option "${sub}". Run .antilink for usage.\n\n${settings.footer}`
      }, { quoted: mek });

    } catch (error) {
      console.log('[ANTILINK-CMD] Error:', error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
      await conn.sendMessage(chatId, {
        text: `Error: ${error.message}\n\n${settings.footer}`
      }, { quoted: mek });
    }
  }
};