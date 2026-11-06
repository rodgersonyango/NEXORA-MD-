const settings = require('../../settings');
const axios = require('axios');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'stranslate',
    aliases: ['translatestatus'],
    category: 'status',
    description: 'Translate a text status',
    usage: 'Reply to a status with .stranslate',
    react: '🧠',
    async execute(conn, mek, args, chatId) {
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const text = quoted?.conversation || quoted?.extendedTextMessage?.text;
        
        if (!text) return conn.sendMessage(chatId, { text: '❌ Reply to a text status.' }, { quoted: mek });
        
        try {
            const res = await axios.get(`https://api.nexoracle.com/ai/translate?text=${encodeURIComponent(text)}&lang=en`);
            await conn.sendMessage(chatId, { text: `🧠 *Original:* ${text}\n\n🌐 *Translated:* ${res.data.result}\n\n${settings.footer}` }, { quoted: mek });
        } catch (e) { conn.sendMessage(chatId, { text: '❌ Translation failed.' }); }
    }
};