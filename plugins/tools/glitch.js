const sharp = require('sharp');
const settings = require('../../settings');
const logger = require('../../lib/logger');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'glitch',
    aliases: ['corrupt', 'datamosh', 'hack'],
    category: 'tools',
    description: 'Apply a cyberpunk glitch effect to an image',
    usage: '.glitch (Reply to an image)',
    react: '👾',

    async execute(conn, mek, args, chatId) {
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        if (!quoted || !quoted.imageMessage) {
            return conn.sendMessage(chatId, { 
                text: `❌ You must reply to an *Image* to glitch it.\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `👾 *Corrupting image data...*` }, { quoted: mek });

        try {
            // 1. Download the image
            const buffer = await downloadMediaMessage(
                { message: quoted, key: mek.key },
                'buffer',
                {},
                { logger: console, reuploadRequest: conn.updateMediaMessage }
            );

            // 2. Get image metadata
            const image = sharp(buffer);
            const metadata = await image.metadata();
            const width = metadata.width;
            const height = metadata.height;

            // 3. Apply the Glitch (RGB Channel Shift + Noise)
            // We shift the Red channel to the left and Blue to the right
            
            const redChannel = await image.clone().extractChannel('red').toBuffer();
            const greenChannel = await image.clone().extractChannel('green').toBuffer();
            const blueChannel = await image.clone().extractChannel('blue').toBuffer();

            // Create the glitched composite
            const glitched = await sharp({
                create: {
                    width: width,
                    height: height,
                    channels: 3,
                    background: { r: 0, g: 0, b: 0 }
                }
            })
            .composite([
                // Shift Red channel 10 pixels right
                { input: redChannel, top: 0, left: 10, blend: 'screen' },
                // Green stays in place
                { input: greenChannel, top: 0, left: 0, blend: 'screen' },
                // Shift Blue channel 10 pixels left
                { input: blueChannel, top: 0, left: -10, blend: 'screen' }
            ])
            .jpeg({ quality: 90 })
            .toBuffer();

            // 4. Add random "Glitch Blocks" (Noise)
            const noiseWidth = Math.floor(width * 0.8);
            const noiseHeight = Math.floor(height * 0.1);
            
            const finalImage = await sharp(glitched)
                .composite([
                    {
                        input: Buffer.from(
                            `<svg width="${width}" height="${height}">
                                <rect x="0" y="${Math.floor(height/3)}" width="${width}" height="${noiseHeight}" fill="rgba(255,0,0,0.3)" />
                                <rect x="0" y="${Math.floor(height/1.5)}" width="${width}" height="${Math.floor(noiseHeight/2)}" fill="rgba(0,255,255,0.3)" />
                                <rect x="${Math.floor(width/4)}" y="0" width="${Math.floor(width/4)}" height="${height}" fill="rgba(255,255,255,0.1)" />
                            </svg>`
                        ),
                        top: 0,
                        left: 0,
                        blend: 'overlay'
                    }
                ])
                .toBuffer();

            // 5. Send the glitched image
            await conn.sendMessage(chatId, {
                image: finalImage,
                caption: `👾 *SYSTEM CORRUPTED*\n\n_Image glitched successfully._\n\n${settings.footer}`
            }, { quoted: mek });

            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (error) {
            logger.error(`[GLITCH] Error: ${error.message}`);
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
            await conn.sendMessage(chatId, { 
                text: `❌ Failed to glitch image: ${error.message}\n\n${settings.footer}` 
            }, { quoted: mek });
        }
    }
};