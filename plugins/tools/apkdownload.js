const settings = require('../../settings');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const logger = require('../../lib/logger');

// Helper: Send the APK file
async function sendApk(conn, chatId, mek, apkData, appName) {
    const tmpDir = path.join(process.cwd(), 'data', 'tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    
    const safeName = appName.replace(/[^a-z0-9]/gi, '_').slice(0, 30);
    const filePath = path.join(tmpDir, `${safeName}_${Date.now()}.apk`);

    try {
        // Download the APK
        const res = await axios.get(apkData.url, {
            responseType: 'arraybuffer',
            timeout: 60000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        const buffer = Buffer.from(res.data);
        
        // WhatsApp limit check (60MB)
        if (buffer.length > 60 * 1024 * 1024) {
            return conn.sendMessage(chatId, { 
                text: `⚠️ *File Too Large*\n\nThe APK is ${(buffer.length / 1024 / 1024).toFixed(1)}MB, which exceeds WhatsApp's 60MB limit.\n\n🔗 *Direct Link:* ${apkData.url}` 
            }, { quoted: mek });
        }

        await conn.sendMessage(chatId, {
            document: buffer,
            fileName: `${safeName}.apk`,
            mimetype: 'application/vnd.android.package-archive',
            caption: `📱 *APK DOWNLOADED*\n\n📦 *App:* ${appName}\n📊 *Size:* ${(buffer.length / 1024 / 1024).toFixed(2)} MB\n📌 *Version:* ${apkData.version}\n\n${settings.footer}`
        }, { quoted: mek });

    } catch (e) {
        logger.error(`[APK] Download failed: ${e.message}`);
        await conn.sendMessage(chatId, { 
            text: `❌ *Download Failed*\n\nReason: ${e.message}\n\nTry the direct link:\n🔗 ${apkData.url}` 
        }, { quoted: mek });
    } finally {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
}

module.exports = {
    name: 'apkdownload',
    aliases: ['fdroid', 'fdroidapk', 'downloadapk', 'getapk'],
    category: 'tools',
    description: 'Download and send an official F-Droid APK',
    usage: '.apkdownload <app_name>',
    react: '📱',

    async execute(conn, mek, args, chatId) {
        const query = args.join(' ').trim();
        
        if (!query) {
            return conn.sendMessage(chatId, { 
                text: `📱 *F-DROID APK DOWNLOADER*\n\n*Usage:*\n${settings.prefix}apkdownload <app_name>\n\n*Examples:*\n${settings.prefix}apkdownload firefox\n${settings.prefix}apkdownload telegram\n${settings.prefix}apkdownload vlc\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `🔍 *Searching F-Droid for "${query}"...*` }, { quoted: mek });

        try {
            // 1. Search F-Droid API
            const searchRes = await axios.get(`https://search.f-droid.org/api/v1/search?q=${encodeURIComponent(query)}`, {
                headers: { 'Accept': 'application/json' },
                timeout: 15000
            });

            const results = searchRes.data?.results || [];
            if (results.length === 0) {
                return conn.sendMessage(chatId, { 
                    text: `❌ *App Not Found*\n\nNo results for "${query}" on F-Droid.\n\n${settings.footer}` 
                }, { quoted: mek });
            }

            // 2. Pick the best match
            const app = results[0];
            const packageName = app.packageName;
            
            await conn.sendMessage(chatId, { 
                text: `📱 *Found:* ${app.name}\n\n_Version: ${app.suggestedVersionCode || 'Latest'}_\n\n_Downloading APK..._` 
            }, { quoted: mek });

            // 3. Get APK info from F-Droid
            const apkRes = await axios.get(`https://f-droid.org/api/v1/packages/${packageName}`, {
                headers: { 'Accept': 'application/json' },
                timeout: 15000
            });

            const pkgInfo = apkRes.data?.packages?.[0];
            if (!pkgInfo) throw new Error("Could not find APK build info.");

            const apkData = {
                url: `https://f-droid.org/repo/${packageName}_${pkgInfo.versionCode}.apk`,
                version: pkgInfo.versionName || 'Latest'
            };

            // 4. Download and send
            await sendApk(conn, chatId, mek, apkData, app.name);

            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (error) {
            logger.error(`[APK] Error: ${error.message}`);
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
            await conn.sendMessage(chatId, { 
                text: `❌ *Failed:* ${error.message}\n\n${settings.footer}` 
            }, { quoted: mek });
        }
    }
};