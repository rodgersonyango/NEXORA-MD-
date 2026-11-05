const os = require('os');
const fs = require('fs');
const path = require('path');
const settings = require('../../settings');
const owner = require('../../lib/owner');

module.exports = {
    name: 'system',
    aliases: ['sys', 'host', 'server', 'repo'],
    category: 'owner',
    description: 'Get detailed system, hosting, and repo diagnostics',
    usage: '.system',
    ownerOnly: true,
    react: '🖥️',

    async execute(conn, mek, args, chatId, isOwner) {
        // Only allow Owner to run system diagnostics
        if (!isOwner) {
            return conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });

        try {
            // ═══════════════════════════════════════════════════════
            // 1. HOSTING & SYSTEM DETAILS
            // ═══════════════════════════════════════════════════════
            const uptimeSeconds = process.uptime();
            const days = Math.floor(uptimeSeconds / 86400);
            const hours = Math.floor((uptimeSeconds % 86400) / 3600);
            const minutes = Math.floor((uptimeSeconds % 3600) / 60);
            const seconds = Math.floor(uptimeSeconds % 60);
            
            const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;
            const platform = os.platform();
            const arch = os.arch();
            const cpuModel = os.cpus()[0].model.trim();
            const cpuCores = os.cpus().length;
            
            // RAM Usage
            const totalMem = (os.totalmem() / 1024 / 1024).toFixed(0);
            const freeMem = (os.freemem() / 1024 / 1024).toFixed(0);
            const usedMem = (totalMem - freeMem);
            const ramUsage = process.memoryUsage().rss / 1024 / 1024;
            
            const nodeVersion = process.version;
            const pid = process.pid;

            // ═══════════════════════════════════════════════════════
            // 2. REPO DETAILS (Attempts to read package.json & .git)
            // ═══════════════════════════════════════════════════════
            let repoName = 'Unknown';
            let repoVersion = 'Unknown';
            try {
                const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
                repoName = pkg.name || 'Unknown';
                repoVersion = pkg.version || 'Unknown';
            } catch (e) {}

            let gitBranch = 'Unknown';
            let gitCommit = 'Unknown';
            try {
                const headFile = fs.readFileSync(path.join(process.cwd(), '.git', 'HEAD'), 'utf8').trim();
                if (headFile.startsWith('ref:')) {
                    gitBranch = headFile.replace('ref: refs/heads/', '');
                    const commitHash = fs.readFileSync(path.join(process.cwd(), '.git', `refs/heads/${gitBranch}`), 'utf8').trim();
                    gitCommit = commitHash.substring(0, 7);
                } else {
                    gitCommit = headFile.substring(0, 7);
                }
            } catch (e) {}

            // Detect Hosting Provider
            let hosting = 'Local / Unknown';
            if (process.env.DYNO) hosting = 'Heroku';
            else if (process.env.RENDER) hosting = 'Render';
            else if (process.env.RAILWAY_STATIC_URL) hosting = 'Railway';
            else if (process.env.KATABUMP) hosting = 'Katabump';
            else if (process.env.P_SERVER_ID || process.env.SERVER_MEMORY) hosting = 'Pterodactyl / Panel';
            else if (process.env.REPL_ID) hosting = 'Replit';
            else if (process.env.VERCEL) hosting = 'Vercel (Not Recommended)';
            else if (process.env.AWS_LAMBDA_FUNCTION_NAME) hosting = 'AWS Lambda';
            else if (platform === 'linux' && fs.existsSync('/.dockerenv')) hosting = 'Docker Container';
            else if (platform === 'linux' && fs.existsSync('/data/data/com.termux')) hosting = 'Termux (Android)';
            else if (platform === 'win32') hosting = 'Windows (Local)';

            // ═══════════════════════════════════════════════════════
            // 3. NUMBER / BOT DETAILS
            // ═══════════════════════════════════════════════════════
            const botNumber = conn.user?.id ? conn.user.id.split(':')[0] : 'Unknown';
            const botName = conn.user?.name || 'Unknown';
            const pairedOwner = owner.getPairedNumber() || settings.ownerNumber || 'Unknown';

            // ═══════════════════════════════════════════════════════
            // 4. BUILD THE MESSAGE
            // ═══════════════════════════════════════════════════════
            const systemText = `🖥️ *NEXORA MD - SYSTEM DIAGNOSTICS*
            
*📂 REPOSITORY DETAILS*
• Name: ${repoName}
• Version: ${repoVersion}
• Branch: ${gitBranch}
• Commit: ${gitCommit}
• Prefix: ${settings.prefix || '.'}

*☁️ HOSTING DETAILS*
• Provider: ${hosting}
• OS: ${platform} (${arch})
• Uptime: ${uptimeString}
• Node.js: ${nodeVersion}
• PID: ${pid}

*💻 HARDWARE & RAM*
• CPU: ${cpuModel}
• Cores: ${cpuCores}
• System RAM: ${usedMem}MB / ${totalMem}MB
• Bot RAM: ${ramUsage.toFixed(2)} MB

*📱 BOT ACCOUNT INFO*
• Bot Number: +${botNumber}
• Bot Name: ${botName}
• Owner Number: +${pairedOwner}

_Use .sys to check status anytime._
${settings.footer}`;

            // Try to fetch the bot's profile picture to make it look premium
            try {
                const ppUrl = await conn.profilePictureUrl(conn.user.id, 'image');
                const axios = require('axios');
                const buffer = await axios.get(ppUrl, { responseType: 'arraybuffer' }).then(res => Buffer.from(res.data));
                
                await conn.sendMessage(chatId, { 
                    image: buffer, 
                    caption: systemText 
                }, { quoted: mek });
            } catch (e) {
                // If no profile picture, just send text
                await conn.sendMessage(chatId, { text: systemText }, { quoted: mek });
            }

            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (error) {
            console.error('[SYSTEM] Error:', error.message);
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
            await conn.sendMessage(chatId, { 
                text: `❌ Failed to fetch system details.\n${error.message}\n\n${settings.footer}` 
            }, { quoted: mek });
        }
    }
};