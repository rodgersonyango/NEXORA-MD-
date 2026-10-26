const settings = require('../../settings');
const { getUser, saveUser } = require('../../lib/rpg');

module.exports = {
  name: 'eat',
  aliases: ['makan'],
  category: 'rpg',
  description: 'Eat food to restore stamina',
  usage: '.eat <dish>',
  react: '🍽️',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      const sender = mek.key.participant || mek.key.remoteJid;
      let user = getUser(sender);
      const type = (args[0] || '').toLowerCase();

      if (!type) {
        return conn.sendMessage(chatId, { 
          text: `🍽️ *FOOD INVENTORY*\n\nUse: .eat <dish>\n\nExample: .eat ayambakar\n\n${settings.footer}` 
        }, { quoted: mek });
      }

      if (user.stamina >= 100) {
        return conn.sendMessage(chatId, { text: `⚠️ Your stamina is already full!` }, { quoted: mek });
      }

      if ((user[type] || 0) < 1) {
        return conn.sendMessage(chatId, { text: `❌ You don't have any **${type}** in your inventory.` }, { quoted: mek });
      }

      user[type] -= 1;
      user.stamina += 20;
      if (user.stamina > 100) user.stamina = 100;
      
      saveUser(sender, user);

      await conn.sendMessage(chatId, { react: { text: '🍽️', key: mek.key } });
      await conn.sendMessage(chatId, {
        text: `😋 *Nyam nyam!*\nYou ate 1x ${type}.\nStamina restored to: ${user.stamina}\n\n${settings.footer}`
      }, { quoted: mek });

    } catch (error) {
      console.log('[EAT] Error:', error.message);
    }
  }
};