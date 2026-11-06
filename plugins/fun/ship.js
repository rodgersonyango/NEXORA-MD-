const axios = require('axios');
const settings = require('../../settings');
const logger = require('../../lib/logger');

module.exports = {
    name: 'ship',
    aliases: ['love', 'shipme'],
    category: 'fun',
    description: 'Calculate the love percentage between two users',
    usage: '.ship @user1 @user2',
    react: '❤️',

    async execute(conn, mek, args, chatId) {
        // 1. Identify the users
        let user1 = mek.key.participant || mek.key.remoteJid;
        let user2 = null;

        const mentioned = mek.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.participant;

        if (mentioned.length >= 2) {
            user1 = mentioned[0];
            user2 = mentioned[1];
        } else if (mentioned.length === 1) {
            user2 = mentioned[0];
        } else if (quoted) {
            user2 = quoted;
        } else {
            return conn.sendMessage(chatId, { 
                text: `❌ Please tag a user or reply to their message to ship them.\n\n*Example:*\n${settings.prefix}ship @user\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        // 2. Clean numbers for display
        const num1 = user1.split('@')[0].split(':')[0];
        const num2 = user2.split('@')[0].split(':')[0];

        if (num1 === num2) {
            return conn.sendMessage(chatId, { text: `❌ You can't ship yourself, that's illegal! 🚔` }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });

        try {
            // 3. Calculate Love Percentage (Deterministic based on numbers so it doesn't change randomly)
            const combined = num1 + num2;
            let hash = 0;
            for (let i = 0; i < combined.length; i++) {
                hash = (hash << 5) - hash + combined.charCodeAt(i);
                hash |= 0; 
            }
            const percentage = Math.abs(hash % 101); // 0 to 100

            // 4. Pick an Image based on the percentage
            let imageUrl = '';
            let message = '';

            if (percentage >= 80) {
                message = `🔥 *MATCH MADE IN HEAVEN!* 🔥\nThey are practically soulmates!`;
                imageUrl = 'https://i.ibb.co/6P9Zk4c/anime-love-1.jpg'; // High love anime
            } else if (percentage >= 50) {
                message = `💖 *There is potential!* 💖\nThey might just work out.`;
                imageUrl = 'https://i.ibb.co/3s6xX9B/anime-love-2.jpg'; // Medium love anime
            } else if (percentage >= 20) {
                message = `🤔 *Friendzone Alert* 🤔\nThere is some tension, but it's complicated.`;
                imageUrl = 'https://i.ibb.co/9qJqZ5Z/anime-friendzone.jpg'; // Friendzone anime
            } else {
                message = `💔 *OUCH!* 💔\nThey are better off as strangers.`;
                imageUrl = 'https://i.ibb.co/8Yj7k5h/anime-broken-heart.jpg'; // Broken heart anime
            }

            const finalText = `❤️ *LOVE CALCULATOR* ❤️\n\n` +
                              `👤 @${num1}\n` +
                              `➕\n` +
                              `👤 @${num2}\n\n` +
                              `━━━━━━━━━━━━━━━\n` +
                              `💘 *Score:* ${percentage}%\n` +
                              `━━━━━━━━━━━━━━━\n\n` +
                              `${message}\n\n` +
                              `${settings.footer}`;

            // 5. Send the message with the image
            try {
                const imageBuffer = await axios.get(imageUrl, { responseType: 'arraybuffer' }).then(res => Buffer.from(res.data));
                await conn.sendMessage(chatId, {
                    image: imageBuffer,
                    caption: finalText,
                    mentions: [user1, user2]
                }, { quoted: mek });
            } catch (imgErr) {
                // If the anime image fails to load, just send text
                await conn.sendMessage(chatId, {
                    text: finalText,
                    mentions: [user1, user2]
                }, { quoted: mek });
            }

            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (error) {
            logger.error(`[SHIP] Error: ${error.message}`);
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
            await conn.sendMessage(chatId, { 
                text: `❌ Love calculator failed. (Error: ${error.message})\n\n${settings.footer}` 
            }, { quoted: mek });
        }
    }
};