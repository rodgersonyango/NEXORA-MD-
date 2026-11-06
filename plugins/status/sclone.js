const settings = require('../../settings');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'sclone',
    aliases: ['repost'],
    category: 'status',
    description: 'Repost someone else\'s status as your own',
    usage: 'Reply to a status with .sclone',
    ownerOnly: true,
    react: '🎭',
    async execute(conn, mek, args, chatId) {
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted || (!quoted.imageMessage && !quoted.videoMessage)) return conn.sendMessage(chatId, { text: '❌ Reply to a status.' });
        
        const type = quoted.imageMessage ? 'image' : 'video';
        const media = quoted[`${type}Message`];
        
        try {
            const stream = await downloadContentFromMessage(media, type);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
            
            const content = { [type]: buffer, caption: quoted[`${type}Message`]?.caption || '' };
            await conn.sendMessage('status@broadcast', content, { statusJidList: [conn.user.id] });
            await conn.sendMessage(chatId, { text: '🎭 Cloned to your status successfully!' }, { quoted: mek });
        } catch (e) { conn.sendMessage(chatId, { text: '❌ Failed to clone.' }); }
    }
};