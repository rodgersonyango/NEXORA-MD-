const settings = require('../../settings');
const sharp = require('sharp');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'senhance',
    aliases: ['upscale'],
    category: 'status',
    description: 'Enhance a blurry image status',
    usage: 'Reply to an image with .senhance',
    react: '🎨',
    async execute(conn, mek, args, chatId) {
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted || !quoted.imageMessage) return conn.sendMessage(chatId, { text: '❌ Reply to an image.' });
        
        try {
            const stream = await downloadContentFromMessage(quoted.imageMessage, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
            
            const enhanced = await sharp(buffer).sharpen().modulate({ brightness: 1.1, saturation: 1.2 }).toBuffer();
            await conn.sendMessage(chatId, { image: enhanced, caption: `🎨 Enhanced!` }, { quoted: mek });
        } catch (e) { conn.sendMessage(chatId, { text: '❌ Enhance failed.' }); }
    }
};