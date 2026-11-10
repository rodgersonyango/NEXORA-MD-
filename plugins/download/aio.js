const settings = require('../../settings');
const axios = require('axios');
const logger = require('../../lib/logger');

const BASE = 'https://downr.org';
const USER_AGENT = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36';

// Helper function to get the session cookie
async function getSession() {
    try {
        const res = await axios.get(`${BASE}/.netlify/functions/analytics`, {
            headers: { 'User-Agent': USER_AGENT, 'Referer': `${BASE}/` }
        });
        
        // Extract cookies
        const rawCookies = res.headers['set-cookie'] || [];
        return rawCookies.map(c => c.split(';')[0]).join('; ');
    } catch (e) {
        return '';
    }
}

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
        await conn.sendMessage(chatId, { text: `🚀 *Connecting to Downr Servers...*` }, { quoted: mek });

        try {
            // 1. Get Session Cookie
            let cookie = await getSession();

            // 2. Send POST request to Downr API
            let response;
            try {
                response = await axios.post(`${BASE}/.netlify/functions/bbc`, 
                    { url: url },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Origin': BASE,
                            'Referer': `${BASE}/`,
                            'User-Agent': USER_AGENT,
                            ...(cookie ? { 'Cookie': cookie } : {})
                        },
                        validateStatus: () => true // Allow us to handle 403/429 manually
                    }
                );
            } catch (e) {
                throw new Error(`Network Error: ${e.message}`);
            }

            // 3. Handle Retry (If Downr says "user_retry_required")
            if (response.status === 403) {
                const text = String(response.data);
                if (text.includes('user_retry_required')) {
                    // Get a new cookie and try again
                    cookie = await getSession();
                    response = await axios.post(`${BASE}/.netlify/functions/bbc`, 
                        { url: url },
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                'Origin': BASE,
                                'Referer': `${BASE}/`,
                                'User-Agent': USER_AGENT,
                                ...(cookie ? { 'Cookie': cookie } : {})
                            }
                        }
                    );
                } else {
                    throw new Error('Access forbidden by Downr (Bypass failed).');
                }
            }

            if (response.status === 429) {
                throw new Error('Too many requests. Please wait a minute and try again.');
            }

            const data = response.data;

            if (data.error) {
                throw new Error(data.error || 'Invalid or unsupported URL.');
            }

            // 4. Extract the media
            const medias = data.medias || [];
            if (medias.length === 0) {
                throw new Error('No media found in the response.');
            }

            // Sort to prefer HD/Video
            const video = medias.find(m => m.type === 'video' && !m.is_audio);
            const audio = medias.find(m => m.is_audio === true);
            
            const finalMedia = video || medias[0];
            const title = data.title || 'Untitled Media';

            // 5. Send the video
            if (finalMedia.type === 'video' || finalMedia.type === 'image') {
                const content = {
                    caption: `✅ *Download Success!*\n\n📝 Title: ${title}\n📦 Quality: ${finalMedia.quality || 'Default'}\n🌐 Source: ${data.source || 'Unknown'}\n\n${settings.footer}`
                };
                
                if (finalMedia.type === 'video') content.video = { url: finalMedia.url };
                else content.image = { url: finalMedia.url };

                await conn.sendMessage(chatId, content, { quoted: mek });
            } 
            // 6. Or send as audio if it's only audio
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