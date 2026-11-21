const settings = require('../../settings');
const axios = require('axios');
const logger = require('../../lib/logger');

module.exports = {
    name: 'periodic',
    aliases: ['element', 'atom'],
    category: 'student',
    description: 'Get information about any chemical element',
    usage: '.periodic <element>',
    react: '⚛️',

    async execute(conn, mek, args, chatId) {
        const element = args[0]?.toLowerCase();
        if (!element) {
            return conn.sendMessage(chatId, { 
                text: `❌ Provide an element name or symbol.\nExample: ${settings.prefix}periodic gold\n${settings.prefix}periodic Fe\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `⚛️ *Fetching periodic table data...*` }, { quoted: mek });

        try {
            const res = await axios.get(`https://periodic-table-api.vercel.app/api/element/${encodeURIComponent(element)}`, { timeout: 15000 });
            const data = res.data;

            if (!data || !data.symbol) throw new Error("Element not found");

            const caption = 
                `⚛️ *ELEMENT: ${data.name.toUpperCase()}* (${data.symbol})\n\n` +
                `🔢 *Atomic Number:* ${data.atomicNumber}\n` +
                `⚖️ *Atomic Mass:* ${data.atomicMass} u\n` +
                `📦 *Category:* ${data.category || 'N/A'}\n` +
                `🌡️ *State:* ${data.state || 'N/A'}\n` +
                `🔌 *Electronegativity:* ${data.electronegativity || 'N/A'}\n` +
                `⚡ *Electron Config:* ${data.electronConfiguration || 'N/A'}\n\n` +
                `${settings.footer}`;

            await conn.sendMessage(chatId, { text: caption }, { quoted: mek });
            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (e) {
            logger.error(`[PERIODIC] ${e.message}`);
            // Fallback to AI if the API fails
            try {
                const aiRes = await axios.post('https://text.pollinations.ai/openai', {
                    model: 'openai',
                    messages: [
                        { role: 'system', content: 'You are a chemistry expert. Reply with the atomic number, mass, symbol, and a brief description of the element. Keep it short.' },
                        { role: 'user', content: `Element: ${element}` }
                    ]
                }, { timeout: 20000 });
                const reply = aiRes.data?.choices?.[0]?.message?.content || "Could not find data.";
                await conn.sendMessage(chatId, { text: `⚛️ *ELEMENT INFO*\n\n${reply}\n\n${settings.footer}` }, { quoted: mek });
            } catch (err) {
                await conn.sendMessage(chatId, { text: `❌ Failed to fetch element data.` }, { quoted: mek });
            }
        }
    }
};