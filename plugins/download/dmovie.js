const settings = require('../../settings');
const axios = require('axios');
const logger = require('../../lib/logger');

const SEARCH_URL = 'https://api.omegatech.app/api/movie/MovieBox-pro?action=search&keyword=';
const DETAIL_URL = 'https://api.omegatech.app/api/movie/MovieBox-pro?action=download';

const BACKUP_SEARCH_URL = 'https://api.nexoracle.com/movie/moviebox?action=search&keyword=';
const BACKUP_DETAIL_URL = 'https://api.nexoracle.com/movie/moviebox?action=download';

const lastSearch = new Map();

function formatSize(bytes) {
  if (!bytes) return 'unknown';
  const n = parseInt(bytes);
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDuration(seconds) {
  if (!seconds) return 'unknown';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

module.exports = {
  name: 'dmovie',
  aliases: ['movie', 'mv', 'film'],
  category: 'download',
  description: 'Search and download movies',
  usage: '.dmovie <name> | .dmovie <name> | <number>',
  react: '✅',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      const fullInput = args.join(' ').trim();

      if (!fullInput) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        await conn.sendMessage(chatId, {
          text:
            `Movie Downloader\n\n` +
            `Usage:\n` +
            `  ${settings.prefix || '.'}dmovie <movie name>\n` +
            `  ${settings.prefix || '.'}dmovie <name> | <number>\n\n` +
            `Examples:\n` +
            `  ${settings.prefix || '.'}dmovie alone\n` +
            `  ${settings.prefix || '.'}dmovie alone | 1\n\n` +
            `${settings.footer}`
        });
        return;
      }

      let query = fullInput;
      let pickIndex = null;

      if (fullInput.includes('|')) {
        const parts = fullInput.split('|').map(s => s.trim());
        query = parts[0];
        pickIndex = parseInt(parts[1]);
      }

      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

      if (pickIndex !== null && lastSearch.has(chatId)) {
        const cached = lastSearch.get(chatId);
        if (isNaN(pickIndex) || pickIndex < 1 || pickIndex > cached.results.length) {
          await conn.sendMessage(chatId, {
            text: `Invalid selection. Pick 1-${cached.results.length}\n\n${settings.footer}`
          });
          return;
        }

        const picked = cached.results[pickIndex - 1];
        await downloadAndSend(conn, mek, chatId, picked);
        return;
      }

      await conn.sendMessage(chatId, { text: `Searching for "${query}"...` });

      let results = [];

      // 🩺 TIER 1: Primary API (Omegatech)
      try {
        const res = await axios.get(SEARCH_URL + encodeURIComponent(query), {
          timeout: 15000,
          headers: { 'Accept': 'application/json' }
        });
        results = res.data?.data?.results || [];
        if (results.length > 0) logger.info(`[DMOVIE] Success with Primary API`);
      } catch (e) {
        logger.warn(`[DMOVIE] Primary API failed: ${e.message}`);
      }

      // 🩺 TIER 2: Self-Healing Backup API (Nexoracle)
      if (results.length === 0) {
        try {
          const res2 = await axios.get(BACKUP_SEARCH_URL + encodeURIComponent(query), {
            timeout: 15000,
            headers: { 'Accept': 'application/json' }
          });
          results = res2.data?.result?.results || res2.data?.data?.results || [];
          if (results.length > 0) logger.info(`[DMOVIE] Success with Backup API`);
        } catch (e) {
          logger.warn(`[DMOVIE] Backup API failed: ${e.message}`);
        }
      }

      if (results.length === 0) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        await conn.sendMessage(chatId, {
          text: `No movies found for "${query}". Try a different spelling.\n\n${settings.footer}`
        });
        return;
      }

      lastSearch.set(chatId, { query, results });

      let text = `🎬 *MOVIE SEARCH — "${query}"*\n\n`;
      results.slice(0, 8).forEach((r, i) => {
        const type = r.subjectType === 1 ? 'Movie' : r.subjectType === 2 ? 'Series' : 'Other';
        const rating = r.imdbRatingValue ? ` (⭐ ${r.imdbRatingValue})` : '';
        const year = r.releaseDate ? ` — ${r.releaseDate.split('-')[0]}` : '';
        text += `${i + 1}. *${r.title}*${year}${rating}\n`;
        text += `   Type: ${type} | Country: ${r.countryName || 'N/A'}\n\n`;
      });
      text += `👉 Pick one: ${settings.prefix || '.'}dmovie ${query} | <number>\n`;
      text += `Example: ${settings.prefix || '.'}dmovie ${query} | 1\n\n`;
      text += `${settings.footer}`;

      await conn.sendMessage(chatId, { text });
      logger.info(`[DMOVIE] Search "${query}" returned ${results.length} results`);

    } catch (error) {
      logger.error(`[DMOVIE] Error: ${error.message}`);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
      try {
        await conn.sendMessage(chatId, {
          text: `Error: ${error.message}\n\n${settings.footer}`
        });
      } catch (e) {}
    }
  }
};

async function downloadAndSend(conn, mek, chatId, movie) {
  try {
    await conn.sendMessage(chatId, { text: `Fetching download info for "${movie.title}"...` });

    const params = {
      action: 'download',
      subjectId: movie.subjectId,
      detailPath: movie.detailPath,
      se: movie.season || 0,
      ep: 0
    };

    let detail = null;

    // 🩺 TIER 1: Primary Detail API
    try {
      const url = `${DETAIL_URL}&subjectId=${params.subjectId}&detailPath=${params.detailPath}&se=${params.se}&ep=${params.ep}`;
      const res = await axios.get(url, { timeout: 20000 });
      detail = res.data;
      if (detail) logger.info(`[DMOVIE] Detail success with Primary`);
    } catch (e) {
      logger.warn(`[DMOVIE] Primary Detail API failed: ${e.message}`);
    }

    // 🩺 TIER 2: Backup Detail API
    if (!detail || !detail.bestQuality) {
      try {
        const url2 = `${BACKUP_DETAIL_URL}&subjectId=${params.subjectId}&detailPath=${params.detailPath}&se=${params.se}&ep=${params.ep}`;
        const res2 = await axios.get(url2, { timeout: 20000 });
        detail = res2.data?.result || res2.data;
        if (detail) logger.info(`[DMOVIE] Detail success with Backup`);
      } catch (e) {
        logger.warn(`[DMOVIE] Backup Detail API failed: ${e.message}`);
      }
    }

    const best = detail?.bestQuality || detail?.qualities?.[0];

    if (!best || !best.streamUrl) {
      await conn.sendMessage(chatId, {
        text: `Could not fetch download info for "${movie.title}".\n\n${settings.footer}`
      });
      return;
    }

    const sizeBytes = parseInt(best.size) || 0;
    const sizeMB = sizeBytes / 1024 / 1024;
    const sizeStr = formatSize(best.size);

    const caption =
      `🎬 *MOVIE FOUND*\n\n` +
      `Title: ${movie.title}\n` +
      `Year: ${movie.releaseDate ? movie.releaseDate.split('-')[0] : 'N/A'}\n` +
      `Country: ${movie.countryName || 'N/A'}\n` +
      `Quality: ${best.quality}\n` +
      `Size: ${sizeStr}\n\n` +
      `Sending...\n\n` +
      `${settings.footer}`;

    if (sizeMB > 0 && sizeMB <= 100) {
      try {
        if (movie.cover?.url) {
          await conn.sendMessage(chatId, {
            image: { url: movie.cover.url },
            caption
          }, { quoted: mek });
        }

        const response = await axios.get(best.streamUrl, {
          responseType: 'arraybuffer',
          timeout: 180000,
          maxContentLength: 200 * 1024 * 1024
        });

        const buffer = Buffer.from(response.data);
        const safeName = `${movie.title.slice(0, 50).replace(/[\\/:*?"<>|]/g, '')}.mp4`;

        await conn.sendMessage(chatId, {
          document: buffer,
          mimetype: 'video/mp4',
          fileName: safeName,
          caption: `📦 Size: ${formatSize(buffer.length)}`
        }, { quoted: mek });

        logger.info(`[DMOVIE] Sent as video: ${movie.title} (${formatSize(buffer.length)})`);
        return;
      } catch (dlErr) {
        logger.warn(`[DMOVIE] Download failed: ${dlErr.message}`);
      }
    }

    const reason =
      sizeMB > 100
        ? `File size is ${sizeStr} — exceeds WhatsApp's 100 MB limit.`
        : `Download failed due to server limits.`;

    let linkText =
      `🎬 *MOVIE DOWNLOAD LINK*\n\n` +
      `Title: ${movie.title}\n` +
      `Year: ${movie.releaseDate ? movie.releaseDate.split('-')[0] : 'N/A'}\n` +
      `Country: ${movie.countryName || 'N/A'}\n` +
      `Genre: ${movie.genre || 'N/A'}\n` +
      `Rating: ${movie.imdbRatingValue || 'N/A'} (${movie.imdbRatingCount || 0} votes)\n\n` +
      `Quality: ${best.quality}\n` +
      `Size: ${sizeStr}\n\n` +
      `⚠️ *REASON:* ${reason}\n\n` +
      `🔗 *Download Link:*\n${best.streamUrl}\n\n` +
      `${settings.footer}`;

    if (movie.cover?.url) {
      await conn.sendMessage(chatId, {
        image: { url: movie.cover.url },
        caption: linkText
      }, { quoted: mek });
    } else {
      await conn.sendMessage(chatId, { text: linkText }, { quoted: mek });
    }

    logger.info(`[DMOVIE] Sent link: ${movie.title} (${sizeStr})`);

  } catch (error) {
    logger.error(`[DMOVIE] downloadAndSend error: ${error.message}`);
    try {
      await conn.sendMessage(chatId, {
        text: `Failed to process: ${error.message}\n\n${settings.footer}`
      });
    } catch (e) {}
  }
}