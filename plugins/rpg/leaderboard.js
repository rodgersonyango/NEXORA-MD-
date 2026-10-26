const settings = require('../../settings');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'rpg_users.json');

module.exports = {
  name: 'leaderboard',
  aliases: ['lb', 'top'],
  category: 'rpg',
  description: 'Top players by wealth',
  usage: '.leaderboard',
  react: '🏆',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      let db = {};
      try {
        if (fs.existsSync(DB_PATH)) db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      } catch (e) {}

      const players = Object.keys(db).map(jid => ({
        jid,
        money: db[jid].money || 0,
        level: db[jid].level || 1
      }));

      players.sort((a, b) => b.money - a.money);
      const top = players.slice(0, 10);

      let text = `🏆 *TOP 10 RICHEST PLAYERS*\n───────────────────────\n\n`;
      
      top.forEach((p, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
        text += `${medal} @${p.jid.split('@')[0]}\n`;
        text += `   💰 $${p.money.toLocaleString()} | ⭐ Lvl ${p.level}\n\n`;
      });

      if (top.length === 0) text += `No players found yet.`;

      text += `${settings.footer}`;

      await conn.sendMessage(chatId, { 
        text, 
        mentions: top.map(p => p.jid) 
      }, { quoted: mek });
      await conn.sendMessage(chatId, { react: { text: '🏆', key: mek.key } });

    } catch (e) {}
  }
};