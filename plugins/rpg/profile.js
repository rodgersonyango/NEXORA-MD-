const settings = require('../../settings');
const { getUser } = require('../../lib/rpg');

module.exports = {
  name: 'profile',
  aliases: ['me', 'stats'],
  category: 'rpg',
  description: 'Check your RPG stats and inventory',
  usage: '.profile',
  react: '👤',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      const sender = mek.key.participant || mek.key.remoteJid;
      const user = getUser(sender);
      const name = mek.pushName || 'Player';

      const text = 
        `👤 *PLAYER PROFILE: ${name}*\n` +
        `───────────────────────\n` +
        `⭐ *Level:* ${user.level}\n` +
        `✨ *EXP:* ${user.exp.toLocaleString()}\n` +
        `💰 *Money:* $${user.money.toLocaleString()}\n` +
        `───────────────────────\n` +
        `❤️ *Health:* ${user.health}/100\n` +
        `⚡ *Stamina:* ${user.stamina}/100\n` +
        `───────────────────────\n` +
        `🎒 *INVENTORY*\n` +
        `🪵 Wood: ${user.wood} | 🪨 Rock: ${user.rock}\n` +
        `⛓ Iron: ${user.iron} | 🧵 String: ${user.string}\n` +
        `💎 Diamond: ${user.diamond} | 🟢 Emerald: ${user.emerald}\n` +
        `🔥 Coal: ${user.coal}\n` +
        `───────────────────────\n` +
        `⚔️ Sword: ${user.sword} | ⛏ Pickaxe: ${user.pickaxe}\n` +
        `🪓 Axe: ${user.axe} | 🎣 Rod: ${user.fishingrod}\n\n` +
        `${settings.footer}`;

      await conn.sendMessage(chatId, { text }, { quoted: mek });
      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
    } catch (e) {}
  }
};