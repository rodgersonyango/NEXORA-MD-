const settings = require('../../settings');

module.exports = {
  name: 'shop',
  aliases: ['store'],
  category: 'rpg',
  description: 'View the RPG shop',
  usage: '.shop',
  react: '🛒',

  async execute(conn, mek, args, chatId, isOwner) {
    const text = 
      `🛒 *RPG SHOP*\n` +
      `───────────────────────\n` +
      `🧪 *Potion:* $1,000\n` +
      `🪵 *Wood:* $500\n` +
      `🪨 *Rock:* $800\n` +
      `⛓ *Iron:* $1,500\n` +
      `🧵 *String:* $200\n` +
      `🔥 *Coal:* $1,000\n` +
      `───────────────────────\n` +
      `Usage: .buy <item> <amount>\n` +
      `Example: .buy potion 5\n\n` +
      `${settings.footer}`;

    await conn.sendMessage(chatId, { text }, { quoted: mek });
  }
};