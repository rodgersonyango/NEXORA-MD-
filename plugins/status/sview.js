const settings = require('../../settings');
const logger = require('../../lib/logger');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'sview',
    aliases: ['stealthview'],
    category: 'status',
    description: 'View a status stealthy and archive it',
    usage: 'Reply to a status with .sview',
    react: '🕵️‍♂️',
    async execute(conn, mek, args, chatId) {
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted || !quoted.imageMessage && !quoted.videoMessage) return conn.sendMessage(chatId, { text: '❌ Reply to an Image/Video status.' }, { quoted: mek });
        
        const type = quoted.imageMessage ? 'image' : 'video';
        const media = quoted[`${type}Message`];
        
        try {
            const stream = await downloadContentFromMessage(media, type);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
            
            const ownerNum = require('../../lib/owner').getPairedNumber();
            const ownerJid = ownerNum + '@s.whatsapp.net';
            
            await conn.sendMessage(ownerJid, { [type]: buffer, caption: `🕵️‍♂️ *Archived Status*\nFrom: @${mek.key.participant.split('@')[0]}\n\n${settings.footer}` });
            await conn.sendMessage(chatId, { text: '✅ Sent to your DM silently.' }, { quoted: mek });
        } catch (e) { conn.sendMessage(chatId, { text: '❌ Failed to archive.' }); }
    }
};