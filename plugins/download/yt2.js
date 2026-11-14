const settings = require('../../settings');
const axios = require('axios');
const logger = require('../../lib/logger');

const API_BASE = 'https://api.omegatech.app/api/download/ytultra';
const BACKUP_API = 'https://api.nexoracle.com/downloader/ytdl';

function isYouTubeUrl(str) {
  return /youtube\.com|youtu\.be/i.test(str);
}

async function searchYT(query) {
  // 🩺 TIER 1: Primary Search
  try {
    const res = await axios.get(`${API_BASE}?action=search&query=${encodeURIComponent(query)}`, {
      timeout: 15000,
      headers: { 'Accept': 'application/json' }
    });
    if (res.data?.success) {
      logger.info('[YT2] Search success with Primary API');
      return res.data.data;
    }
  } catch (e) {
    logger.warn(`[YT2] Primary Search failed: ${e.message}`);
  }

  // 🩺 TIER 2: Backup Search (Nexoracle)
  try {
    const res2 = await axios.get(`https://api.nexoracle.com/search/youtube?q=${encodeURIComponent(query)}&apikey=free_key`, { timeout: 15000 });
    if (res2.data?.result?.length > 0) {
      logger.info('[YT2] Search success with Backup API');
      return { results: res2.data.result };
    }
  } catch (e) {
    logger.warn(`[YT2] Backup Search failed: ${e.message}`);
  }

  throw new Error('All search engines are down.');
}

async function getDownloadData(videoUrl) {
  // 🩺 TIER 1: Primary Download
  try {
    const res = await axios.get(`${API_BASE}?action=download&url=${encodeURIComponent(videoUrl)}`, {
      timeout: 20000,
      headers: { 'Accept': 'application/json' }
    });
    if (res.data?.success) {
      logger.info('[YT2] Download info success with Primary API');
      return res.data.data;
    }
  } catch (e) {
    logger.warn(`[YT2] Primary Download failed: ${e.message}`);
  }

  // 🩺 TIER 2: Backup Download (Nexoracle)
  try {
    const res2 = await axios.get(`${BACKUP_API}?url=${encodeURIComponent(videoUrl)}&apikey=free_key`, { timeout: 20000 });
    const r = res2.data?.result;
    if (r) {
      logger.info('[YT2] Download info success with Backup API');
      return {
        title: r.title || 'YouTube Video',
        channel: r.author || 'Unknown',
        mp3: [{ quality: '128kbps', url: r.audio || r.mp3, filename: `${(r.title || 'audio').slice(0, 40)}.mp3` }],
        mp4: [{ quality: '720p', url: r.video || r.mp4, filename: `${(r.title || 'video').slice(0, 40)}.mp4` }]
      };
    }
  } catch (e) {
    logger.warn(`[YT2] Backup Download failed: ${e.message}`);
  }

  throw new Error('All download engines are down.');
}

function pickBestAudio(mp3List) {
  if (!mp3List || mp3List.length === 0) return null;
  const priority = ['320kbps', '256kbps', '192kbps', '160kbps', '128kbps', '96kbps', '64kbps'];
  for (const q of priority) {
    const found = mp3List.find(x => String(x.quality).toLowerCase().includes(q.toLowerCase()));
    if (found) return found;
  }
  return mp3List[0];
}

function pickBestVideo(mp4List) {
  if (!mp4List || mp4List.length === 0) return null;
  const priority = ['1080p', '720p', '480p', '360p', '240p', '144p'];
  for (const q of priority) {
    const found = mp4List.find(x => String(x.quality).toLowerCase().includes(q.toLowerCase()));
    if (found) return found;
  }
  return mp4List[0];
}

module.exports = {
  name: 'yt2',
  aliases: ['ytdl2', 'ytv2', 'yta2'],
  category: 'download',
  description: 'YouTube video or audio downloader',
  usage: '.yt2 <youtube-url>',
  react: '🎬',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      let input = args.join(' ').trim();

      if (!input) {
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (quoted) {
          const text = quoted.conversation || quoted.extendedTextMessage?.text || '';
          const found = text.split(/\s+/).find(x => isYouTubeUrl(x));
          if (found) input = found;
        }
      }

      if (!input) {
        return conn.sendMessage(chatId, {
          text:
            `🎬 *YOUTUBE DOWNLOADER 2*\n\n` +
            `Usage:\n` +
            `  ${settings.prefix || '.'}yt2 <youtube-url>    Download audio\n` +
            `  ${settings.prefix || '.'}yt2 <url> v          Download video\n` +
            `  ${settings.prefix || '.'}yt2 <query>          Search YouTube\n\n` +
            `Examples:\n` +
            `  ${settings.prefix || '.'}yt2 https://youtu.be/xxxxx\n` +
            `  ${settings.prefix || '.'}yt2 https://youtu.be/xxxxx v\n` +
            `  ${settings.prefix || '.'}yt2 alone\n\n` +
            `${settings.footer}`
        }, { quoted: mek });
      }

      if (isYouTubeUrl(input)) {
        const parts = input.split(/\s+/);
        const url = parts.find(x => isYouTubeUrl(x));
        const wantVideo = parts.some(x => x.toLowerCase() === 'v' || x.toLowerCase() === 'video');

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, {
          text: `🔍 *Fetching YouTube info...*\n\n${settings.footer}`
        }, { quoted: mek });

        const data = await getDownloadData(url);

        if (wantVideo) {
          const best = pickBestVideo(data.mp4 || []);
          if (!best) throw new Error('No video formats available');

          await conn.sendMessage(chatId, {
            text:
              `📹 *${data.title || 'Video'}*\n` +
              `Quality: ${best.quality}\n\n` +
              `_Uploading video..._\n\n${settings.footer}`
          }, { quoted: mek });

          await conn.sendMessage(chatId, {
            video: { url: best.url },
            caption:
              `📹 *${data.title || 'YouTube Video'}*\n` +
              `Channel: ${data.channel || 'Unknown'}\n` +
              `Quality: ${best.quality}\n\n` +
              `${settings.footer}`,
            mimetype: 'video/mp4',
            fileName: best.filename || `${(data.title || 'video').slice(0, 40)}.mp4`
          }, { quoted: mek });
        } else {
          const best = pickBestAudio(data.mp3 || []);
          if (!best) throw new Error('No audio formats available');

          await conn.sendMessage(chatId, {
            text:
              `🎵 *${data.title || 'Audio'}*\n` +
              `Quality: ${best.quality}\n\n` +
              `_Uploading audio..._\n\n${settings.footer}`
          }, { quoted: mek });

          await conn.sendMessage(chatId, {
            audio: { url: best.url },
            mimetype: 'audio/mpeg',
            ptt: false,
            fileName: best.filename || `${(data.title || 'audio').slice(0, 40)}.mp3`
          }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
        return;
      }

      await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
      await conn.sendMessage(chatId, {
        text: `🔍 *Searching YouTube for:* ${input}\n\n${settings.footer}`
      }, { quoted: mek });

      const searchData = await searchYT(input);
      const results = searchData.results || [];

      if (results.length === 0) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `❌ No results for "${input}"\n\n${settings.footer}`
        }, { quoted: mek });
      }

      let list = '';
      results.slice(0, 10).forEach((r, i) => {
        list += `${i + 1}. *${r.title}*\n`;
        list += `   ${r.duration || r.timestamp || '?'} | ${r.channel?.name || r.author || 'Unknown'}\n\n`;
      });

      await conn.sendMessage(chatId, {
        text:
          `🎬 *SEARCH RESULTS for "${input}"*\n\n` +
          `${list}` +
          `👉 Reply with the YouTube URL to download it.\n\n` +
          `${settings.footer}`
      }, { quoted: mek });

      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

    } catch (error) {
      logger.error(`[YT2] Error: ${error.message}`);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
      await conn.sendMessage(chatId, {
        text: `❌ *YouTube Error:* ${error.message}\n\n${settings.footer}`
      }, { quoted: mek });
    }
  }
};