const fs = require('fs');
const path = require('path');
const settings = require('../../settings');
const owner = require('../../lib/owner');

const SUDO_FILE = path.join(process.cwd(), 'data', 'sudo_users.json');

function getSudo() {
    try {
        if (fs.existsSync(SUDO_FILE)) return JSON.parse(fs.readFileSync(SUDO_FILE, 'utf8'));
    } catch (e) {}
    return [];
}

function saveSudo(data) {
    try {
        fs.writeFileSync(SUDO_FILE, JSON.stringify(data, null, 2));
    } catch (e) {}
}

module.exports = {
    name: 'sudo',
    aliases: ['addsudo', 'setsudo'],
    category: 'owner',
    description: 'Add or remove a sudo user',
    usage: '.sudo add <number> | .sudo list | .sudo remove <number>',
    ownerOnly: true,
    react: '👑',

    async execute(conn, mek, args, chatId, isOwner) {
        if (!isOwner) return;

        const action = (args[0] || '').toLowerCase();
        const number = (args[1] || '').replace(/[^0-9]/g, '');
        let sudoList = getSudo();

        if (action === 'add') {
            if (!number || number.length < 10) {
                return conn.sendMessage(chatId, { text: `❌ Provide a valid number. Example: ${settings.prefix}sudo add 254712345678` }, { quoted: mek });
            }
            if (!sudoList.includes(number)) {
                sudoList.push(number);
                saveSudo(sudoList);
                await conn.sendMessage(chatId, { text: `👑 *SUDO ADDED*\n\n+${number} is now a Sudo User.\nThey can use Owner commands in DMs.` }, { quoted: mek });
            } else {
                await conn.sendMessage(chatId, { text: `⚠️ That number is already a Sudo User.` }, { quoted: mek });
            }
        } 
        else if (action === 'remove' || action === 'del') {
            if (sudoList.includes(number)) {
                sudoList = sudoList.filter(n => n !== number);
                saveSudo(sudoList);
                await conn.sendMessage(chatId, { text: `🗑️ *SUDO REMOVED*\n\n+${number} is no longer a Sudo User.` }, { quoted: mek });
            } else {
                await conn.sendMessage(chatId, { text: `❌ That number is not a Sudo User.` }, { quoted: mek });
            }
        } 
        else if (action === 'list') {
            if (sudoList.length === 0) {
                return conn.sendMessage(chatId, { text: `👑 *SUDO LIST*\n\nNo Sudo users added yet.` }, { quoted: mek });
            }
            let text = `👑 *SUDO LIST*\n\n`;
            sudoList.forEach((num, i) => {
                text += `${i + 1}. +${num}\n`;
            });
            await conn.sendMessage(chatId, { text }, { quoted: mek });
        } 
        else {
            await conn.sendMessage(chatId, { text: `👑 *SUDO SYSTEM*\n\nUsage:\n${settings.prefix}sudo add <number>\n${settings.prefix}sudo remove <number>\n${settings.prefix}sudo list` }, { quoted: mek });
        }
    }
};