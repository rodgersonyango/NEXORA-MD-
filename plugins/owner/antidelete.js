const settings = require('../../settings');
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', '..', 'data', 'antidelete_config.json');

function readConfig() {
  try {
    if (fs.existsSync(DATA_PATH)) {
      return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    }
  } catch (e) {}
  return {
    enabled: settings.antiDelete !== false,
    dest: 'dm' // default is sending to DM
  };
}

function writeConfig(cfg) {
  try {
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_PATH, JSON.stringify(cfg, null, 2));
  } catch (e) {}
}

module.exports = {
  name: 'antidelete',
  aliases: ['ad'],
  category: 'owner',
  description: 'Configure anti-delete settings',
  usage: '.antidelete',
  ownerOnly: true,
  react: '🛡️',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      if (!isOwner) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `Access Denied. This command is for the Owner only.\n\n${settings.footer}`
        }, { quoted: mek });
      }

      const cfg = readConfig();
      const sub = (args[0] || '').toLowerCase();

      // Help Menu
      if (!sub) {
        return conn.sendMessage(chatId, {
          text:
            `ANTI-DELETE SETTINGS\n\n` +
            `Current State: ${cfg.enabled ? 'ENABLED' : 'DISABLED'}\n` +
            `Destination: ${cfg.dest === 'group' ? 'GROUP' : 'DM (PRIVATE)'}\n\n` +
            `Usage:\n` +
            `  .antidelete on        Enable system\n` +
            `  .antidelete off       Disable system\n` +
            `  .antidelete set dm    Send deleted items to Owner DM\n` +
            `  .antidelete set group Restore items back to the Group\n\n` +
            `${settings.footer}`
        }, { quoted: mek });
      }

      if (sub === 'on') {
        cfg.enabled = true;
        writeConfig(cfg);
        // Update global variable so bot respects it instantly
        global.antiDelete = true;
        
        await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `Anti-delete system is now ENABLED.\n\n${settings.footer}`
        }, { quoted: mek });
      }

      if (sub === 'off') {
        cfg.enabled = false;
        writeConfig(cfg);
        // Update global variable instantly
        global.antiDelete = false;
        
        await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `Anti-delete system is now DISABLED.\n\n${settings.footer}`
        }, { quoted: mek });
      }

      if (sub === 'set' && args[1]) {
        const mode = args[1].toLowerCase();
        if (mode === 'dm') {
          cfg.dest = 'dm';
          writeConfig(cfg);
          await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
          return conn.sendMessage(chatId, {
            text: `Logs will now be sent to your Private DM.\n\n${settings.footer}`
          }, { quoted: mek });
        } 
        
        if (mode === 'group') {
          cfg.dest = 'group';
          writeConfig(cfg);
          await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
          return conn.sendMessage(chatId, {
            text: `Logs will now be restored back to the Group.\n\n${settings.footer}`
          }, { quoted: mek });
        }
      }

      await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
      await conn.sendMessage(chatId, {
        text: `Invalid command. Type .antidelete for help.\n\n${settings.footer}`
      }, { quoted: mek });

    } catch (error) {
      console.log('[ANTIDELETE-CMD] Error:', error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
      await conn.sendMessage(chatId, {
        text: `Error: ${error.message}\n\n${settings.footer}`
      }, { quoted: mek });
    }
  }
};