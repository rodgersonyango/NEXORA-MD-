const settings = require('../../settings');
const axios = require('axios');
const logger = require('../../lib/logger');

// 🔥 YOUR VERCEL URL
const MY_WEBSITE_API = 'https://queenbella-fb-dl.vercel.app/api/aio'; 

module.exports = {
    name: 'aio',
    aliases: ['downr', 'alldl', 'universal'],
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
        await conn.sendMessage(chatId, { text: `🚀 *Connecting to Proxy Server...*` }, { quoted: mek });

        try {
            // Ask your Vercel site to do the hard work
            const response = await axios.get(MY_WEBSITE_API, {
                params: { url: url },
                timeout: 45000
            });
            
            const data = response.data;

            if (data.error) {
                throw new Error(data.error);
            }

            const medias = data.medias || [];
            if (medias.length === 0) {
                throw new Error('No media found in the response.');
            }

            // Sort to prefer HD/Video
            const video = medias.find(m => m.type === 'video' && !m.is_audio);
            const audio = medias.find(m => m.is_audio === true);
            
            const finalMedia = video || medias[0];
            const title = data.title || 'Untitled Media';

            // Send the video
            if (finalMedia.type === 'video' || finalMedia.type === 'image') {
                const content = {
                    caption: `✅ *Download Success!*\n\n📝 Title: ${title}\n📦 Quality: ${finalMedia.quality || 'Default'}\n🌐 Source: ${data.source || 'Unknown'}\n\n${settings.footer}`
                };
                
                if (finalMedia.type === 'video') content.video = { url: finalMedia.url };
                else content.image = { url: finalMedia.url };

                await conn.sendMessage(chatId, content, { quoted: mek });
            } 
            // Or send as audio
            else {
                await conn.sendMessage(chatId, {
                    audio: { url: finalMedia.url },
                    mimetype: 'audio/mp4',
                    fileName: `${title}.mp3`
                }, { quoted: mek });
            }

            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (error) {
            logger.error(`[AIO] Error: ${error.message}`);
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
            await conn.sendMessage(chatId, { 
                text: `❌ *Download Failed*\n\nReason: ${error.message}\n\n${settings.footer}` 
            }, { quoted: mek });
        }
    }
};