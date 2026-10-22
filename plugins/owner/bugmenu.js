const settings = require('../../settings');

module.exports = {
  name: 'bugmenu',
  aliases: ['bug', 'crashlist', 'buglist'],
  category: 'owner',
  description: 'Show the list of available bug/exploit commands',
  usage: '.bugmenu',
  ownerOnly: true,
  react: '☣️',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      if (!isOwner) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `Restricted to Bot Owner only.\n\n${settings.footer}`
        }, { quoted: mek });
      }

      const sender = mek.key.participant || mek.key.remoteJid;
      const userName = sender.split('@')[0];
      const prefix = settings.prefix || '.';

      const bugMsg =
        `▎☣️ NEXORA MD // BUG TERMINAL\n` +
        `▎\n` +
        `▎ USER   : @${userName}\n` +
        `▎ MODE   : DEATH-SQUAD\n` +
        `▎ SERVER : ONLINE\n` +
        `▎\n` +
        `▎ ━━━━━━━━━━━━━━━━━━━━━━\n` +
        `▎ SINGLE ATTACKS\n` +
        `▎ Target: ${prefix}command [number]\n` +
        `▎ ━━━━━━━━━━━━━━━━━━━━━━\n` +
        `▎\n` +
        `▎ ☣️ ${prefix}crash\n` +
        `▎ 👾 ${prefix}bin\n` +
        `▎ ⚠️ ${prefix}ui-bug\n` +
        `▎ 🥶 ${prefix}total-freeze\n` +
        `▎ 💣 ${prefix}heavy-wa\n` +
        `▎ ⏳ ${prefix}lag\n` +
        `▎ 💀 ${prefix}dark-web\n` +
        `▎ 🌋 ${prefix}ram-kill\n` +
        `▎ ♨️ ${prefix}cpu-heat\n` +
        `▎ 👻 ${prefix}ghost-bug\n` +
        `▎ 📡 ${prefix}payload-x\n` +
        `▎ ☣️ ${prefix}kernel-error\n` +
        `▎ 🌀 ${prefix}infinite-lag\n` +
        `▎ 📂 ${prefix}internal-bug\n` +
        `▎ ⚰️ ${prefix}death-point\n` +
        `▎\n` +
        `▎ ━━━━━━━━━━━━━━━━━━━━━━\n` +
        `▎ ⚡ ULTIMATE COMBO\n` +
        `▎ ━━━━━━━━━━━━━━━━━━━━━━\n` +
        `▎ 💀 ${prefix}mega-bug\n` +
        `▎ (Sends all 15 viruses at once)\n` +
        `▎\n` +
        `▎ ━━━━━━━━━━━━━━━━━━━━━━\n` +
        `▎ WARNING: These commands are for\n` +
        `▎ system resilience testing only.\n` +
        `▎ Use responsibly.\n` +
        `▎\n` +
        `▎ ${settings.footer}`;

      await conn.sendMessage(chatId, {
        text: bugMsg,
        mentions: [sender],
        withChannel: true
      }, { quoted: mek });

      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

    } catch (error) {
      console.log('[BUGMENU] Error:', error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
      await conn.sendMessage(chatId, {
        text: `Error loading menu. Use ${settings.prefix || '.'}mega-bug directly.\n\n${settings.footer}`
      }, { quoted: mek });
    }
  }
};