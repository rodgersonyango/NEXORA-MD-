const settings = require('../../settings');
const { getUser, saveUser } = require('../../lib/rpg');

function clockString(ms) {
  let m = Math.floor(ms / 60000) % 60;
  let s = Math.floor(ms / 1000) % 60;
  return `${m}m ${s}s`;
}

module.exports = {
  name: 'work',
  aliases: ['kerja'],
  category: 'rpg',
  description: 'Work to earn money (1h cooldown)',
  usage: '.work',
  react: '💼',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      const sender = mek.key.participant || mek.key.remoteJid;
      let user = getUser(sender);
      
      const cooldown = 3600000; // 1 Hour
      const diff = Date.now() - (user.lastwork || 0);

      if (diff < cooldown) {
        return conn.sendMessage(chatId, { 
          text: `🕒 *TIRED*\n\nYou are exhausted. Please wait:\n*${clockString(cooldown - diff)}*` 
        }, { quoted: mek });
      }

      const jobs = ['Programmer', 'Driver', 'Chef', 'Security Guard', 'Streamer', 'Doctor', 'Teacher'];
      const job = jobs[Math.floor(Math.random() * jobs.length)];
      const pay = Math.floor(Math.random() * 5000) + 1000; // 1000 - 6000

      user.money += pay;
      user.lastwork = Date.now();
      saveUser(sender, user);

      await conn.sendMessage(chatId, { 
        text: `💼 *WORK COMPLETE*\n\nYou worked as a *${job}*.\n💰 Earned: $${pay.toLocaleString()}\n\n${settings.footer}` 
      }, { quoted: mek });
      await conn.sendMessage(chatId, { react: { text: '💰', key: mek.key } });

    } catch (e) {}
  }
};