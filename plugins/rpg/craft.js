const settings = require('../../settings');
const { getUser, saveUser } = require('../../lib/rpg');

module.exports = {
  name: 'craft',
  category: 'rpg',
  description: 'Craft items from raw materials',
  usage: '.craft <item>',
  react: '⚒️',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      const sender = mek.key.participant || mek.key.remoteJid;
      const user = getUser(sender);
      const type = (args[0] || '').toLowerCase();

      if (!type) {
        return conn.sendMessage(chatId, {
          text: `⚒️ *FORGE BLUEPRINTS*\n\n` +
                `*Pickaxe:* 10 Wood, 5 Rock, 5 Iron, 20 String\n` +
                `*Sword:* 10 Wood, 15 Iron\n` +
                `*Axe:* 5 Wood, 10 Iron\n` +
                `*FishingRod:* 10 Wood, 2 Iron, 20 String\n\n` +
                `Usage: .craft <item>\n\n${settings.footer}`
        }, { quoted: mek });
      }

      let success = false;
      let msg = '';

      if (type === 'pickaxe') {
        if (user.pickaxe > 0) msg = '❌ You already own a Pickaxe!';
        else if (user.wood < 10 || user.rock < 5 || user.iron < 5 || user.string < 20) msg = '❌ Insufficient materials! Need: 10 Wood, 5 Rock, 5 Iron, 20 String';
        else {
          user.wood -= 10; user.rock -= 5; user.iron -= 5; user.string -= 20;
          user.pickaxe = 1; success = true; msg = '✅ You forged a Pickaxe!';
        }
      } else if (type === 'sword') {
        if (user.sword > 0) msg = '❌ You already own a Sword!';
        else if (user.wood < 10 || user.iron < 15) msg = '❌ Insufficient materials! Need: 10 Wood, 15 Iron';
        else {
          user.wood -= 10; user.iron -= 15;
          user.sword = 1; success = true; msg = '✅ You forged a Sword!';
        }
      } else {
        msg = '❌ Unknown item. Check `.craft` for blueprints.';
      }

      if (success) saveUser(sender, user);
      await conn.sendMessage(chatId, { text: msg + `\n\n${settings.footer}` }, { quoted: mek });
      await conn.sendMessage(chatId, { react: { text: success ? '✅' : '❌', key: mek.key } });

    } catch (error) {
      console.log('[CRAFT] Error:', error.message);
    }
  }
};