const fs = require('fs');
const path = require('path');
const settings = require('../../settings');
const logger = require('../../lib/logger');

const VAULT_DIR = path.join(process.cwd(), 'data', 'vault');
if (!fs.existsSync(VAULT_DIR)) fs.mkdirSync(VAULT_DIR, { recursive: true });

module.exports = {
    name: 'vault',
    aliases: ['savedel', 'deleted'],
    category: 'tools',
    description: 'Automatically save deleted messages in a chat',
    usage: '.vault on/off',
    ownerOnly: true,
    react: '🗄️',

    async execute(conn, mek, args, chatId, isOwner) {
        if (!isOwner) return;

        const action = (args[0] || '').toLowerCase();
        const configPath = path.join(VAULT_DIR, 'config.json');

        let config = {};
        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }

        if (action === 'on') {
            config[chatId] = true;
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            return conn.sendMessage(chatId, { text: `🗄️ *VAULT ENABLED*\n\nAll deleted messages in this chat will be saved automatically.\n\nType .vault show to view them.` }, { quoted: mek });
        }

        if (action === 'off') {
            delete config[chatId];
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            return conn.sendMessage(chatId, { text: `🗄️ *VAULT DISABLED*\n\nDeleted messages will no longer be saved here.` }, { quoted: mek });
        }

        if (action === 'show') {
            const chatVaultPath = path.join(VAULT_DIR, `${chatId.replace(/[^0-9]/g, '')}.json`);
            
            if (!fs.existsSync(chatVaultPath)) {
                return conn.sendMessage(chatId, { text: `🗄️ The vault for this chat is empty.` }, { quoted: mek });
            }

            const vaultData = JSON.parse(fs.readFileSync(chatVaultPath, 'utf8'));
            const keys = Object.keys(vaultData);

            if (keys.length === 0) {
                return conn.sendMessage(chatId, { text: `🗄️ The vault for this chat is empty.` }, { quoted: mek });
            }

            let message = `🗄️ *ANTI-DELETE VAULT*\n\nFound ${keys.length} deleted messages:\n\n`;
            
            // Show the last 10 deleted messages
            keys.slice(-10).forEach((key, index) => {
                const data = vaultData[key];
                message += `*${index + 1}. ${data.senderName}:*\n${data.text}\n\n`;
            });

            return conn.sendMessage(chatId, { text: message }, { quoted: mek });
        }

        return conn.sendMessage(chatId, { 
            text: `🗄️ *VAULT SYSTEM*\n\nCurrent Status: ${config[chatId] ? 'ON' : 'OFF'}\n\nUsage:\n${settings.prefix}vault on\n${settings.prefix}vault off\n${settings.prefix}vault show\n\n${settings.footer}` 
        }, { quoted: mek });
    }
};