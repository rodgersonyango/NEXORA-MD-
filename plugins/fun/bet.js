const settings = require('../../settings');

module.exports = {
  name: 'bet',
  aliases: ['tips', 'ticket'],
  category: 'fun',
  description: 'Generate an AI-simulated sports betting ticket',
  usage: '.bet <bookmaker>',
  react: '⚽',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      const prefix = settings.prefix || '.';
      const sender = mek.key.participant || mek.key.remoteJid;
      
      if (!args || args.length === 0) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `Please provide a bookmaker name.\n\nExample: ${prefix}bet Sportybet\n\n${settings.footer}`
        }, { quoted: mek });
      }

      const company = args.join(' ').toUpperCase();
      const dateToday = new Date().toLocaleDateString('en-GB');

      await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });

      const teams = [
        "Real Madrid", "Man City", "Arsenal", "Bayern Munich", "PSG", 
        "Liverpool", "Barcelona", "Inter Milan", "Leverkusen", "AC Milan",
        "Man United", "Dortmund", "Napoli", "Chelsea", "Juventus",
        "Al Nassr", "Inter Miami", "Benfica", "Ajax", "Yanga SC", "Simba SC",
        "Azam FC", "Gor Mahia", "Mamelodi", "Al Ahly", "Aston Villa", "Monaco"
      ];

      const tips = [
        "Home Win (1)", "Away Win (2)", "Draw (X)", 
        "Over 2.5 Goals", "GG (Both Teams Score)", 
        "1X (Home or Draw)", "2X (Away or Draw)", 
        "HT/FT: 1/1", "Under 3.5"
      ];

      let list = "";
      let shuffled = [...teams].sort(() => 0.5 - Math.random());

      for (let i = 0; i < 10; i++) {
        const teamA = shuffled[i];
        const teamB = shuffled[(i + 7) % teams.length];
        const prediction = tips[Math.floor(Math.random() * tips.length)];
        const odds = (Math.random() * (3.10 - 1.25) + 1.25).toFixed(2);
        const probability = Math.floor(Math.random() * (95 - 65) + 65);

        list += `MATCH ${i + 1}: ${teamA} vs ${teamB}\n`;
        list += `TIP: ${prediction} (@${odds})\n`;
        list += `PROBABILITY: ${probability}%\n\n`;
      }

      const totalOdds = (Math.random() * (120.0 - 20.0) + 20.0).toFixed(2);

      const betMsg =
        `DAILY TICKET\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `Date: ${dateToday}\n` +
        `Bookmaker: ${company}\n` +
        `Analyst: @${sender.split('@')[0]}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `${list}` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `TOTAL ODDS: ${totalOdds}\n\n` +
        `NOTE: > This is AI simulation. Only bet what you can afford to lose. 18+\n\n` +
        `${settings.footer}`;

      await conn.sendMessage(chatId, {
        text: betMsg,
        mentions: [sender],
        withChannel: true
      }, { quoted: mek });

      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

    } catch (error) {
      console.log('[BET] Error:', error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
      await conn.sendMessage(chatId, {
        text: `Error: ${error.message}\n\n${settings.footer}`
      }, { quoted: mek });
    }
  }
};