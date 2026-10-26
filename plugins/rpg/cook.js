const settings = require('../../settings');
const { getUser, saveUser } = require('../../lib/rpg');

module.exports = {
  name: 'cook',
  aliases: ['masak'],
  category: 'rpg',
  description: 'Cook food to restore stamina',
  usage: '.cook <dish>',
  react: '🍳',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      const sender = mek.key.participant || mek.key.remoteJid;
      let user = getUser(sender);
      const dish = (args[0] || '').toLowerCase();

      const recipes = {
        'ayambakar': { raw: 'ayam', needed: 2, name: 'Ayam Bakar' },
        'ayamgoreng': { raw: 'ayam', needed: 2, name: 'Ayam Goreng' },
        'steak': { raw: 'sapi', needed: 2, name: 'Steak' },
        'rendang': { raw: 'sapi', needed: 2, name: 'Rendang' }
      };

      if (!dish) {
        return conn.sendMessage(chatId, { 
          text: `🍳 *KITCHEN MENU*\n\n` +
                `• ayambakar\n• ayamgoreng\n• steak\n• rendang\n\n` +
                `Usage: .cook <dish>\nRequired: 2 Raw Meat + 1 Coal\n\n${settings.footer}` 
        }, { quoted: mek });
      }

      const recipe = recipes[dish];
      if (!recipe) {
        return conn.sendMessage(chatId, { text: `❌ Unknown dish. Type .cook to see the menu.` }, { quoted: mek });
      }

      // Check materials (using 'ayam' / 'sapi' as raw materials)
      if ((user[recipe.raw] || 0) < recipe.needed || (user.coal || 0) < 1) {
        return conn.sendMessage(chatId, { 
          text: `❌ *Missing Ingredients*\n\nTo cook 1x ${recipe.name}, you need:\n• ${recipe.needed} ${recipe.raw}\n• 1 Coal\n\n${settings.footer}` 
        }, { quoted: mek });
      }

      // Deduct & Add
      user[recipe.raw] -= recipe.needed;
      user.coal -= 1;
      user[dish] = (user[dish] || 0) + 1;
      saveUser(sender, user);

      await conn.sendMessage(chatId, { react: { text: '🍳', key: mek.key } });
      await conn.sendMessage(chatId, {
        text: `✅ *COOKING SUCCESSFUL*\n\nDish Prepared: 1x ${recipe.name}\nConsumed: ${recipe.needed} ${recipe.raw} & 1 Coal\n\n${settings.footer}`
      }, { quoted: mek });

    } catch (error) {
      console.log('[COOK] Error:', error.message);
    }
  }
};