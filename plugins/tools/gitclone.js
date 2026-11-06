const sharp = require('sharp');
const settings = require('../../settings');
const logger = require('../../lib/logger');

module.exports = {
    name: 'gitclone',
    aliases: ['commit', 'git'],
    category: 'tools',
    description: 'Generate a fake GitHub commit screenshot',
    usage: '.gitclone <commit message>',
    react: '💻',

    async execute(conn, mek, args, chatId) {
        const commitMsg = args.join(' ') || 'Initial commit';

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `💻 *Generating GitHub Commit...*` }, { quoted: mek });

        try {
            // Generate a random commit hash
            const hash = Math.random().toString(16).substring(2, 9);
            const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

            const width = 800;
            const height = 300;

            // Draw the GitHub UI using SVG + Sharp
            const svgImage = `
                <svg width="${width}" height="${height}">
                    <!-- Background -->
                    <rect width="${width}" height="${height}" fill="#0d1117" />
                    
                    <!-- Top Bar -->
                    <rect width="${width}" height="60" fill="#161b22" />
                    <circle cx="30" cy="30" r="8" fill="#ff5f56" />
                    <circle cx="55" cy="30" r="8" fill="#ffbd2e" />
                    <circle cx="80" cy="30" r="8" fill="#27c93f" />
                    
                    <!-- Commit Icon -->
                    <circle cx="50" cy="150" r="15" fill="#238636" />
                    <path d="M45 150 L55 150 M50 145 L50 155" stroke="#fff" stroke-width="2" />

                    <!-- Commit Info -->
                    <text x="90" y="135" fill="#c9d1d9" font-family="Arial, sans-serif" font-size="22" font-weight="bold">${commitMsg.substring(0, 40)}</text>
                    <text x="90" y="165" fill="#8b949e" font-family="Arial, sans-serif" font-size="18">Nexora Bot committed just now</text>
                    
                    <!-- Commit Hash -->
                    <rect x="90" y="190" width="80" height="28" rx="6" fill="#21262d" stroke="#30363d" />
                    <text x="100" y="210" fill="#58a6ff" font-family="monospace" font-size="16">${hash}</text>

                    <!-- Branch Tag -->
                    <rect x="185" y="190" width="60" height="28" rx="6" fill="#21262d" stroke="#30363d" />
                    <text x="195" y="210" fill="#c9d1d9" font-family="monospace" font-size="14">main</text>

                    <!-- Date -->
                    <text x="${width - 150}" y="210" fill="#8b949e" font-family="Arial, sans-serif" font-size="16">${date}</text>

                    <!-- Verified Badge -->
                    <rect x="90" y="240" width="180" height="30" rx="6" fill="#1f6feb" opacity="0.2" />
                    <text x="100" y="260" fill="#58a6ff" font-family="Arial, sans-serif" font-size="16">✓ Verified Commit</text>
                </svg>
            `;

            // Convert to PNG
            const buffer = await sharp(Buffer.from(svgImage)).png().toBuffer();

            // Send image
            await conn.sendMessage(chatId, {
                image: buffer,
                caption: `✅ *Fake GitHub Commit Generated!*\n\n_Use this to flex that you updated your bot._\n\n${settings.footer}`
            }, { quoted: mek });

            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (error) {
            logger.error(`[GITCLONE] Error: ${error.message}`);
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
            await conn.sendMessage(chatId, { 
                text: `❌ Failed to generate: ${error.message}\n\n${settings.footer}` 
            }, { quoted: mek });
        }
    }
};