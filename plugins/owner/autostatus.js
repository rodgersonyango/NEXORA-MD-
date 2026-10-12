/**
 * NEXORA MD - Auto Status
 * Toggle auto-view and auto-react for statuses
 * Usage:
 *   .autostatus            - show current settings
 *   .autostatus on         - enable auto-view
 *   .autostatus off        - disable auto-view
 *   .autostatus react on   - enable auto-react
 *   .autostatus react off  - disable auto-react
 */

const settings = require('../../settings');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const STATUS_FILE = path.join(DATA_DIR, 'status.json');

function readConfig() {
  try {
    if (fs.existsSync(STATUS_FILE)) {
      return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
    }
  } catch (e) {}
  return { view: true, react: false };
}

function writeConfig(cfg) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STATUS_FILE, JSON.stringify(cfg, null, 2));
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = {
  name: 'autostatus',
  aliases: ['statusview', 'statusreact', 'autoview'],
  category: 'owner',
  description: 'Toggle auto-view and auto-react for WhatsApp statuses',
  usage: '.autostatus',
  ownerOnly: true,
  react: '👁️',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      if (!isOwner) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return;
      }

      const cfg = readConfig();

      // Ensure globals stay in sync
      global.autoStatusFlags = {
        seen: cfg.view !== false,
        react: cfg.react === true
      };

      const sub = (args[0] || '').toLowerCase();

      // ─── NO ARGS → show current status ───
      if (!sub) {
        const emojiList = Array.isArray(settings.statusReactionEmojis)
          ? settings.statusReactionEmojis
          : [];
        const previewEmojis = emojiList.slice(0, 10).join(' ') || '🔥 ❤️ 😍 👑 ✨';

        await conn.sendMessage(chatId, {
          text:
            `AUTO STATUS SETTINGS\n\n` +
            `Auto-view  : ${cfg.view !== false ? 'ENABLED' : 'DISABLED'}\n` +
            `Auto-react : ${cfg.react === true ? 'ENABLED' : 'DISABLED'}\n\n` +
            `Reaction emoji pool (${emojiList.length}):\n${previewEmojis}\n\n` +
            `Commands:\n` +
            `  .autostatus on            enable auto-view\n` +
            `  .autostatus off           disable auto-view\n` +
            `  .autostatus react on      enable auto-react\n` +
            `  .autostatus react off     disable auto-react\n\n` +
            `${settings.footer}`
        }, { quoted: mek });
        return;
      }

      // ─── ON / OFF → toggle view ───
      if (sub === 'on') {
        cfg.view = true;
        writeConfig(cfg);
        global.autoStatusFlags.seen = true;
        await conn.sendMessage(chatId, {
          text: `Auto-view status: ENABLED\n\n${settings.footer}`
        }, { quoted: mek });
        await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
        return;
      }

      if (sub === 'off') {
        cfg.view = false;
        writeConfig(cfg);
        global.autoStatusFlags.seen = false;
        await conn.sendMessage(chatId, {
          text: `Auto-view status: DISABLED\n\n${settings.footer}`
        }, { quoted: mek });
        await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
        return;
      }

      // ─── REACT ON / OFF ───
      if (sub === 'react') {
        const toggle = (args[1] || '').toLowerCase();
        if (toggle === 'on') {
          cfg.react = true;
          writeConfig(cfg);
          global.autoStatusFlags.react = true;
          await conn.sendMessage(chatId, {
            text: `Auto-react status: ENABLED\n\nBot will react with random emojis.\n\n${settings.footer}`
          }, { quoted: mek });
          await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
        } else if (toggle === 'off') {
          cfg.react = false;
          writeConfig(cfg);
          global.autoStatusFlags.react = false;
          await conn.sendMessage(chatId, {
            text: `Auto-react status: DISABLED\n\n${settings.footer}`
          }, { quoted: mek });
          await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
        } else {
          await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
          await conn.sendMessage(chatId, {
            text: `Usage: .autostatus react on | .autostatus react off\n\n${settings.footer}`
          }, { quoted: mek });
        }
        return;
      }

      // ─── UNKNOWN ───
      await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
      await conn.sendMessage(chatId, {
        text: `Unknown option "${sub}". Run .autostatus for usage.\n\n${settings.footer}`
      }, { quoted: mek });

    } catch (error) {
      console.log('[AUTOSTATUS] Error:', error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
      await conn.sendMessage(chatId, {
        text: `Auto status error: ${error.message}\n\n${settings.footer}`
      }, { quoted: mek });
    }
  }
};