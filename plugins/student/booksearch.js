const settings = require('../../settings');
const axios = require('axios');
const logger = require('../../lib/logger');

module.exports = {
    name: 'booksearch',
    aliases: ['book', 'library'],
    category: 'student',
    description: 'Search for books and get read/download links',
    usage: '.booksearch <title or author>',
    react: '📚',

    async execute(conn, mek, args, chatId) {
        const query = args.join(' ');
        if (!query) {
            return conn.sendMessage(chatId, { 
                text: `❌ Provide a book title or author.\nExample: ${settings.prefix}booksearch Clean Code\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `📚 *Searching Open Library for "${query}"...*` }, { quoted: mek });

        try {
            // Search Open Library
            const res = await axios.get(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=5`, { timeout: 15000 });
            const docs = res.data?.docs || [];

            if (docs.length === 0) {
                return conn.sendMessage(chatId, { text: `❌ No books found for "${query}".` }, { quoted: mek });
            }

            let reply = `📚 *BOOK SEARCH: "${query}"*\n\n`;
            
            docs.forEach((book, i) => {
                const title = book.title || 'Unknown Title';
                const author = book.author_name ? book.author_name.join(', ') : 'Unknown Author';
                const year = book.first_publish_year || 'N/A';
                const key = book.key; // e.g., /works/OL123W
                const link = `https://openlibrary.org${key}`;
                
                reply += `*${i + 1}. ${title}*\n`;
                reply += `👤 Author: ${author}\n`;
                reply += `📅 Year: ${year}\n`;
                reply += `🔗 Link: ${link}\n\n`;
            });

            reply += `👉 *Tip:* Tap the link to read the book on Open Library. If it's public domain, you can download the PDF from there.\n\n${settings.footer}`;

            await conn.sendMessage(chatId, { text: reply }, { quoted: mek });
            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (e) {
            logger.error(`[BOOKSEARCH] ${e.message}`);
            await conn.sendMessage(chatId, { text: `❌ Failed to search books.` }, { quoted: mek });
        }
    }
};