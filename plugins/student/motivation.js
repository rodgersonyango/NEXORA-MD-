const settings = require('../../settings');
const quotes = require('./quotes');

module.exports = {
    name: 'motivation',
    aliases: ['motivate', 'quote', 'inspire', 'studyquote'],
    category: 'student',
    description: 'Get a random motivational quote for studying',
    usage: '.motivation',
    react: '🔥',

    async execute(conn, mek, args, chatId) {
        // Pick a random quote from the database
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

        const message = 
            `🔥 *DAILY MOTIVATION* 🔥\n\n` +
            `"${randomQuote.text}"\n\n` +
            `— *${randomQuote.author}*\n\n` +
            `_Keep pushing! You are doing great._\n\n` +
            `${settings.footer}`;

        await conn.sendMessage(chatId, { text: message }, { quoted: mek });
        await conn.sendMessage(chatId, { react: { text: '💪', key: mek.key } });
    }
};