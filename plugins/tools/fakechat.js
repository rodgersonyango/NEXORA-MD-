const sharp = require('sharp');
const settings = require('../../settings');
const logger = require('../../lib/logger');

module.exports = {
    name: 'fakechat',
    aliases: ['fc', 'fchat'],
    category: 'tools',
    description: 'Generate a fake WhatsApp chat screenshot',
    usage: '.fakechat name1 | text1 | name2 | text2',
    react: '📱',

    async execute(conn, mek, args, chatId) {
        const input = args.join(' ');

        if (!input || !input.includes('|')) {
            return conn.sendMessage(chatId, { 
                text: `❌ *Format Error!*\n\nYou must separate the messages with a pipe symbol ( | ).\n\n*Example:*\n${settings.prefix}fc Me | I miss you | Her | Leave me alone\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        const parts = input.split('|').map(p => p.trim());
        
        if (parts.length < 2) {
            return conn.sendMessage(chatId, { text: `❌ You need at least one message.\nExample: ${settings.prefix}fc Me | Hello` }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `📱 *Generating Fake Chat...*` }, { quoted: mek });

        try {
            // Build messages array
            const messages = [];
            let isUser1 = true;
            for (let i = 0; i < parts.length; i += 2) {
                messages.push({
                    name: parts[i] || 'User',
                    text: parts[i + 1] || '...',
                    isUser: isUser1
                });
                isUser1 = !isUser1;
            }

            const width = 800;
            let currentY = 160;
            let svgBubbles = '';

            // Loop through messages and build SVG bubbles
            for (let i = 0; i < messages.length; i++) {
                const msg = messages[i];
                const isMe = msg.isUser;
                
                // Simple word wrap
                const maxChars = 35;
                const words = msg.text.split(' ');
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

                // Bubble color (WhatsApp Dark Mode)
                const bgColor = isMe ? '#005c4b' : '#202c33';
                
                // Draw bubble background
                svgBubbles += `<rect x="${bubbleX}" y="${currentY}" width="${bubbleWidth}" height="${bubbleHeight}" rx="15" fill="${bgColor}" />`;

                // Draw text
                lines.forEach((line, index) => {
                    // Escape XML characters to prevent SVG crashing
                    const safeLine = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    svgBubbles += `<text x="${bubbleX + 15}" y="${currentY + 35 + (index * 35)}" fill="#e9edef" font-family="Arial, sans-serif" font-size="26">${safeLine}</text>`;
                });

                // Draw Time & Ticks
                const time = new Date(Date.now() - (messages.length - i) * 60000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                svgBubbles += `<text x="${bubbleX + bubbleWidth - 90}" y="${currentY + bubbleHeight - 15}" fill="#8696a0" font-family="Arial, sans-serif" font-size="18">${time}</text>`;
                
                if (isMe) {
                    // Blue checkmarks
                    svgBubbles += `<text x="${bubbleX + bubbleWidth - 35}" y="${currentY + bubbleHeight - 15}" fill="#53bdeb" font-family="Arial, sans-serif" font-size="18">✓✓</text>`;
                }

                currentY += bubbleHeight + 20;
            }

            const finalHeight = currentY + 30;

            // Create the full SVG Canvas
            const svgImage = `
                <svg width="${width}" height="${finalHeight}">
                    <!-- Background -->
                    <rect width="${width}" height="${finalHeight}" fill="#0b141a" />
                    
                    <!-- Header -->
                    <rect width="${width}" height="100" fill="#202c33" />
                    <text x="20" y="60" fill="#aebac1" font-family="Arial, sans-serif" font-size="30">←</text>
                    
                    <!-- Profile Pic Circle -->
                    <circle cx="80" cy="50" r="25" fill="#667781" />
                    
                    <!-- Contact Name -->
                    <text x="120" y="60" fill="#e9edef" font-family="Arial, sans-serif" font-size="24" font-weight="bold">${messages[0]?.name || 'Chat'}</text>

                    <!-- Bubbles -->
                    ${svgBubbles}
                </svg>
            `;

            // Convert SVG to PNG using Sharp
            const buffer = await sharp(Buffer.from(svgImage)).png().toBuffer();

            // Send Image
            await conn.sendMessage(chatId, {
                image: buffer,
                caption: `✅ *Fake Chat Generated!*\n\n_Save this image and prank your friends._\n\n${settings.footer}`
            }, { quoted: mek });

            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (error) {
            logger.error(`[FAKECHAT] Error: ${error.message}`);
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
            await conn.sendMessage(chatId, { 
                text: `❌ Failed to generate chat.\nReason: ${error.message}\n\n${settings.footer}` 
            }, { quoted: mek });
        }
    }
};