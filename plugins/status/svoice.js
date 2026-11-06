const settings = require('../../settings');
const axios = require('axios');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'svoice',
    aliases: ['statusvoice'],
    category: 'status',
    description: 'Add AI voiceover to an image before posting status',
    usage: 'Reply to image with .svoice <text>',
    react: '🗣️',
    async execute(conn, mek, args, chatId) {
        const text = args.join(' ');
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!text || !quoted || !quoted.imageMessage) return conn.sendMessage(chatId, { text: '❌ Reply to an image with text.' });
        
        try {
            const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=en&client=tw-ob`;
            const res = await axios.get(url, { responseType: 'arraybuffer' });
            await conn.sendMessage(chatId, { audio: Buffer.from(res.data), mimetype: 'audio/mp4', ptt: true }, { quoted: mek });
            await conn.sendMessage(chatId, { text: '🗣️ Voiceover generated! (Post image + this audio to status)' });
        } catch (e) { conn.sendMessage(chatId, { text: '❌ Failed.' }); }
    }
};