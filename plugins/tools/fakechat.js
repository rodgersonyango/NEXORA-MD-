const { createCanvas, loadImage } = require('canvas');
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

            // 1. Setup Canvas (1080x1920 for high quality)
            const width = 1080;
            const height = Math.max(1920, messages.length * 180 + 400); 
            const canvas = createCanvas(width, height);
            const ctx = canvas.getContext('2d');

            // 2. Background (WhatsApp Dark Mode)
            ctx.fillStyle = '#0b141a';
            ctx.fillRect(0, 0, width, height);

            // 3. Header
            ctx.fillStyle = '#202c33';
            ctx.fillRect(0, 0, width, 150);
            
            // Back arrow & Profile icon (Simulated)
            ctx.fillStyle = '#aebac1';
            ctx.font = '40px Arial';
            ctx.fillText('←', 30, 90);
            ctx.beginPath();
            ctx.arc(120, 75, 40, 0, Math.PI * 2);
            ctx.fillStyle = '#667781';
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = '30px Arial';
            ctx.fillText(messages[0]?.name || 'Chat', 180, 85);

            // 4. Draw Messages
            let currentY = 200;
            const bubblePadding = 30;
            const maxBubbleWidth = width * 0.75;

            for (let i = 0; i < messages.length; i++) {
                const msg = messages[i];
                const isMe = msg.isUser;

                ctx.font = '36px Arial';
                // Word wrap logic
                const words = msg.text.split(' ');
                let lines = [];
                let currentLine = '';
                
                for (let word of words) {
                    const testLine = currentLine + word + ' ';
                    const metrics = ctx.measureText(testLine);
                    if (metrics.width > maxBubbleWidth - (bubblePadding * 2)) {
                        lines.push(currentLine);
                        currentLine = word + ' ';
                    } else {
                        currentLine = testLine;
                    }
                }
                lines.push(currentLine);

                // Calculate bubble size
                const lineHeight = 45;
                const textHeight = lines.length * lineHeight;
                const bubbleHeight = textHeight + (bubblePadding * 2);
                
                let maxLineWidth = 0;
                for (let line of lines) {
                    maxLineWidth = Math.max(maxLineWidth, ctx.measureText(line).width);
                }
                const bubbleWidth = Math.min(maxBubbleWidth, maxLineWidth + (bubblePadding * 2));

                // Bubble X position
                const bubbleX = isMe ? width - bubbleWidth - 40 : 40;

                // Draw Bubble Background
                ctx.fillStyle = isMe ? '#005c4b' : '#202c33';
                ctx.beginPath();
                ctx.roundRect(bubbleX, currentY, bubbleWidth, bubbleHeight, 20);
                ctx.fill();

                // Draw Text
                ctx.fillStyle = '#e9edef';
                for (let j = 0; j < lines.length; j++) {
                    ctx.fillText(lines[j], bubbleX + bubblePadding, currentY + bubblePadding + 35 + (j * lineHeight));
                }

                // Draw Timestamp & Ticks
                ctx.fillStyle = '#8696a0';
                ctx.font = '22px Arial';
                const time = new Date(Date.now() - (messages.length - i) * 60000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                ctx.fillText(time, bubbleX + bubbleWidth - 110, currentY + bubbleHeight - 15);
                
                if (isMe) {
                    // Draw Blue Ticks (✓✓)
                    ctx.fillStyle = '#53bdeb';
                    ctx.font = '22px Arial';
                    ctx.fillText('✓✓', bubbleX + bubbleWidth - 40, currentY + bubbleHeight - 15);
                }

                currentY += bubbleHeight + 30;
            }

            // 5. Crop out the empty bottom space
            const finalHeight = Math.min(height, currentY + 50);
            const finalCanvas = createCanvas(width, finalHeight);
            const finalCtx = finalCanvas.getContext('2d');
            finalCtx.drawImage(canvas, 0, 0, width, finalHeight, 0, 0, width, finalHeight);

            const buffer = finalCanvas.toBuffer('image/jpeg', { quality: 0.95 });

            await conn.sendMessage(chatId, {
                image: buffer,
                caption: `✅ *Fake Chat Generated Locally!*\n\n_Save this image and prank your friends._\n\n${settings.footer}`
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