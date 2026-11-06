const settings = require('../../settings');
const fs = require('fs');
const path = require('path');
const DATA_PATH = path.join(process.cwd(), 'data', 'sniper.json');

module.exports = {
    name: 'ssnipe',
    aliases: ['snipestatus'],
    category: 'status',
    description: 'Track a user and alert when they post a status',
    usage: '.ssnipe <number>',
    ownerOnly: true,
    react: '🎯',
    async execute(conn, mek, args, chatId) {
        const num = (args[0] || '').replace(/[^0-9]/g, '');
        if (!num) return conn.sendMessage(chatId, { text: '❌ Provide a number.' });
        
        let data = fs.existsSync(DATA_PATH) ? JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')) : [];
        if (!data.includes(num)) {
            data.push(num);
            fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
        }
        await conn.sendMessage(chatId, { text: `🎯 Target +${num} added to Status Sniper. I will DM you the moment they post.` }, { quoted: mek });
    }
};