const fs = require('fs');
const path = require('path');
const settings = require('../../settings');

const CONFIG_PATH = path.join(__dirname, '..', '..', 'data', 'autochatbot.json');

function readConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }
  } catch (e) {}
  return { enabled: settings.autoChatBot === true };
}

function writeConfig(enabled) {
  try {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ enabled }, null, 2));
  } catch (e) {}
}

module.exports = {
  name: 'chatbot2',
  aliases: ['autochat2', 'aireply2'],
  category: 'owner',
  description: 'Toggle the auto-chatbot on or off',
  usage: '.chatbot2 on|off',
  ownerOnly: true,
  react: '🤖',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      if (!isOwner) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `This command is restricted to the Owner only.\n\n${settings.footer}`
        }, { quoted: mek });
      }

      const cfg = readConfig();
      const sub = (args[0] || '').toLowerCase();

      if (!sub) {
        const status = cfg.enabled ? 'ENABLED' : 'DISABLED';
        return conn.sendMessage(chatId, {
          text:
            `CHATBOT 2 SETTINGS\n\n` +
            `Current Status: ${status}\n\n` +
            `Commands:\n` +
            `  .chatbot2 on   Turn on auto-reply\n` +
            `  .chatbot2 off  Turn off auto-reply\n\n` +
            `${settings.footer}`
        }, { quoted: mek });
      }

      if (sub === 'on') {
        writeConfig(true);
        global.autoChatBot = true;

        await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
        await conn.sendMessage(chatId, {
          text: `Chatbot is now ON.\nIt will now respond to direct messages automatically.\n\n${settings.footer}`
        }, { quoted: mek });
        return;
      }

      if (sub === 'off') {
        writeConfig(false);
        global.autoChatBot = false;

        await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
        await conn.sendMessage(chatId, {
          text: `Chatbot is now OFF.\n\n${settings.footer}`
        }, { quoted: mek });
        return;
      }

      await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
      await conn.sendMessage(chatId, {
        text: `Invalid choice. Use .chatbot2 on or .chatbot2 off\n\n${settings.footer}`
      }, { quoted: mek });

    } catch (error) {
      console.log('[CHATBOT2-CMD] Error:', error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
      await conn.sendMessage(chatId, {
        text: `Error: ${error.message}\n\n${settings.footer}`
      }, { quoted: mek });
    }
  }
};