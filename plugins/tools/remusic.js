const settings = require('../../settings');
const axios = require('axios');
const logger = require('../../lib/logger');

module.exports = {
    name: 'remusic',
    aliases: ['aicover', 'songcover'],
    category: 'ai',
    description: 'Generate an AI cover of a song',
    usage: '.remusic <artist> | <song_url>',
    react: '🎵',

    async execute(conn, mek, args, chatId) {
        const input = args.join(' ');
        if (!input || !input.includes('|')) {
            return conn.sendMessage(chatId, { 
                text: `❌ Usage: ${settings.prefix}remusic <artist> | <song_url>\n\n*Available artists:* kanye-west, drake, taylor-swift, the-weeknd, rihanna, etc.\n\nExample: ${settings.prefix}remusic kanye-west | https://files.catbox.moe/ahewly.mp3\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        const [artist, songUrl] = input.split('|').map(s => s.trim());
        if (!songUrl.startsWith('http')) throw new Error("Invalid song URL.");

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `🎵 *Generating AI cover with ${artist}...*\n\n_This may take 30-60 seconds._` }, { quoted: mek });

        try {
            const res = await axios.get(`https://api.omegatech.app/api/ai/Remusic-cover?action=cover&songUrl=${encodeURIComponent(songUrl)}&model=${encodeURIComponent(artist)}&outputFormat=mp3&pitchChange=no-change&modelType=0`, { timeout: 120000 });

            if (!res.data?.success || !res.data?.data?.urls?.audio) {
                throw new Error("AI cover generation failed.");
            }

            const coverUrl = res.data.data.urls.audio;
            const modelName = res.data.data.model.name || artist;

            // Download the audio and send
            const audioRes = await axios.get(coverUrl, { responseType: 'arraybuffer', timeout: 60000 });
            const buffer = Buffer.from(audioRes.data);

            await conn.sendMessage(chatId, {
                audio: buffer,
                mimetype: 'audio/mpeg',
                ptt: false,
                fileName: `${modelName}_cover_${Date.now()}.mp3`,
                caption: `🎵 *AI COVER GENERATED*\n\n🎤 *Artist:* ${modelName}\n📦 *Size:* ${(buffer.length / 1024).toFixed(1)} KB\n\n${settings.footer}`
            }, { quoted: mek });

            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (e) {
            logger.error(`[REMUSIC] ${e.message}`);
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
            await conn.sendMessage(chatId, { text: `❌ Failed: ${e.message}` }, { quoted: mek });
        }
    }
};