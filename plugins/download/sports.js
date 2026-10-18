const settings = require('../../settings');
const axios = require('axios');

const API_URL = 'https://api.omegatech.app/api/Sport/Sport?action=matches';

module.exports = {
  name: 'sport',
  aliases: ['sports', 'live', 'matches'],
  category: 'general',
  description: 'Get live, upcoming, and finished sports matches',
  usage: '.sport',
  react: '⚽',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });

      const res = await axios.get(API_URL, {
        timeout: 30000,
        headers: { 'Accept': 'application/json' }
      });

      if (!res.data?.success || !res.data?.data?.matches) {
        throw new Error('Invalid API response');
      }

      const matches = res.data.data.matches;

      const live = matches.filter(m => m.isLive);
      const upcoming = matches.filter(m => m.isUpcoming);
      const ended = matches.filter(m => m.isEnded);

      let text = `⚽ *LIVE SPORTS UPDATE*\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      if (live.length > 0) {
        text += `🔴 *LIVE NOW (${live.length})*\n`;
        live.slice(0, 5).forEach(m => {
          text += `⚽ *${m.home.name}* ${m.home.score} - ${m.away.score} *${m.away.name}*\n`;
          text += `🏆 ${m.league}\n`;
          if (m.playPath) text += `📺 [Watch Stream](${m.playPath})\n`;
          text += `\n`;
        });
      } else {
        text += `🔴 *LIVE NOW*\nNo live matches currently.\n\n`;
      }

      if (upcoming.length > 0) {
        text += `⏳ *UPCOMING (${upcoming.length})*\n`;
        upcoming.slice(0, 5).forEach(m => {
          const time = new Date(m.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          text += `🕐 ${time} | *${m.home.name}* vs *${m.away.name}*\n`;
          text += `🏆 ${m.league}\n\n`;
        });
      }

      if (ended.length > 0) {
        text += `✅ *FINISHED (${ended.length})*\n`;
        ended.slice(0, 5).forEach(m => {
          text += `🏁 *${m.home.name}* ${m.home.score} - ${m.away.score} *${m.away.name}*\n`;
          text += `🏆 ${m.league}\n`;
          if (m.highlights && m.highlights.length > 0) {
            text += `🎬 [Watch Highlights](${m.highlights[0].url})\n`;
          }
          text += `\n`;
        });
      }

      text += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `©2026 | ${settings.footer}`;

      await conn.sendMessage(chatId, { text }, { quoted: mek });
      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

    } catch (error) {
      console.log('[SPORTS] Error:', error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
      await conn.sendMessage(chatId, {
        text: `Sports data unavailable right now.\n\n${settings.footer}`
      }, { quoted: mek });
    }
  }
};