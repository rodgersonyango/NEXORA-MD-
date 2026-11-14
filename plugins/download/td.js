const settings = require('../../settings');
const axios = require('axios');
const logger = require('../../lib/logger');

let TikTokClient = null;
try {
  ({ TikTokClient } = require('@ssut/tiktok-api'));
  console.log('[TD] Library loaded OK');
} catch (e) {
  console.log('[TD] Library not installed:', e.message);
}

module.exports = {
  name: 'td',
  aliases: ['tiktok', 'tt', 'tikdl'],
  category: 'download',
  description: 'Download TikTok video without watermark',
  usage: '.td <tiktok-url>',
  react: '✅',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      let url = args.join(' ').trim();

      if (!url) {
        const ctx = mek.message?.extendedTextMessage?.contextInfo;
        const q = ctx?.quotedMessage;
        if (q) {
          const txt = q.conversation || q.extendedTextMessage?.text || '';
          const found = txt.split(/\s+/).find(x => x.includes('tiktok.com'));
          if (found) url = found;
        }
      }

      if (!url || !url.includes('tiktok.com')) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text:
            `TikTok Downloader\n\n` +
            `Usage:\n` +
            `  ${settings.prefix || '.'}td <tiktok-url>\n` +
            `  Reply to a message with ${settings.prefix || '.'}td\n\n` +
            `${settings.footer}`
        });
      }

      await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
      await conn.sendMessage(chatId, { text: `📱 *Fetching TikTok video...*\n\n_Testing servers..._` });

      let videoUrl = null;
      let title = 'TikTok Video';
      let author = 'Unknown';

      // 🩺 TIER 1: Primary (Native Library - No Watermark)
      if (TikTokClient) {
        try {
          const client = new TikTokClient({ region: 'US' });
          const download = await client.downloadVideo(url);
          
          if (download.status === 'success' && download.result?.type === 'video') {
            const formats = download.result.video.formats || [];
            const best = formats.find(f => !f.has_watermark && (f.resolution || '').includes('1080')) ||
                         formats.find(f => !f.has_watermark) ||
                         formats[0];

            if (best?.url) {
              videoUrl = best.url;
              title = download.result.desc || 'TikTok Video';
              author = download.result.author?.uniqueId || 'Unknown';
              logger.info(`[TD] Success with Native Library (${best.resolution || 'best'})`);
            }
          }
        } catch (e) {
          logger.warn(`[TD] Native Library failed: ${e.message}`);
        }
      }

      // 🩺 TIER 2: Fallback API 1 (Nexoracle)
      if (!videoUrl) {
        try {
          const res2 = await axios.get(`https://api.nexoracle.com/downloader/tiktok?url=${encodeURIComponent(url)}&apikey=free_key`, { timeout: 15000 });
          videoUrl = res2.data?.result?.video || res2.data?.result?.play || res2.data?.result?.url;
          if (res2.data?.result?.title) title = res2.data.result.title;
          if (res2.data?.result?.author) author = res2.data.result.author;
          if (videoUrl) logger.info('[TD] Success with Backup 1 (Nexoracle)');
        } catch (e) {
          logger.warn(`[TD] Backup 1 failed: ${e.message}`);
        }
      }

      // 🩺 TIER 3: Fallback API 2 (Vreden)
      if (!videoUrl) {
        try {
          const res3 = await axios.get(`https://api.vreden.my.id/api/tiktok?url=${encodeURIComponent(url)}`, { timeout: 15000 });
          videoUrl = res3.data?.result?.video || res3.data?.result?.nowm || res3.data?.result?.url;
          if (res3.data?.result?.title) title = res3.data.result.title;
          if (videoUrl) logger.info('[TD] Success with Backup 2 (Vreden)');
        } catch (e) {
          logger.warn(`[TD] Backup 2 failed: ${e.message}`);
        }
      }

      // 🛑 If all 3 fail, throw error
      if (!videoUrl) {
        throw new Error('All TikTok servers are down. Try again later.');
      }

      // Send the video
      const caption =
        `✅ *TIKTOK DOWNLOADED*\n\n` +
        `📝 Title: ${title}\n` +
        `👤 Author: @${author}\n\n` +
        `${settings.footer}`;

      await conn.sendMessage(chatId, {
        video: { url: videoUrl },
        caption,
        mimetype: 'video/mp4',
        fileName: `tiktok_${Date.now()}.mp4`
      }, { quoted: mek });

      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

    } catch (error) {
      logger.error(`[TD] Error: ${error.message}`);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
      await conn.sendMessage(chatId, {
        text: `❌ *TikTok Download Failed*\n\nReason: ${error.message}\n\n${settings.footer}`
      }, { quoted: mek });
    }
  }
};