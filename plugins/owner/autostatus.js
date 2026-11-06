const fs = require('fs');
const path = require('path');
const settings = require('../../settings');
const logger = require('../../lib/logger');

module.exports = {
    name: 'autostatus',
    aliases: ['statusauto', 'reactstatus'],
    category: 'owner',
    description: 'Enable or disable Auto-View and Auto-React for statuses',
    usage: '.autostatus on/off',
    ownerOnly: true,
    react: '👁️',

    async execute(conn, mek, args, chatId, isOwner) {
        if (!isOwner) return;

        const action = (args[0] || '').toLowerCase();
        const DATA_PATH = path.join(process.cwd(), 'data', 'status.json');

        // Default emojis if none exist
        const defaultEmojis = ['🔥', '❤️', '😍', '👑', '✨', '🌟', '💯', '🎉', '💪', '👏'];

        if (action === 'on') {
            const config = {
                view: true,
                react: true,
                emojis: defaultEmojis
            };

            try {
                fs.writeFileSync(DATA_PATH, JSON.stringify(config, null, 2));
                
                // Force update the global variable instantly
                global.autoStatusFlags = { seen: true, react: true };

                await conn.sendMessage(chatId, { 
                    text: `✅ *AUTO-STATUS ENABLED!*\n\n👁️ Auto-View: ON\n🔥 Auto-React: ON\n\n_The bot will now view every status and react with a random emoji instantly._\n\n${settings.footer}` 
                }, { quoted: mek });
            } catch (e) {
                await conn.sendMessage(chatId, { text: `❌ Failed to write file: ${e.message}` }, { quoted: mek });
            }
        } 
        
        else if (action === 'off') {
            const config = {
                view: false,
                react: false,
                emojis: defaultEmojis
            };

            try {
                fs.writeFileSync(DATA_PATH, JSON.stringify(config, null, 2));
                
                // Force update the global variable instantly
                global.autoStatusFlags = { seen: false, react: false };

                await conn.sendMessage(chatId, { 
                    text: `❌ *AUTO-STATUS DISABLED!*\n\nThe bot will no longer view or react to statuses.` 
                }, { quoted: mek });
            } catch (e) {
                await conn.sendMessage(chatId, { text: `❌ Failed to write file: ${e.message}` }, { quoted: mek });
            }
        } 
        
        else {
            // Show current status
            let current = "OFF";
            if (fs.existsSync(DATA_PATH)) {
                try {
                    const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
                    current = (data.view && data.react) ? "ON" : "OFF";
                } catch (e) {}
            }

            await conn.sendMessage(chatId, { 
                text: `👁️ *AUTO-STATUS SETTINGS*\n\nCurrent Status: *${current}*\n\nUse:\n${settings.prefix}autostatus on\n${settings.prefix}autostatus off\n\n${settings.footer}` 
            }, { quoted: mek });
        }
    }
};