const settings = require('../../settings');
const fs = require('fs');
const path = require('path');
const logger = require('../../lib/logger');

const NOTES_DIR = path.join(process.cwd(), 'data', 'notes');

module.exports = {
    name: 'notes',
    aliases: ['mynotes', 'note'],
    category: 'student',
    description: 'Save and retrieve study notes',
    usage: '.notes <save/view/delete> <title> <text>',
    react: '🗒️',

    async execute(conn, mek, args, chatId) {
        const action = (args[0] || '').toLowerCase();
        const title = args[1] || '';
        const content = args.slice(2).join(' ');

        if (!fs.existsSync(NOTES_DIR)) fs.mkdirSync(NOTES_DIR, { recursive: true });

        const senderJid = mek.key.participant || mek.key.remoteJid;
        const userFile = path.join(NOTES_DIR, `${senderJid.split('@')[0]}.json`);

        let userNotes = {};
        if (fs.existsSync(userFile)) {
            userNotes = JSON.parse(fs.readFileSync(userFile, 'utf8'));
        }

        if (action === 'save') {
            if (!title || !content) {
                return conn.sendMessage(chatId, { text: `❌ Usage: ${settings.prefix}notes save <title> <content>` }, { quoted: mek });
            }
            userNotes[title] = content;
            fs.writeFileSync(userFile, JSON.stringify(userNotes, null, 2));
            await conn.sendMessage(chatId, { text: `✅ Note saved under "*${title}*".` }, { quoted: mek });
        }
        else if (action === 'view') {
            if (!title) {
                const list = Object.keys(userNotes);
                if (list.length === 0) return conn.sendMessage(chatId, { text: `🗒️ You have no notes.` }, { quoted: mek });
                return conn.sendMessage(chatId, { text: `🗒️ *Your Notes:*\n\n${list.map(n => `• ${n}`).join('\n')}` }, { quoted: mek });
            }
            if (!userNotes[title]) return conn.sendMessage(chatId, { text: `❌ Note "${title}" not found.` }, { quoted: mek });
            await conn.sendMessage(chatId, { text: `🗒️ *${title}*\n\n${userNotes[title]}` }, { quoted: mek });
        }
        else if (action === 'delete') {
            if (!userNotes[title]) return conn.sendMessage(chatId, { text: `❌ Note not found.` }, { quoted: mek });
            delete userNotes[title];
            fs.writeFileSync(userFile, JSON.stringify(userNotes, null, 2));
            await conn.sendMessage(chatId, { text: `🗑️ Note "${title}" deleted.` }, { quoted: mek });
        }
        else {
            await conn.sendMessage(chatId, { 
                text: `🗒️ *NOTES SYSTEM*\n\n` +
                      `• \`${settings.prefix}notes save <title> <content>\`\n` +
                      `• \`${settings.prefix}notes view\` (list all)\n` +
                      `• \`${settings.prefix}notes view <title>\`\n` +
                      `• \`${settings.prefix}notes delete <title>\`\n\n${settings.footer}` 
            }, { quoted: mek });
        }
    }
};