const settings = require('../../settings');
const { getUser, saveUser } = require('../../lib/rpg');

function clockString(ms) {
  let m = Math.floor(ms / 60000) % 60;
  let s = Math.floor(ms / 1000) % 60;
  return `${m}m ${s}s`;
}

module.exports = {
  name: 'mine',
  aliases: ['mining', 'gather'],
  category: 'rpg',
  description: 'Gather raw materials (10m cooldown)',
  usage: '.mine',
  react: '⛏️',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      const sender = mek.key.participant || mek.key.remoteJid;
      let user = getUser(sender);
      
      const cooldown = 600000; // 10 Mins
      const diff = Date.now() - (user.lastmine || 0);

      if (diff < cooldown) {
        return conn.sendMessage(chatId, { 
          text: `🕒 *EXHAUSTED*\n\nYou are too tired to mine. Wait:\n*${clockString(cooldown - diff)}*` 
        }, { quoted: mek });
      }

      // Random loot based on chance
      let loot = [];
      let droppedWood = Math.floor(Math.random() * 5) + 1;
      let droppedRock = Math.floor(Math.random() * 3);
      let droppedIron = Math.floor(Math.random() * 2);
      let droppedString = Math.floor(Math.random() * 5);
      let droppedCoal = Math.floor(Math.random() * 2);

      if (droppedWood > 0) { user.wood += droppedWood; loot.push(`🪵 Wood x${droppedWood}`); }
      if (droppedRock > 0) { user.rock += droppedRock; loot.push(`🪨 Rock x${droppedRock}`); }
      if (droppedIron > 0) { user.iron += droppedIron; loot.push(`⛓ Iron x${droppedIron}`); }
      if (droppedString > 0) { user.string += droppedString; loot.push(`🧵 String x${droppedString}`); }
      if (droppedCoal > 0) { user.coal += droppedCoal; loot.push(`🔥 Coal x${droppedCoal}`); }

      user.lastmine = Date.now();
      saveUser(sender, user);

      await conn.sendMessage(chatId, { 
        text: `⛏️ *MINING COMPLETE*\n\nYou gathered:\n${loot.join('\n')}\n\n${settings.footer}` 
      }, { quoted: mek });
      await conn.sendMessage(chatId, { react: { text: '⛏️', key: mek.key } });

    } catch (e) {}
  }
};