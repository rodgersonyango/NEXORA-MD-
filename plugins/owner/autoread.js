const fs = require('fs');
const path = require('path');
const settings = require('../../settings');
const logger = require('../../lib/logger');

const CONFIG_PATH = path.join(process.cwd(), 'data', 'autoread.json');

function readConfig() {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        }
    } catch (e) {}
    return { enabled: settings.autoRead === true };
}

function writeConfig(enabled) {
    try {
        const dir = path.dirname(CONFIG_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(CONFIG_PATH, JSON.stringify({ enabled }, null, 2));
    } catch (e) {}
}

module.exports = {
    name: 'autoread',
    aliases: ['readall', 'readmessages'],
    category: 'owner',
    description: 'Automatically mark every incoming message as read',
    usage: '.autoread on|off',
    ownerOnly: true,
    react: '📩',

    async execute(conn, mek, args, chatId, isOwner) {
        try {
            if (!isOwner) {
                await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
                return conn.sendMessage(chatId, {
                    text: `This command is restricted to the Owner only.\n\n${settings.footer}`
                }, { quoted: mek });
            }

            const cfg = readConfig();
            const sub = (args[0] || '').toLowerCase();

            // Show current status
            if (!sub) {
                const status = cfg.enabled ? '✅ *ON*' : '❌ *OFF*';
                return conn.sendMessage(chatId, {
                    text:
                        `📩 *AUTO-READ SETTINGS*\n\n` +
                        `Current Status: ${status}\n\n` +
                        `When ON, every incoming message in groups and DMs is automatically marked as read.\n\n` +
                        `Commands:\n` +
                        `  ${settings.prefix}autoread on   Turn on auto-read\n` +
                        `  ${settings.prefix}autoread off  Turn off auto-read\n\n` +
                        `${settings.footer}`
                }, { quoted: mek });
            }

            // Toggle ON
            if (sub === 'on' || sub === 'enable' || sub === '1' || sub === 'true') {
                writeConfig(true);
                global.autoReadPM = true; // For DMs
                
                await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
                await conn.sendMessage(chatId, {
                    text: `📩 *Auto-Read ENABLED*\n\nEvery incoming message in groups and DMs will now be marked as read instantly.\n\n${settings.footer}`
                }, { quoted: mek });
                return;
            }

            // Toggle OFF
            if (sub === 'off' || sub === 'disable' || sub === '0' || sub === 'false') {
                writeConfig(false);
                global.autoReadPM = false;
                
                await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
                await conn.sendMessage(chatId, {
                    text: `📩 *Auto-Read DISABLED*\n\nMessages will no longer be auto-marked as read.\n\n${settings.footer}`
                }, { quoted: mek });
                return;
            }

            // Unknown option
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
            await conn.sendMessage(chatId, {
                text: `⚠️ *Unknown option:* \`${args[0]}\`\n\nUsage:\n  ${settings.prefix}autoread\n  ${settings.prefix}autoread on\n  ${settings.prefix}autoread off\n\n${settings.footer}`
            }, { quoted: mek });

        } catch (error) {
            logger.error(`[AUTOREAD] Error: ${error.message}`);
            try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
        }
    }
};