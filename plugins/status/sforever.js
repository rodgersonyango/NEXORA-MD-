const settings = require('../../settings');
const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const DATA_DIR = path.join(process.cwd(), 'data', 'forever_status');

module.exports = {
    name: 'sforever',
    aliases: ['infinitestatus'],
    category: 'status',
    description: 'Make a status permanent (reposts every 24 hours)',
    usage: 'Reply to a status/media with .sforever',
    ownerOnly: true,
    react: '♾️',
    async execute(conn, mek, args, chatId) {
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted || (!quoted.imageMessage && !quoted.videoMessage)) {
            return conn.sendMessage(chatId, { text: '❌ Reply to an image/video to make it a Forever Status.' });
        }

        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

        const type = quoted.imageMessage ? 'image' : 'video';
        const media = quoted[`${type}Message`];
        const id = Date.now();
        const filePath = path.join(DATA_DIR, `${id}.${type === 'image' ? 'jpg' : 'mp4'}`);
        const metaPath = path.join(DATA_DIR, 'forever_list.json');

        try {
            // 1. Download the media
            const stream = await downloadContentFromMessage(media, type);
            const writeStream = fs.createWriteStream(filePath);
            for await (const chunk of stream) writeStream.write(chunk);
            writeStream.end();

            // 2. Save to database
            let list = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : [];
            list.push({ id, type, path: filePath, caption: media.caption || '' });
            fs.writeFileSync(metaPath, JSON.stringify(list, null, 2));

            // 3. Send confirmation
            await conn.sendMessage(chatId, { 
                text: `♾️ *FOREVER STATUS ENABLED!*\n\nThis media will now automatically repost to your status every 24 hours. Use .sforever off to stop it.\n\n${settings.footer}` 
            }, { quoted: mek });
            
        } catch (e) {
            conn.sendMessage(chatId, { text: '❌ Failed to save forever status.' });
        }
    }
};