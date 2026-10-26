const settings = require('../../settings');
const { getUser, saveUser } = require('../../lib/rpg');

module.exports = {
  name: 'buy',
  aliases: ['beli'],
  category: 'rpg',
  description: 'Buy items from the shop',
  usage: '.buy <item> <amount>',
  react: '🛒',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      const sender = mek.key.participant || mek.key.remoteJid;
      let user = getUser(sender);
      
      const item = (args[0] || '').toLowerCase();
      const amount = parseInt(args[1]) || 1;

      const shop = {
        'potion': { price: 1000, key: 'potion' },
        'wood': { price: 500, key: 'wood' },
        'rock': { price: 800, key: 'rock' },
        'iron': { price: 1500, key: 'iron' },
        'string': { price: 200, key: 'string' },
        'coal': { price: 1000, key: 'coal' }
      };

      if (!shop[item]) {
        return conn.sendMessage(chatId, { text: `❌ Item not found in shop. Type .shop to see available items.` }, { quoted: mek });
      }

      const totalCost = shop[item].price * amount;

      if (user.money < totalCost) {
        return conn.sendMessage(chatId, { text: `❌ *Insufficient Funds*\n\nYou need $${totalCost.toLocaleString()} to buy ${amount}x ${item}.\nYou only have $${user.money.toLocaleString()}.` }, { quoted: mek });
      }

      user.money -= totalCost;
      user[shop[item].key] = (user[shop[item].key] || 0) + amount;
      saveUser(sender, user);

      await conn.sendMessage(chatId, { 
        text: `✅ *PURCHASE SUCCESSFUL*\n\nBought: ${amount}x ${item}\nCost: -$${totalCost.toLocaleString()}\nRemaining Money: $${user.money.toLocaleString()}\n\n${settings.footer}` 
      }, { quoted: mek });
      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

    } catch (e) {}
  }
};