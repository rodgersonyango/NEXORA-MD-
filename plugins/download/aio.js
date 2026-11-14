const settings = require('../../settings');
const axios = require('axios');
const logger = require('../../lib/logger');

module.exports = {
    name: 'aio',
    aliases: ['fb', 'fbdl', 'alldl'],
    category: 'download',
    description: 'All-in-one downloader (Self-Healing)',
    usage: '.aio <url>',
    react: '🚀',

    async execute(conn, mek, args, chatId) {
        const url = args[0];

        if (!url || !url.startsWith('http')) {
            return conn.sendMessage(chatId, { 
                text: `❌ Please provide a valid link.\n\n*Example:*\n${settings.prefix}aio https://www.facebook.com/...\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `🚀 *Fetching media...*\n\n_Testing servers..._` }, { quoted: mek });

        let videoUrl = null;
        let title = 'Downloaded Media';

        // 🩺 TIER 1: Primary API (btch-downloader)
        try {
            const apiUrl = `https://btch-downloader-api.vercel.app/api/download/facebook?url=${encodeURIComponent(url)}`;
            const response = await axios.get(apiUrl, { timeout: 15000 });
            const data = response.data;

            if (data.result) {
                videoUrl = data.result.video_hd || data.result.video_sd || data.result.url || data.result.hd || data.result.sd;
                if (data.result.title) title = data.result.title;
            } else if (data.video_hd) {
                videoUrl = data.video_hd;
            } else if (data.video_sd) {
                videoUrl = data.video_sd;
            } else if (data.url) {
                videoUrl = data.url;
            }
            if (videoUrl) logger.info('[AIO] Success with Primary API (btch)');
        } catch (e) {
            logger.warn(`[AIO] Primary API failed: ${e.message}`);
        }

        // 🩺 TIER 2: Self-Healing Fallback (Nexoracle)
        if (!videoUrl) {
            try {
                const res2 = await axios.get(`https://api.nexoracle.com/downloader/facebook?url=${encodeURIComponent(url)}&apikey=free_key`, { timeout: 15000 });
                videoUrl = res2.data?.result?.hd || res2.data?.result?.sd || res2.data?.result?.video;
                if (res2.data?.result?.title) title = res2.data.result.title;
                if (videoUrl) logger.info('[AIO] Success with Backup 1 (Nexoracle)');
            } catch (e) {
                logger.warn(`[AIO] Backup 1 failed: ${e.message}`);
            }
        }

        // 🩺 TIER 3: Self-Healing Fallback (Vreden)
        if (!videoUrl) {
            try {
                const res3 = await axios.get(`https://api.vreden.my.id/api/fbdownload?url=${encodeURIComponent(url)}`, { timeout: 15000 });
                videoUrl = res3.data?.result?.hd || res3.data?.result?.sd;
                if (res3.data?.result?.title) title = res3.data.result.title;
                if (videoUrl) logger.info('[AIO] Success with Backup 2 (Vreden)');
            } catch (e) {
                logger.warn(`[AIO] Backup 2 failed: ${e.message}`);
            }
        }

        // 🛑 If all 3 APIs fail, throw error
        if (!videoUrl) {
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
            return conn.sendMessage(chatId, { 
                text: `❌ *Download Failed*\n\nAll 3 download servers are currently down or the video is private. Please try again later.\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        // Send the Video
        try {
            await conn.sendMessage(chatId, {
                video: { url: videoUrl },
                caption: `✅ *Download Success!*\n\n📝 Title: ${title}\n\n${settings.footer}`
            }, { quoted: mek });

            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (error) {
            logger.error(`[AIO] Send Error: ${error.message}`);
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
            await conn.sendMessage(chatId, { 
                text: `❌ *Failed to send the video.* The file might be too large for WhatsApp.\n\n${settings.footer}` 
            }, { quoted: mek });
        }
    }
};