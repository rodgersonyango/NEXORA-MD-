const axios = require('axios');
const fs = require('fs');
const path = require('path');
const settings = require('../../settings');
const logger = require('../../lib/logger');

// WhatsApp safe limit for panel/Heroku RAM
const MAX_WA_LIMIT = 60 * 1024 * 1024; 

module.exports = {
    name: 'directdl',
    aliases: ['dl', 'download'],
    category: 'download',
    description: 'Download direct files (movies, zips) or social media videos',
    usage: '.directdl <url>',
    react: '📥',

    async execute(conn, mek, args, chatId) {
        const url = args[0];
        if (!url || !url.startsWith('http')) {
            return conn.sendMessage(chatId, { 
                text: `❌ Please provide a valid link.\nExample: ${settings.prefix}directdl https://example.com/movie.mp4\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `🔍 Analyzing link...` }, { quoted: mek });

        try {
            let finalDownloadUrl = null;
            let fileName = `NEXORA_FILE_${Date.now()}`;
            let isSocial = false;

            // ═══════════════════════════════════════════════════════
            // 1. SOCIAL MEDIA DETECTION (TikTok, YT, IG, FB)
            // ═══════════════════════════════════════════════════════
            const socialRegex = /(youtube\.com|youtu\.be|tiktok\.com|instagram\.com|facebook\.com|fb\.watch)/i;
            
            if (socialRegex.test(url)) {
                isSocial = true;
                await conn.sendMessage(chatId, { text: `📱 Social media link detected. Extracting media...` }, { quoted: mek });
                
                try {
                    // Using a public API to grab the raw video URL
                    const apiUrl = `https://api.nexoracle.com/downloader/ytdl?url=${encodeURIComponent(url)}&apikey=free_key`;
                    const apiRes = await axios.get(apiUrl, { timeout: 20000 });
                    
                    finalDownloadUrl = apiRes.data?.result?.url || 
                                       apiRes.data?.result?.video || 
                                       apiRes.data?.data?.play ||
                                       apiRes.data?.link;
                    
                    if (apiRes.data?.result?.title) {
                        fileName = `${apiRes.data.result.title.substring(0, 25).replace(/[^a-z0-9]/gi, '_')}.mp4`;
                    } else {
                        fileName += '.mp4';
                    }
                } catch (e) {
                    logger.warn(`[SOCIAL API] Extraction failed: ${e.message}`);
                    // Will fall through and fail gracefully below
                }
            }

            // ═══════════════════════════════════════════════════════
            // 2. DIRECT FILE DETECTION (Movies, APKs, PDFs, ZIPs)
            // ═══════════════════════════════════════════════════════
            if (!finalDownloadUrl) {
                const headRes = await axios.head(url, { 
                    timeout: 15000, 
                    headers: { 'User-Agent': 'Mozilla/5.0' } 
                }).catch(() => null);
                
                if (headRes) {
                    const contentType = headRes.headers['content-type'] || '';
                    const contentLength = parseInt(headRes.headers['content-length'] || '0', 10);
                    
                    // Reject HTML pages
                    if (contentType.includes('text/html')) {
                        return conn.sendMessage(chatId, { 
                            text: `❌ This link is a webpage, not a downloadable file.\n\nIf it's a video, the site might be blocking the bot.\n\n${settings.footer}` 
                        }, { quoted: mek });
                    }

                    // Handle Large Movies (Over 60MB)
                    if (contentLength > MAX_WA_LIMIT) {
                        const sizeMB = (contentLength / 1024 / 1024).toFixed(2);
                        return conn.sendMessage(chatId, { 
                            text: `🍿 *Large File Detected (${sizeMB} MB)*\n\nWhatsApp's limit is 60MB, so I cannot send this directly in chat. \n\nClick the link below to download it in your browser:\n🔗 ${url}\n\n${settings.footer}` 
                        }, { quoted: mek });
                    }
                    
                    // It's a valid, downloadable file under 60MB
                    finalDownloadUrl = url;
                    
                    // Grab file extension from URL (e.g. .mp4, .pdf)
                    const urlParts = url.split('?')[0].split('/');
                    const lastPart = urlParts[urlParts.length - 1];
                    if (lastPart && lastPart.includes('.')) {
                        fileName = lastPart;
                    }
                }
            }

            // If nothing was found
            if (!finalDownloadUrl) {
                return conn.sendMessage(chatId, { 
                    text: `❌ Unsupported or invalid link.\n\nMake sure it is a direct download link or a public social media video.\n\n${settings.footer}` 
                }, { quoted: mek });
            }

            // ═══════════════════════════════════════════════════════
            // 3. DOWNLOAD AND SEND
            // ═══════════════════════════════════════════════════════
            await conn.sendMessage(chatId, { text: `📥 Downloading file...` }, { quoted: mek });

            const tmpDir = path.join(process.cwd(), 'data', 'tmp');
            if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
            const filePath = path.join(tmpDir, fileName);

            const writer = fs.createWriteStream(filePath);
            const response = await axios({
                url: finalDownloadUrl,
                method: 'GET',
                responseType: 'stream',
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 60000 // 60 seconds max download time
            });

            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            const stats = fs.statSync(filePath);
            if (stats.size === 0) throw new Error("Downloaded file is empty.");

            const buffer = fs.readFileSync(filePath);

            // Send video natively if it's social media, else send as document
            if (isSocial && (fileName.endsWith('.mp4') || fileName.endsWith('.mkv'))) {
                await conn.sendMessage(chatId, {
                    video: buffer,
                    caption: `✅ Downloaded successfully!\n📁 ${fileName}\n📦 ${(stats.size/1024/1024).toFixed(1)} MB\n\n${settings.footer}`
                }, { quoted: mek });
            } else {
                await conn.sendMessage(chatId, {
                    document: buffer,
                    fileName: fileName,
                    mimetype: 'application/octet-stream',
                    caption: `✅ Downloaded successfully!\n📁 ${fileName}\n📦 ${(stats.size/1024/1024).toFixed(1)} MB\n\n${settings.footer}`
                }, { quoted: mek });
            }

            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

            // Cleanup temp file to save server disk space
            setTimeout(() => {
                try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) {}
            }, 5000);

        } catch (error) {
            logger.error(`[DIRECTDL] Error: ${error.message}`);
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
            await conn.sendMessage(chatId, { 
                text: `❌ Download failed.\nReason: ${error.message}\n\nMake sure the link is public and valid.\n\n${settings.footer}` 
            }, { quoted: mek });
        }
    }
};