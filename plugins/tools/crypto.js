const settings = require('../../settings');
const axios = require('axios');
const logger = require('../../lib/logger');

module.exports = {
    name: 'crypto',
    aliases: ['coin', 'price'],
    category: 'tools',
    description: 'Get real-time cryptocurrency price',
    usage: '.crypto <symbol>',
    react: '🪙',

    async execute(conn, mek, args, chatId) {
        const symbol = args[0]?.toLowerCase() || 'bitcoin';
        
        if (!symbol) {
            return conn.sendMessage(chatId, { 
                text: `❌ Provide a coin name.\nExample: ${settings.prefix}crypto bitcoin\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `🪙 *Fetching ${symbol.toUpperCase()} price...*` }, { quoted: mek });

        try {
            // 1. Call CoinGecko API
            const res = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(symbol)}&vs_currencies=usd,eur&include_24hr_change=true`, { timeout: 15000 });
            const data = res.data[symbol];

            // 2. If coin not found
            if (!data) {
                return conn.sendMessage(chatId, { 
                    text: `❌ *Coin Not Found*\n\nCould not find data for "${symbol}".\n\nTry full names like: *bitcoin, ethereum, solana, dogecoin, ripple, cardano*.` 
                }, { quoted: mek });
            }

            // 3. Format the 24h change with color indication
            const change = data.usd_24h_change || 0;
            const changeEmoji = change >= 0 ? '🟢📈' : '🔴📉';
            const changeStr = change >= 0 ? `+${change.toFixed(2)}%` : `${change.toFixed(2)}%`;

            // 4. Build the message
            const caption = 
                `🪙 *CRYPTO PRICE INFO*\n\n` +
                `📛 *Coin:* ${symbol.toUpperCase()}\n\n` +
                `💵 *USD:* $${data.usd.toLocaleString()}\n` +
                `💶 *EUR:* €${data.eur.toLocaleString()}\n\n` +
                `${changeEmoji} *24h Change:* ${changeStr}\n\n` +
                `${settings.footer}`;

            await conn.sendMessage(chatId, { text: caption }, { quoted: mek });
            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (error) {
            logger.error(`[CRYPTO] Error: ${error.message}`);
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
            await conn.sendMessage(chatId, { 
                text: `❌ *Failed to fetch crypto price.*\n\nReason: ${error.message}\n\n${settings.footer}` 
            }, { quoted: mek });
        }
    }
};