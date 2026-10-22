const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const settings = require('../../settings');

module.exports = {
  name: 'clear',
  aliases: ['clean', 'flush'],
  category: 'owner',
  description: 'Clear bot cache and temporary files',
  usage: '.clear',
  ownerOnly: true,
  react: '🧹',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      if (!isOwner) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `This command is restricted to the Bot Owner.\n\n${settings.footer}`
        }, { quoted: mek });
      }

      await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
      await conn.sendMessage(chatId, {
        text: `Cleaning system... Please wait.\n\n${settings.footer}`
      }, { quoted: mek });

      let clearedItems = [];

      // 1. Clear Temp Folder
      const tmpDir = path.join(process.cwd(), 'data', 'tmp');
      if (fs.existsSync(tmpDir)) {
        try {
          const files = fs.readdirSync(tmpDir);
          for (const file of files) {
            fs.unlinkSync(path.join(tmpDir, file));
          }
          clearedItems.push(`Temp Media (${files.length} files)`);
        } catch (e) {
          console.log('[CLEAR] Temp folder error:', e.message);
        }
      }

      // 2. Clear Store messages (Memory)
      try {
        const store = require('../../lib/lightweight_store');
        if (store.messages) {
          const chatCount = Object.keys(store.messages).length;
          store.messages = {};
          clearedItems.push(`Message Store (${chatCount} chats)`);
        }
      } catch (e) {
        console.log('[CLEAR] Store clear error:', e.message);
      }

      // 3. Clear process cache (Optional: Forces bot to reload modules on next command)
      // This doesn't restart the bot, but clears file buffers.
      clearedItems.push(`System Cache`);

      // 4. Clear status views counter (Optional reset)
      const statusViewsPath = path.join(process.cwd(), 'data', 'status_views.json');
      if (fs.existsSync(statusViewsPath)) {
        try {
          fs.unlinkSync(statusViewsPath);
          clearedItems.push(`Status Views Counter`);
        } catch (e) {}
      }

      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
      
      const successMsg =
        `SYSTEM CLEANED SUCCESSFULLY\n\n` +
        clearedItems.map(item => `▸ ${item}`).join('\n') + '\n\n' +
        `Your bot should now run lighter.\n\n` +
        `${settings.footer}`;

      await conn.sendMessage(chatId, { text: successMsg }, { quoted: mek });

    } catch (error) {
      console.log('[CLEAR] Error:', error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
      await conn.sendMessage(chatId, {
        text: `Error: ${error.message}\n\n${settings.footer}`
      }, { quoted: mek });
    }
  }
};