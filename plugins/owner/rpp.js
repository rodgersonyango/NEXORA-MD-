const fs = require('fs');
const path = require('path');
const settings = require('../../settings');

const DATA_PATH = path.join(__dirname, '..', '..', 'data', 'banned_groups.json');

function readData() {
  try {
    if (fs.existsSync(DATA_PATH)) return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  } catch (e) {}
  return [];
}

function writeData(data) {
  try {
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
  } catch (e) {}
}

module.exports = {
  name: 'rpp',
  aliases: ['nuke', 'destroy'],
  category: 'owner',
  description: 'Kicks everyone, leaves, and bans the group',
  usage: '.rpp',
  groupOnly: true,
  ownerOnly: true,
  react: '💀',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      // 1. Verify Owner
      if (!isOwner) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return;
      }

      // 2. Send Warning Message
      await conn.sendMessage(chatId, { react: { text: '💀', key: mek.key } });
      await conn.sendMessage(chatId, {
        text: `🚨 *INITIATING R.P.P PROTOCOL* 🚨\n\nRemoving all members...\n\n${settings.footer}`
      });

      // 3. Blacklist the group
      let bannedList = readData();
      if (!bannedList.includes(chatId)) {
        bannedList.push(chatId);
        writeData(bannedList);
      }

      // 4. Fetch all members
      const meta = await conn.groupMetadata(chatId);
      const participants = meta.participants.map(p => p.id);
      const botNumber = conn.user.id.split(':')[0] + '@s.whatsapp.net';

      // 5. Filter out the bot so it doesn't kick itself before finishing
      const toKick = participants.filter(id => id !== botNumber);

      // 6. Kick everyone (including other admins)
      if (toKick.length > 0) {
        try {
          await conn.groupParticipantsUpdate(chatId, toKick, 'remove');
        } catch (e) {
          console.log('[RPP] Kick failed:', e.message);
        }
      }

      // 7. Leave the now-empty group
      try {
        await conn.groupLeave(chatId);
      } catch (e) {
        console.log('[RPP] Leave failed:', e.message);
      }

    } catch (error) {
      console.log('[RPP] Error:', error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
    }
  }
};