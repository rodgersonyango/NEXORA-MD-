const settings = require('../../settings');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'sviewers',
    aliases: ['statusstats'],
    category: 'status',
    description: 'Get analytics of who viewed your status',
    usage: '.sviewers',
    ownerOnly: true,
    react: '📊',
    async execute(conn, mek, args, chatId) {
        const DATA_PATH = path.join(process.cwd(), 'data', 'status_analytics.json');
        if (!fs.existsSync(DATA_PATH)) return conn.sendMessage(chatId, { text: '📊 No analytics data yet.' });
        
        const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
        const total = data.views?.length || 0;
        const unique = new Set(data.views || []).size;
        
        await conn.sendMessage(chatId, { text: `📊 *STATUS ANALYTICS*\n\nTotal Views: ${total}\nUnique Viewers: ${unique}\n\n${settings.footer}` }, { quoted: mek });
    }
};