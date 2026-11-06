const axios = require('axios');
const settings = require('../../settings');
const logger = require('../../lib/logger');

module.exports = {
    name: 'imagine',
    aliases: ['flux', 'aiimage', 'gen'],
    category: 'ai',
    description: 'Generate an AI image from a text prompt',
    usage: '.imagine <prompt>',
    react: '🎨',

    async execute(conn, mek, args, chatId) {
        const prompt = args.join(' ');

        if (!prompt) {
            return conn.sendMessage(chatId, { 
                text: `❌ Please provide a prompt to generate an image.\n\n*Example:*\n${settings.prefix}imagine A futuristic Lamborghini in Nairobi\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '🎨', key: mek.key } });
        await conn.sendMessage(chatId, { text: `🎨 *Generating image...*\nPrompt: "${prompt}"\n\nPlease wait a few seconds...` }, { quoted: mek });

        try {
            // Using a free public Pollinations AI endpoint (No API key required!)
            // We encode the prompt and add parameters for high quality
            const encodedPrompt = encodeURIComponent(prompt);
            const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&enhance=true&model=flux`;

            // Download the image into a buffer so WhatsApp can send it directly
            const response = await axios.get(imageUrl, {
                responseType: 'arraybuffer',
                timeout: 60000 // 60 seconds timeout because AI generation takes time
            });

            const buffer = Buffer.from(response.data);

            if (!buffer || buffer.length < 1000) {
                throw new Error("Failed to generate image. The prompt might have triggered a safety filter.");
            }

            // Send the generated image
            await conn.sendMessage(chatId, {
                image: buffer,
                caption: `🎨 *AI Image Generated*\n\n📝 *Prompt:* ${prompt}\n\n${settings.footer}`
            }, { quoted: mek });

            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (error) {
            logger.error(`[IMAGINE] Error: ${error.message}`);
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
            await conn.sendMessage(chatId, { 
                text: `❌ Image Generation Failed.\nReason: ${error.message}\n\nIf this happens often, the AI servers might be busy. Try again in a minute.\n\n${settings.footer}` 
            }, { quoted: mek });
        }
    }
};