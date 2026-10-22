const settings = require('../../settings');
const os = require('os');

module.exports = {
  name: 'details',
  aliases: ['sysinfo', 'botinfo', 'stats'],
  category: 'general',
  description: 'Show bot and server system details',
  usage: '.details',
  react: 'ℹ️',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      // 1. Uptime
      const uptime = process.uptime();
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = Math.floor(uptime % 60);

      // 2. Server Info
      const ramTotal = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
      const ramFree = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
      const platform = os.platform();
      const arch = os.arch();
      const cpuModel = os.cpus()[0].model;
      const nodeVersion = process.version;

      // 3. Bot Info
      const botName = settings.botName || 'NEXORA MD';
      const owner = settings.botOwner || 'Rodgers';
      const developer = settings.developerName || 'RODGERS';
      const prefix = settings.prefix || '.';
      const totalCommands = global.commands ? global.commands.size : 0;

      const message =
        `SYSTEM DETAILS\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `BOT INFORMATION\n` +
        `▸ Name      : ${botName}\n` +
        `▸ Owner     : ${owner}\n` +
        `▸ Developer : ${developer}\n` +
        `▸ Prefix    : ${prefix}\n` +
        `▸ Commands  : ${totalCommands}\n` +
        `▸ Uptime    : ${hours}h ${minutes}m ${seconds}s\n\n` +
        `SERVER INFORMATION\n` +
        `▸ Platform  : ${platform} (${arch})\n` +
        `▸ Node.js   : ${nodeVersion}\n` +
        `▸ CPU       : ${cpuModel}\n` +
        `▸ Total RAM : ${ramTotal} GB\n` +
        `▸ Free RAM  : ${ramFree} GB\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `${settings.footer}`;

      await conn.sendMessage(chatId, {
        text: message,
        withChannel: true
      }, { quoted: mek });

      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

    } catch (error) {
      console.log('[DETAILS] Error:', error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
      await conn.sendMessage(chatId, {
        text: `Error: ${error.message}\n\n${settings.footer}`
      }, { quoted: mek });
    }
  }
};