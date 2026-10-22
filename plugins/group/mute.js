const fs = require('fs');
const path = require('path');
const settings = require('../../settings');

const CONFIG_PATH = path.join(__dirname, '..', '..', 'data', 'muted_users.json');

function readConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }
  } catch (e) {}
  return [];
}

function writeConfig(data) {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2));
}

module.exports = {
  name: 'ban-chat',
  aliases: ['mute', 'banchat'],
  category: 'group',
  description: 'Mute a user so their messages are auto-deleted',
  usage: '.ban-chat @user',
  groupOnly: true,
  react: '🚫',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      const sender = mek.key.participant || mek.key.remoteJid;
      const meta = await conn.groupMetadata(chatId);
      const p = meta.participants.find(x => x.id === sender);
      const isAdmin = p?.admin === 'admin' || p?.admin === 'superadmin';
      
      const botNumber = conn.user.id.split(':')[0] + '@s.whatsapp.net';
      const botP = meta.participants.find(x => x.id === botNumber);
      const botIsAdmin = botP?.admin === 'admin' || botP?.admin === 'superadmin';

      if (!isAdmin && !isOwner) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, { text: `Only Admins can use this command.\n\n${settings.footer}` }, { quoted: mek });
      }
      
      if (!botIsAdmin) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, { text: `Make me an Admin first so I can delete messages.\n\n${settings.footer}` }, { quoted: mek });
      }

      const context = mek.message?.extendedTextMessage?.contextInfo;
      const mentioned = context?.mentionedJid || [];
      let target = mentioned[0];

      if (!target && args[0]) {
        target = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
      }

      if (!target) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, { text: `Tag a user or provide their number.\nExample: .ban-chat @user\n\n${settings.footer}` }, { quoted: mek });
      }

      const muted = readConfig();
      if (!muted.includes(target)) {
        muted.push(target);
        writeConfig(muted);
        await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
        await conn.sendMessage(chatId, {
          text: `User @${target.split('@')[0]} has been muted. Any message they send will be deleted instantly.`,
          mentions: [target]
        }, { quoted: mek });
      } else {
        await conn.sendMessage(chatId, { text: `This user is already muted.\n\n${settings.footer}` }, { quoted: mek });
      }

    } catch (error) {
      console.log('[MUTE] Error:', error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
    }
  }
};