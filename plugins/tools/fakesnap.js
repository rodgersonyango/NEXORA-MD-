const sharp = require('sharp');
const settings = require('../../settings');
const logger = require('../../lib/logger');

module.exports = {
    name: 'fakesnap',
    aliases: ['fakesnap', 'fakig', 'fakesnapchat'],
    category: 'tools',
    description: 'Generate a fake Instagram/Snapchat chat screenshot',
    usage: '.fakesnap name1 | text1 | name2 | text2',
    react: '📸',

    async execute(conn, mek, args, chatId) {
        const input = args.join(' ');

        if (!input || !input.includes('|')) {
            return conn.sendMessage(chatId, { 
                text: `❌ *Format Error!*\n\nUse a pipe ( | ) to separate the messages.\n\n*Example:*\n${settings.prefix}fakesnap Elon Musk | I bought Twitter | Me | Wow\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        const parts = input.split('|').map(p => p.trim());
        if (parts.length < 2) {
            return conn.sendMessage(chatId, { text: `❌ You need at least one message.` }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `📸 *Generating Instagram Chat...*` }, { quoted: mek });

        try {
            const width = 800;
            let currentY = 160;
            let svgBubbles = '';

            // Build the chat bubbles
            let isUser1 = true;
            for (let i = 0; i < parts.length; i += 2) {
                const name = parts[i] || 'User';
                const text = parts[i + 1] || '...';
                const isMe = isUser1;

                // Simple word wrap
                const maxChars = 35;
                const words = text.split(' ');
                let lines = [];
                let currentLine = '';
                for (let word of words) {
                    if ((currentLine + word).length > maxChars) {
                        lines.push(currentLine.trim());
                        currentLine = '';
                    }
                    currentLine += word + ' ';
                }
                if (currentLine.trim()) lines.push(currentLine.trim());

                const bubbleHeight = (lines.length * 35) + 50;
                const bubbleWidth = isMe ? 450 : 480; 
                const bubbleX = isMe ? width - bubbleWidth - 20 : 20;

                // IG Bubble color (Dark mode)
                const bgColor = isMe ? '#3797f0' : '#262626'; 
                const textColor = isMe ? '#ffffff' : '#f5f5f5';

                svgBubbles += `<rect x="${bubbleX}" y="${currentY}" width="${bubbleWidth}" height="${bubbleHeight}" rx="20" fill="${bgColor}" />`;

                lines.forEach((line, index) => {
                    const safeLine = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    svgBubbles += `<text x="${bubbleX + 20}" y="${currentY + 35 + (index * 35)}" fill="${textColor}" font-family="Arial, sans-serif" font-size="24">${safeLine}</text>`;
                });

                // Add a subtle fake "Seen" or time
                const time = new Date(Date.now() - (parts.length - i) * 60000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                svgBubbles += `<text x="${bubbleX + bubbleWidth - 60}" y="${currentY + bubbleHeight - 10}" fill="${isMe ? '#b0d4ff' : '#8e8e8e'}" font-family="Arial, sans-serif" font-size="14">${time}</text>`;

                currentY += bubbleHeight + 20;
                isUser1 = !isUser1;
            }

            const finalHeight = currentY + 30;

            // Build the full Instagram UI
            const svgImage = `
                <svg width="${width}" height="${finalHeight}">
                    <!-- IG Dark Mode Background -->
                    <rect width="${width}" height="${finalHeight}" fill="#000000" />
                    
                    <!-- IG Top Header -->
                    <rect width="${width}" height="100" fill="#000000" />
                    <text x="20" y="65" fill="#ffffff" font-family="Arial, sans-serif" font-size="36">←</text>
                    
                    <!-- Profile Picture Circle -->
                    <circle cx="90" cy="50" r="28" fill="#333" />
                    
                    <!-- Username -->
                    <text x="140" y="58" fill="#ffffff" font-family="Arial, sans-serif" font-size="26" font-weight="bold">${parts[0] || 'Username'}</text>
                    
                    <!-- Verified Badge -->
                    <path d="M320 45 l5 5 l10 -10 l-5 -5 z" fill="#0095f6" />
                    <text x="335" y="58" fill="#0095f6" font-family="Arial, sans-serif" font-size="24">✓</text>

                    <!-- Bubbles -->
                    ${svgBubbles}
                </svg>
            `;

            const buffer = await sharp(Buffer.from(svgImage)).png().toBuffer();

            await conn.sendMessage(chatId, {
                image: buffer,
                caption: `✅ *Fake Instagram Chat Generated!*\n\n_Save this image and post it on your status._\n\n${settings.footer}`
            }, { quoted: mek });

            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (error) {
            logger.error(`[FAKESNAP] Error: ${error.message}`);
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
            await conn.sendMessage(chatId, { 
                text: `❌ Failed to generate: ${error.message}\n\n${settings.footer}` 
            }, { quoted: mek });
        }
    }
};