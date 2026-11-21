const settings = require('../../settings');
const axios = require('axios');
const logger = require('../../lib/logger');

module.exports = {
    name: 'nanobanana',
    aliases: ['imagine', 'nb', 'flux'],
    category: 'ai',
    description: 'Generate AI images from text',
    usage: '.imagine <prompt>',
    react: '🎨',

    async execute(conn, mek, args, chatId) {
        const prompt = args.join(' ');
        if (!prompt) {
            return conn.sendMessage(chatId, { 
                text: `❌ Provide a prompt.\nExample: ${settings.prefix}imagine A cow in the city\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `🎨 *Generating image...*\n\n📝 _${prompt}_` }, { quoted: mek });

        try {
            const res = await axios.get(`https://api.omegatech.app/api/ai/notgept-Nano-banana?action=generate&prompt=${encodeURIComponent(prompt)}`, { timeout: 60000 });

            if (!res.data?.success || !res.data?.data?.image) {
                throw new Error("No image returned from API.");
            }

            const imageUrl = res.data.data.image;

            await conn.sendMessage(chatId, {
                image: { url: imageUrl },
                caption: `🎨 *AI IMAGE GENERATED*\n\n📝 *Prompt:* ${prompt}\n\n${settings.footer}`
            }, { quoted: mek });

            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (e) {
            logger.error(`[NANO] ${e.message}`);
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
            await conn.sendMessage(chatId, { text: `❌ Failed: ${e.message}` }, { quoted: mek });
        }
    }
};