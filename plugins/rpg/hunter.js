const settings = require('../../settings');
const { getUser, saveUser } = require('../../lib/rpg');

function clockString(ms) {
  let h = Math.floor(ms / 3600000);
  let m = Math.floor(ms / 60000) % 60;
  let s = Math.floor(ms / 1000) % 60;
  return `${h}h ${m}m ${s}s`;
}

module.exports = {
  name: 'hunt',
  aliases: ['hunter'],
  category: 'rpg',
  description: 'Hunt monsters for rewards',
  usage: '.hunt',
  groupOnly: true,
  react: '⚔️',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      const sender = mek.key.participant || mek.key.remoteJid;
      let player = getUser(sender);
      const cooldown = 1200000; // 20 Mins
      const diff = Date.now() - (player.lasthunt || 0);

      if (diff < cooldown) {
        return conn.sendMessage(chatId, { 
          text: `🕒 *RECOVERING*\n\nYou are too wounded to hunt. Please wait:\n*${clockString(cooldown - diff)}*\n\n${settings.footer}` 
        }, { quoted: mek });
      }

      const monsters = ['Goblin', 'Slime', 'Wolf', 'Skeleton', 'Zombie', 'Witch', 'Giant Scorpion', 'Demon', 'Mermaid', 'Killer Robot', 'Baby Dragon'];
      const target = monsters[Math.floor(Math.random() * monsters.length)];
      const damage = Math.floor(Math.random() * 100);
      const money = Math.floor(Math.random() * 100000);
      const exp = Math.floor(Math.random() * 10000);

      player.health -= damage;
      player.lasthunt = Date.now();
      const isDead = player.health <= 0;

      let text = '';
      if (isDead) {
        text = `💀 *FATAL DEFEAT* 💀\n\nTarget: ${target}\nYou were killed in battle!\n\n*PENALTY:* Level -1, Sword Durability -5.\nYou respawned with 100 HP.`;
        if (player.level > 0) player.level -= 1;
        player.health = 100;
      } else {
        player.money += money;
        player.exp += exp;
        text = `⚔️ *HUNT VICTORIOUS* ⚔️\n\nTarget: *${target}*\nDamage Taken: -${damage} HP\n\n💰 +$${money.toLocaleString()}\n✨ +${exp.toLocaleString()} XP\n❤️ Health: ${player.health} HP`;
      }

      saveUser(sender, player);
      await conn.sendMessage(chatId, { text: text + `\n\n${settings.footer}` }, { quoted: mek });
      await conn.sendMessage(chatId, { react: { text: isDead ? '💀' : '✅', key: mek.key } });

    } catch (error) {
      console.log('[HUNTER] Error:', error.message);
    }
  }
};