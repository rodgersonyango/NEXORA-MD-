const axios = require('axios');
const sharp = require('sharp');
const settings = require('../../settings');
const logger = require('../../lib/logger');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'bio',
    aliases: ['fakebio', 'fakestatus'],
    category: 'tools',
    description: 'Generate a fake WhatsApp profile picture with custom bio text',
    usage: '.bio <text> (Reply to an image)',
    react: '🤯',

    async execute(conn, mek, args, chatId) {
        const text = args.join(' ');

        if (!text) {
            return conn.sendMessage(chatId, { 
                text: `❌ Please provide the text for the fake bio.\n\n*How to use:*\nReply to an image with ${settings.prefix}bio I am the CEO\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        // Check if user is replying to an image
        const quotedMsg = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const isImage = quotedMsg?.imageMessage;

        if (!isImage) {
            return conn.sendMessage(chatId, { 
                text: `❌ You must reply to an *Image* to generate the fake bio.\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `🤯 *Creating Fake WhatsApp Profile...*\nPlease wait...` }, { quoted: mek });

        try {
            // 1. Download the image the user replied to
            const buffer = await downloadMediaMessage(
                { message: { imageMessage: isImage } },
                'buffer',
                {},
                { logger: console, reuploadRequest: conn.updateMediaMessage }
            );

            // 2. Use Sharp to resize and add a dark gradient at the bottom for the text
            const img = sharp(buffer);
            const metadata = await img.metadata();
            
            // Force image to be at least 500x700 (portrait mode like a WhatsApp PP)
            const width = metadata.width || 800;
            const height = metadata.height || 800;

            // Create a black gradient SVG to go at the bottom where the text sits
            const gradientSvg = `
                <svg width="${width}" height="${height}">
                    <defs>
                        <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="60%" style="stop-color:rgb(0,0,0);stop-opacity:0" />
                            <stop offset="100%" style="stop-color:rgb(0,0,0);stop-opacity:0.9" />
                        </linearGradient>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grad)" />
                </svg>
            `;

            // Composite the gradient over the image
            const baseImage = await img.composite([{ input: Buffer.from(gradientSvg), blend: 'over' }]).toBuffer();

            // 3. Create the text SVG
            // Break text into multiple lines if it's too long
            const maxCharsPerLine = 25;
            const words = text.split(' ');
            let lines = [];
            let currentLine = '';

            for (const word of words) {
                if ((currentLine + word).length > maxCharsPerLine) {
                    lines.push(currentLine.trim());
                    currentLine = '';
                }
                currentLine += word + ' ';
            }
            if (currentLine.trim()) lines.push(currentLine.trim());

            // Only take the first 3 lines so it fits
            lines = lines.slice(0, 3);

            const lineHeight = 45;
            const startY = height - 50 - (lines.length * lineHeight);

            let textSvgContent = `<svg width="${width}" height="${height}">`;
            
            // Draw the "About" text (or whatever the bio is)
            lines.forEach((line, index) => {
                // Add a subtle black shadow behind text so it's readable
                textSvgContent += `<text x="50%" y="${startY + (index * lineHeight)}" fill="rgba(0,0,0,0.7)" font-family="Arial, sans-serif" font-size="40" font-weight="bold" text-anchor="middle" dy="4">${line}</text>`;
                // Draw the actual white text
                textSvgContent += `<text x="50%" y="${startY + (index * lineHeight)}" fill="#ffffff" font-family="Arial, sans-serif" font-size="40" font-weight="bold" text-anchor="middle">${line}</text>`;
            });

            // Optional: Add a fake camera icon or status bar at the top (just for the aesthetic)
            textSvgContent += `<text x="${width - 150}" y="50" fill="rgba(255,255,255,0.6)" font-family="Arial, sans-serif" font-size="20">${new Date().getHours()}:${new Date().getMinutes()}</text>`;
            
            textSvgContent += `</svg>`;

            // 4. Composite the text over the gradient image
            const finalImage = await sharp(baseImage)
                .composite([{ input: Buffer.from(textSvgContent), blend: 'over' }])
                .jpeg({ quality: 95 })
                .toBuffer();

            // 5. Send the final fake profile picture
            await conn.sendMessage(chatId, {
                image: finalImage,
                caption: `✅ *Fake Bio Generated!*\n\nText: "${text}"\n\n_Save this image and set it as a WhatsApp Profile Picture or Status._\n\n${settings.footer}`
            }, { quoted: mek });

            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (error) {
            logger.error(`[BIO] Error: ${error.message}`);
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
            await conn.sendMessage(chatId, { 
                text: `❌ Generation failed.\nReason: ${error.message}\n\nMake sure your server has 'sharp' installed.\n\n${settings.footer}` 
            }, { quoted: mek });
        }
    }
};