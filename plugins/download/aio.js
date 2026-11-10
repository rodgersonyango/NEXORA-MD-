const settings = require('../../settings');
const axios = require('axios');
const logger = require('../../lib/logger');

module.exports = {
    name: 'aio',
    aliases: ['downr', 'alldl', 'universal', 'fb', 'tiktok'],
    category: 'download',
    description: 'All-in-one downloader (FB, TikTok, IG, Twitter)',
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
        await conn.sendMessage(chatId, { text: `🚀 *Fetching media...*` }, { quoted: mek });

        try {
            // Use a public API that handles multiple platforms
            const apiUrl = `https://api.nexoracle.com/downloader/aio?url=${encodeURIComponent(url)}&apikey=free_key`;
            
            const response = await axios.get(apiUrl, { timeout: 30000 });
            const data = response.data;

            if (data.status !== 200 && !data.result) {
                throw new Error(data.message || 'API returned an error.');
            }

            const result = data.result;
            let videoUrl = null;
            let title = result.title || 'Downloaded Media';

            // Handle different response structures
            if (result.medias && result.medias.length > 0) {
                // Find the best video
                const video = result.medias.find(m => m.type === 'video' || m.extension === 'mp4');
                videoUrl = video ? video.url : result.medias[0].url;
            } else if (result.video) {
                videoUrl = result.video;
            } else if (result.url) {
                videoUrl = result.url;
            }

            if (!videoUrl) {
                throw new Error('No video URL found in the response.');
            }

            // Send the Video
            await conn.sendMessage(chatId, {
                video: { url: videoUrl },
                caption: `✅ *Download Success!*\n\n📝 Title: ${title}\n\n${settings.footer}`
            }, { quoted: mek });

            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (error) {
            logger.error(`[AIO] Error: ${error.message}`);
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
            await conn.sendMessage(chatId, { 
                text: `❌ *Download Failed*\n\nReason: ${error.message}\n\n*Note: Public APIs can be unreliable. Try again later.*\n\n${settings.footer}` 
            }, { quoted: mek });
        }
    }
};