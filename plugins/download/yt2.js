/**
 * NEXORA MD - YouTube Downloader 2
 * Reply or send a YouTube URL and it downloads automatically
 * Usage:
 *   .yt2 <youtube-url>           - auto download (best audio)
 *   .yt2 <youtube-url> v         - auto download (best video)
 *   .yt2 <query>                 - search and show top results
 */

const settings = require('../../settings');
const axios = require('axios');

const API_BASE = 'https://api.omegatech.app/api/download/ytultra';

function isYouTubeUrl(str) {
  return /youtube\.com|youtu\.be/i.test(str);
}

async function searchYT(query) {
  const res = await axios.get(`${API_BASE}?action=search&query=${encodeURIComponent(query)}`, {
    timeout: 30000,
    headers: { 'Accept': 'application/json' }
  });
  if (!res.data?.success) throw new Error('Search failed');
  return res.data.data;
}

async function getDownloadData(videoUrl) {
  const res = await axios.get(`${API_BASE}?action=download&url=${encodeURIComponent(videoUrl)}`, {
    timeout: 30000,
    headers: { 'Accept': 'application/json' }
  });
  if (!res.data?.success) throw new Error('Download info failed');
  return res.data.data;
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

      // If no args, check if replying to a message with a YouTube link
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
            `YOUTUBE DOWNLOADER 2\n\n` +
            `Usage:\n` +
            `  .yt2 <youtube-url>    Download audio\n` +
            `  .yt2 <url> v          Download video\n` +
            `  .yt2 <query>          Search YouTube\n\n` +
            `Examples:\n` +
            `  .yt2 https://youtu.be/xxxxx\n` +
            `  .yt2 https://youtu.be/xxxxx v\n` +
            `  .yt2 alone\n\n` +
            `${settings.footer}`
        }, { quoted: mek });
      }

      // ─────────────────────────────────────────
      // YOUTUBE URL → AUTO DOWNLOAD
      // ─────────────────────────────────────────
      if (isYouTubeUrl(input)) {
        const parts = input.split(/\s+/);
        const url = parts.find(x => isYouTubeUrl(x));
        const wantVideo = parts.some(x => x.toLowerCase() === 'v' || x.toLowerCase() === 'video');

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, {
          text: `Fetching YouTube info...\n\n${settings.footer}`
        }, { quoted: mek });

        const data = await getDownloadData(url);

        if (wantVideo) {
          const best = pickBestVideo(data.mp4 || []);
          if (!best) throw new Error('No video formats available');

          await conn.sendMessage(chatId, {
            text:
              `${data.title || 'Video'}\n` +
              `Quality: ${best.quality}\n\n` +
              `Uploading video...\n\n${settings.footer}`
          }, { quoted: mek });

          await conn.sendMessage(chatId, {
            video: { url: best.url },
            caption:
              `${data.title || 'YouTube Video'}\n` +
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
              `${data.title || 'Audio'}\n` +
              `Quality: ${best.quality}\n\n` +
              `Uploading audio...\n\n${settings.footer}`
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

      // ─────────────────────────────────────────
      // NOT A URL → SEARCH
      // ─────────────────────────────────────────
      await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
      await conn.sendMessage(chatId, {
        text: `Searching YouTube for: ${input}\n\n${settings.footer}`
      }, { quoted: mek });

      const searchData = await searchYT(input);
      const results = searchData.results || [];

      if (results.length === 0) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `No results for "${input}"\n\n${settings.footer}`
        }, { quoted: mek });
      }

      let list = '';
      results.slice(0, 10).forEach((r, i) => {
        list += `${i + 1}. ${r.title}\n`;
        list += `   ${r.duration || '?'} | ${r.channel?.name || 'Unknown'}\n\n`;
      });

      await conn.sendMessage(chatId, {
        text:
          `SEARCH RESULTS for "${input}"\n\n` +
          `${list}` +
          `Reply with the YouTube URL to download it.\n\n` +
          `${settings.footer}`
      }, { quoted: mek });

      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

    } catch (error) {
      console.log('[YT2] Error:', error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
      await conn.sendMessage(chatId, {
        text: `YouTube error: ${error.message}\n\n${settings.footer}`
      }, { quoted: mek });
    }
  }
};