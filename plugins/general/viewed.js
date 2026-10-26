const fs = require('fs');
const path = require('path');
const settings = require('../../settings');

const DATA_PATH = path.join(__dirname, '..', '..', 'data', 'status_views.json');

function getTodayString() {
  return new Date().toLocaleDateString('en-GB', { timeZone: settings.timeZone || 'Africa/Nairobi' });
}

function readData() {
  try {
    if (fs.existsSync(DATA_PATH)) {
      return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    }
  } catch (e) {}
  return { date: getTodayString(), count: 0 };
}

function writeData(data) {
  try {
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
  } catch (e) {}
}

module.exports = {
  name: 'viewed',
  aliases: ['statusviews', 'views'],
  category: 'general',
  description: 'Show how many statuses the bot has viewed today',
  usage: '.viewed',
  react: '👁️',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      const data = readData();
      const today = getTodayString();

      if (data.date !== today) {
        data.date = today;
        data.count = 0;
        writeData(data);
      }

      const currentTime = new Date().toLocaleTimeString('en-GB', {
        timeZone: settings.timeZone || 'Africa/Nairobi',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      // Dynamic status indicator based on activity
      let activityStatus = 'IDLE';
      if (data.count > 50) activityStatus = 'HYPER ACTIVE';
      else if (data.count > 20) activityStatus = 'ACTIVE';
      else if (data.count > 0) activityStatus = 'VIEWING';

      const text = 
        `┏━━━━━━━━━━━━━━━━━━━━━━┓\n` +
        `┃  👁️  𝐒𝐓𝐀𝐓𝐔𝐒 𝐓𝐑𝐀𝐂𝐊𝐄𝐑  \n` +
        `┗━━━━━━━━━━━━━━━━━━━━━━┛\n\n` +
        `  ╭──────────────────────\n` +
        `  │ 📊  Views   : ${String(data.count).padEnd(7)} \n` +
        `  │ 📅  Date    : ${today} \n` +
        `  │ ⏰  Time    : ${currentTime.padEnd(7)} \n` +
        `  │ ⚡  Status  : ${activityStatus.padEnd(7)} \n` +
        `  ╰──────────────────────\n\n` +
        `  ┌────────────────────┐\n` +
        `  │ 🔄 Resets at midnight \n` +
        `  └────────────────────┘\n\n` +
        `${settings.footer}`;

      await conn.sendMessage(chatId, { text }, { quoted: mek });
      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

    } catch (error) {
      console.log('[VIEWED] Error:', error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
      await conn.sendMessage(chatId, {
        text: `Error: ${error.message}\n\n${settings.footer}`
      }, { quoted: mek });
    }
  }
};