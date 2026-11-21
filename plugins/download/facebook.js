const settings = require('../../settings');
const axios = require('axios');
const logger = require('../../lib/logger');

function pickFacebookVideoUrl(payload) {
    if (!payload) return null;
    const roots = [payload, payload.data, payload.result, payload.data?.result].filter(Boolean);
    for (const root of roots) {
        const links = root.download_links || root.downloads || root.links;
        if (Array.isArray(links)) {
            const preferred = links.find(item => /720|1080|hd/i.test(item?.quality || item?.label || '')) || links[0];
            const url = typeof preferred === 'string' ? preferred : preferred?.url;
            if (/^https?:\/\//i.test(url || '')) return url;
        }
        for (const key of ['video', 'videoUrl', 'video_url', 'download_url', 'downloadUrl', 'url', 'hd', 'sd', 'mp4']) {
            const value = root[key];
            if (typeof value === 'string' && /^https?:\/\//i.test(value)) return value;
        }
    }
    return null;
}

module.exports = {
    name: 'facebook',
    aliases: ['fb', 'fbdl', 'fbvideo'],
    category: 'download',
    description: 'Download Facebook videos/reels with maximum reliability',
    usage: '.fb <url>',
    react: '🔵',

    async execute(conn, mek, args, chatId) {
        const url = args.join(' ').trim();
        
        if (!url || (!/facebook\.com/i.test(url) && !/fb\.watch/i.test(url))) {
            return conn.sendMessage(chatId, { 
                text: `🎬 *FACEBOOK DOWNLOADER*\n\nPlease provide a valid Facebook video or reel URL.\nExample: ${settings.prefix}fb https://www.facebook.com/reel/123456789/\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `⏳ *Analyzing Facebook link...*\n\n_Using multi-stage robust engines._` }, { quoted: mek });

        let videoUrl = null;
        let usedEngine = "";

        // --- STAGE 1: ELITEPROTECH API ---
        try {
            const res = await axios.get(`https://eliteprotech-apis.zone.id/download/facebook?url=${encodeURIComponent(url)}`, {
                timeout: 15000,
                headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
            });
            if (res.data?.success !== false) {
                videoUrl = pickFacebookVideoUrl(res.data);
                if (videoUrl) usedEngine = "EliteProTech Engine";
            }
        } catch (e) {
            logger.warn(`[FB] Stage 1 failed: ${e.message}`);
        }

        // --- STAGE 2: PREXZY API (facebook) ---
        if (!videoUrl) {
            try {
                const res = await axios.get(`https://prexzyapis.com/download/facebook?url=${encodeURIComponent(url)}`, { timeout: 15000 });
                if (res.data.status) {
                    videoUrl = pickFacebookVideoUrl(res.data);
                    if (videoUrl) usedEngine = "Prexzy Engine (facebook)";
                }
            } catch (e) {
                logger.warn(`[FB] Stage 2 failed: ${e.message}`);
            }
        }

        // --- STAGE 3: PREXZY API (facebookv2) ---
        if (!videoUrl) {
            try {
                const res = await axios.get(`https://prexzyapis.com/download/facebookv2?url=${encodeURIComponent(url)}`, { timeout: 15000 });
                if (res.data.status) {
                    videoUrl = pickFacebookVideoUrl(res.data);
                    if (videoUrl) usedEngine = "Prexzy Engine (facebookv2)";
                }
            } catch (e) {
                logger.warn(`[FB] Stage 3 failed: ${e.message}`);
            }
        }

        // --- STAGE 4: MAHER AI API ---
        if (!videoUrl) {
            try {
                const res = await axios.get(`https://api.maher-zubair.tech/download/facebook?url=${encodeURIComponent(url)}`, { timeout: 15000 });
                if (res.data.status) {
                    videoUrl = pickFacebookVideoUrl(res.data);
                    if (videoUrl) usedEngine = "Maher AI Engine";
                }
            } catch (e) {
                logger.warn(`[FB] Stage 4 failed: ${e.message}`);
            }
        }

        // --- STAGE 5: PREXZY API (Alternative) ---
        if (!videoUrl) {
            try {
                const res = await axios.get(`https://prexzyapis.com/media/facebook?url=${encodeURIComponent(url)}`, { timeout: 15000 });
                if (res.data.status) {
                    videoUrl = pickFacebookVideoUrl(res.data);
                    if (videoUrl) usedEngine = "Prexzy Engine (Alternative)";
                }
            } catch (e) {
                logger.warn(`[FB] Stage 5 failed: ${e.message}`);
            }
        }

        // --- STAGE 6: SIPUTZX API ---
        if (!videoUrl) {
            try {
                const res = await axios.get(`https://api.siputzx.my.id/api/d/facebook?url=${encodeURIComponent(url)}`, { timeout: 15000 });
                if (res.data.status && res.data.data) {
                    videoUrl = pickFacebookVideoUrl(res.data);
                    if (videoUrl) usedEngine = "Siputzx Engine";
                }
            } catch (e) {
                logger.warn(`[FB] Stage 6 failed: ${e.message}`);
            }
        }

        // --- STAGE 7: VREDEN API ---
        if (!videoUrl) {
            try {
                const res = await axios.get(`https://api.vreden.my.id/api/facebook?url=${encodeURIComponent(url)}`, { timeout: 15000 });
                if (res.data.status) {
                    videoUrl = pickFacebookVideoUrl(res.data);
                    if (videoUrl) usedEngine = "Vreden Engine";
                }
            } catch (e) {
                logger.warn(`[FB] Stage 7 failed: ${e.message}`);
            }
        }

        // --- STAGE 8: NEXORACLE (The one we used earlier) ---
        if (!videoUrl) {
            try {
                const res = await axios.get(`https://api.nexoracle.com/downloader/facebook?url=${encodeURIComponent(url)}&apikey=free_key`, { timeout: 15000 });
                videoUrl = res.data?.result?.hd || res.data?.result?.sd || res.data?.result?.video;
                if (videoUrl) usedEngine = "Nexoracle Engine";
            } catch (e) {
                logger.warn(`[FB] Stage 8 failed: ${e.message}`);
            }
        }

        // --- FINAL DELIVERY ---
        if (!videoUrl) {
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
            return conn.sendMessage(chatId, { 
                text: `❌ *DOWNLOAD FAILED*\n\nAll 8 Facebook engines are currently unavailable or failed to retrieve the video.\n\n*Possible reasons:*\n1. Video is private or deleted.\n2. API limits reached.\n3. Servers are down.\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        try {
            await conn.sendMessage(chatId, {
                video: { url: videoUrl },
                mimetype: "video/mp4",
                caption: `🎬 *FACEBOOK DOWNLOADED*\n\n🔗 *Engine:* ${usedEngine}\n\n${settings.footer}`
            }, { quoted: mek });

            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (err) {
            logger.error(`[FB] Send Error: ${err.message}`);
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
            await conn.sendMessage(chatId, { 
                text: `❌ *ERROR:* The video was found, but it is too large for WhatsApp (over 60MB) or the URL expired.\n\n${settings.footer}` 
            }, { quoted: mek });
        }
    },
};