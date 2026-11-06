const settings = require('../../settings');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'sdl',
    aliases: ['statusdl'],
    category: 'status',
    description: 'Download a status',
    usage: 'Reply to a status with .sdl',
    react: '📥',
    async execute(conn, mek, args, chatId) {
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted || !quoted.imageMessage && !quoted.videoMessage) return conn.sendMessage(chatId, { text: '❌ Reply to a status.' }, { quoted: mek });
        
        const type = quoted.imageMessage ? 'image' : 'video';
        const media = quoted[`${type}Message`];
        
        try {
            const stream = await downloadContentFromMessage(media, type);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
            await conn.sendMessage(chatId, { [type]: buffer, caption: `✅ Downloaded Status\n\n${settings.footer}` }, { quoted: mek });
        } catch (e) { conn.sendMessage(chatId, { text: '❌ Failed to download.' }); }
    }
};