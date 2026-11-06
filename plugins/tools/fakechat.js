const axios = require('axios');
const settings = require('../../settings');
const logger = require('../../lib/logger');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'fakechat',
    aliases: ['fc', 'fchat'],
    category: 'tools',
    description: 'Generate a fake WhatsApp chat screenshot',
    usage: '.fakechat name1 | text1 | name2 | text2',
    react: '📱',

    async execute(conn, mek, args, chatId) {
        const input = args.join(' ');

        if (!input || !input.includes('|')) {
            return conn.sendMessage(chatId, { 
                text: `❌ *Format Error!*\n\nYou must separate the messages with a pipe symbol ( | ).\n\n*Example:*\n${settings.prefix}fc Me | I miss you | Her | Leave me alone\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        // Split the input by the pipe symbol
        const parts = input.split('|').map(p => p.trim());
        
        if (parts.length < 2) {
            return conn.sendMessage(chatId, { text: `❌ You need at least one message.\nExample: ${settings.prefix}fc Me | Hello` }, { quoted: mek });
        }

        // Build the messages array for the API
        // Alternates between User 1 and User 2
        const messages = [];
        let isUser1 = true;

        for (let i = 0; i < parts.length; i += 2) {
            const name = parts[i] || 'User';
            const text = parts[i + 1] || '...';
            
            messages.push({
                name: name,
                message: text,
                isUser: isUser1
            });
            isUser1 = !isUser1; // Alternate user side
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `📱 *Generating Fake Chat...*` }, { quoted: mek });

        try {
            // Use Popcat API to render the fake chat
            // We use POST to send the complex JSON data
            const response = await axios.post('https://api.popcat.xyz/v2/fakechat', {
                messages: messages
            }, {
                responseType: 'arraybuffer',
                timeout: 30000
            });

            const buffer = Buffer.from(response.data);

            if (buffer.length < 1000) {
                throw new Error("Failed to generate image. The API might be down.");
            }

            await conn.sendMessage(chatId, {
                image: buffer,
                caption: `✅ *Fake Chat Generated!*\n\n_Save this image and send it to your friends to prank them. 😈_\n\n${settings.footer}`
            }, { quoted: mek });

            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (error) {
            logger.error(`[FAKECHAT] Error: ${error.message}`);
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
            await conn.sendMessage(chatId, { 
                text: `❌ Failed to generate chat.\nReason: ${error.message}\n\n${settings.footer}` 
            }, { quoted: mek });
        }
    }
};