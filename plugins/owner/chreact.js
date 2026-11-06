const settings = require('../../settings');

module.exports = {
    name: 'chreact',
    aliases: ['ch', 'bomb'],
    category: 'owner',
    description: 'Send multiple reactions to a channel message',
    usage: '.chreact <link> <emoji> <count>',
    ownerOnly: true,
    react: '🚀',

    async execute(conn, mek, args, chatId, isOwner) {
        if (!isOwner) {
            return conn.sendMessage(chatId, { text: '❌ This power is for the Owner only.' }, { quoted: mek });
        }

        if (args.length < 3) {
            return conn.sendMessage(chatId, { 
                text: `*Missing Information!*\n\n*Format:* ${settings.prefix}ch <link> <emoji> <count>\n*Example:* ${settings.prefix}ch https://whatsapp.com/channel/xxx/123 🔥 50\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        const link = args[0];
        const emoji = args[1];
        const count = parseInt(args[2]);

        // Validations
        if (!link.includes("whatsapp.com/channel/")) {
            return conn.sendMessage(chatId, { text: "❌ That doesn't look like a valid WhatsApp Channel link." }, { quoted: mek });
        }
        if (isNaN(count) || count <= 0) {
            return conn.sendMessage(chatId, { text: "❌ Please provide a valid number (e.g., 50)." }, { quoted: mek });
        }
        // 🛑 LOWERED TO 100 FOR SAFETY
        if (count > 100) {
            return conn.sendMessage(chatId, { text: "⚠️ Safety limit reached. Please keep it under 100 to avoid account bans." }, { quoted: mek });
        }

        // Extract IDs
        const linkParts = link.split('/');
        // Example: https://whatsapp.com/channel/0029Vaj.../123
        const channelId = linkParts[4];
        const messageId = linkParts[5];

        if (!channelId || !messageId) {
            return conn.sendMessage(chatId, { text: "❌ Link error: Could not find the Channel or Message ID. Make sure it's a valid message link." }, { quoted: mek });
        }

        try {
            // Get Channel Metadata
            const channelMeta = await conn.newsletterMetadata("invite", channelId).catch(() => null);
            if (!channelMeta) {
                return conn.sendMessage(chatId, { text: "❌ Failed to fetch channel info. Make sure the bot is a follower of this channel." }, { quoted: mek });
            }

            await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
            await conn.sendMessage(chatId, { 
                text: `🚀 *Starting Reaction Bomb...*\n\nTarget: ${channelMeta.name || 'Unknown Channel'}\nEmoji: ${emoji}\nAmount: ${count}\n\n_Please wait..._` 
            }, { quoted: mek });

            // Execution Loop
            let successCount = 0;
            for (let i = 1; i <= count; i++) {
                try {
                    await conn.newsletterReactMessage(channelMeta.id, messageId, emoji);
                    successCount++;
                } catch (e) {
                    console.log(`[CHREACT] Failed reaction ${i}: ${e.message}`);
                }
                // 500ms delay is much safer than 300ms
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
            return conn.sendMessage(chatId, { 
                text: `✅ *Finished!*\nSent ${successCount} out of ${count} "${emoji}" reactions.` 
            }, { quoted: mek });

        } catch (error) {
            console.log('[CHREACT] Error:', error.message);
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
            return conn.sendMessage(chatId, { 
                text: `❎ *System Error:* ${error.message || "Operation failed."}` 
            }, { quoted: mek });
        }
    }
};