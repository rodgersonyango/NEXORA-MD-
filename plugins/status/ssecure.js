const settings = require('../../settings');
const sharp = require('sharp');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'ssecure',
    aliases: ['watermark'],
    category: 'status',
    description: 'Watermark an image before posting to status',
    usage: 'Reply to image with .ssecure',
    react: '🛡️',
    async execute(conn, mek, args, chatId) {
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted || !quoted.imageMessage) return conn.sendMessage(chatId, { text: '❌ Reply to an image.' });
        
        try {
            const stream = await downloadContentFromMessage(quoted.imageMessage, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
            
            const meta = await sharp(buffer).metadata();
            const svg = `<svg width="${meta.width}" height="${meta.height}"><text x="20" y="${meta.height - 20}" fill="rgba(255,255,255,0.5)" font-size="30">© NEXORA MD</text></svg>`;
            
            const secured = await sharp(buffer).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).toBuffer();
            await conn.sendMessage(chatId, { image: secured, caption: `🛡️ Watermarked!` }, { quoted: mek });
        } catch (e) { conn.sendMessage(chatId, { text: '❌ Failed.' }); }
    }
};