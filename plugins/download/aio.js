const settings = require('../../settings');
const axios = require('axios');
const logger = require('../../lib/logger');

module.exports = {
    name: 'aio',
    aliases: ['fb', 'fbdl', 'alldl'],
    category: 'download',
    description: 'All-in-one downloader (Facebook)',
    usage: '.aio <url>',
    react: '🚀',

    async execute(conn, mek, args, chatId) {
        const url = args[0];

        if (!url || (!url.includes('facebook.com') && !url.includes('fb.watch'))) {
            return conn.sendMessage(chatId, { 
                text: `❌ Please provide a valid Facebook link.\n\n*Example:*\n${settings.prefix}aio https://www.facebook.com/...\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `🚀 *Fetching media...*` }, { quoted: mek });

        try {
            // Public endpoint (no auth required) from btch-downloader-api
            const apiUrl = `https://btch-downloader-api.vercel.app/api/download/facebook?url=${encodeURIComponent(url)}`;
            
            const response = await axios.get(apiUrl, { timeout: 30000 });
            const data = response.data;

            // The API might return the video URL directly or an array
            let videoUrl = null;
            let title = 'Facebook Video';

            if (data.result) {
                // Try common response shapes
                videoUrl = data.result.video_hd || data.result.video_sd || data.result.url || data.result.hd || data.result.sd;
                if (data.result.title) title = data.result.title;
            } else if (data.video_hd) {
                videoUrl = data.video_hd;
            } else if (data.video_sd) {
                videoUrl = data.video_sd;
            } else if (data.url) {
                videoUrl = data.url;
            }

            if (!videoUrl) {
                throw new Error('No video URL found. The link might be private or the API is down.');
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
                text: `❌ *Download Failed*\n\nReason: ${error.message}\n\n*This is a free public endpoint. If it's down, try again later.*\n\n${settings.footer}` 
            }, { quoted: mek });
        }
    }
};