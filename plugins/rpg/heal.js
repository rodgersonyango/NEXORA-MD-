const settings = require('../../settings');
const { getUser, saveUser } = require('../../lib/rpg');

module.exports = {
  name: 'heal',
  category: 'rpg',
  description: 'Use a potion to heal',
  usage: '.heal',
  react: '🧪',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      const sender = mek.key.participant || mek.key.remoteJid;
      let user = getUser(sender);

      if (user.health >= 100) {
        return conn.sendMessage(chatId, { text: `❤️ Your health is already full!\n\n${settings.footer}` }, { quoted: mek });
      }
      if (user.potion < 1) {
        return conn.sendMessage(chatId, { text: `❌ *No Potions!* You need to buy potions first.` }, { quoted: mek });
      }

      const before = user.health;
      user.potion -= 1;
      user.health += 40;
      if (user.health > 100) user.health = 100;

      saveUser(sender, user);
      
      await conn.sendMessage(chatId, { react: { text: '🧪', key: mek.key } });
      await conn.sendMessage(chatId, {
        text: `🧪 *HEAL SUCCESSFUL*\n\nHealth: ${before} → ${user.health}\nYou used 1 Potion.\n\n${settings.footer}`
      }, { quoted: mek });

    } catch (error) {
      console.log('[HEAL] Error:', error.message);
    }
  }
};