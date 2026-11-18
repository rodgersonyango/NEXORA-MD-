const settings = require('../../settings');
const fs = require('fs');
const path = require('path');
const logger = require('../../lib/logger');

const AGENT_FILE = path.join(process.cwd(), 'data', 'active_agents.json');
if (!fs.existsSync(AGENT_FILE)) fs.writeFileSync(AGENT_FILE, JSON.stringify({}));

module.exports = {
    name: 'agent',
    aliases: ['aiagent', 'proxy'],
    category: 'owner',
    description: 'Start or stop an AI agent conversation',
    usage: '.agent <start/stop> <number>',
    ownerOnly: true,
    react: '🤖',

    async execute(conn, mek, args, chatId) {
        const action = (args[0] || '').toLowerCase();
        const targetNum = (args[1] || '').replace(/[^0-9]/g, '');

        if (!action || !targetNum) {
            return conn.sendMessage(chatId, { 
                text: `❌ Usage:\n${settings.prefix}agent start 254712345678\n${settings.prefix}agent stop 254712345678\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        const targetJid = targetNum + '@s.whatsapp.net';
        let agents = JSON.parse(fs.readFileSync(AGENT_FILE, 'utf8'));

        if (action === 'start') {
            if (agents[targetNum]) {
                return conn.sendMessage(chatId, { text: `⚠️ Agent is already active for +${targetNum}` });
            }

            agents[targetNum] = { active: true, startedAt: new Date().toISOString() };
            fs.writeFileSync(AGENT_FILE, JSON.stringify(agents, null, 2));

            // 🔥 THE FIX: Use rawSend to bypass the channel "Forwarded" wrapper
            const rawSend = global.rawSendMessage || conn.sendMessage.bind(conn);
            await rawSend(targetJid, { text: "Hi, how are you?" });
            
            await conn.sendMessage(chatId, { 
                text: `✅ *AI Agent Started!*\n\nTarget: +${targetNum}\nThe bot will now reply to their messages using AI.\n\nType ${settings.prefix}agent stop ${targetNum} to stop.` 
            });
        } 
        
        else if (action === 'stop') {
            if (!agents[targetNum]) {
                return conn.sendMessage(chatId, { text: `⚠️ No active agent for +${targetNum}` });
            }

            delete agents[targetNum];
            fs.writeFileSync(AGENT_FILE, JSON.stringify(agents, null, 2));

            const rawSend = global.rawSendMessage || conn.sendMessage.bind(conn);
            await rawSend(targetJid, { text: "Goodbye! 👋" });
            
            await conn.sendMessage(chatId, { text: `🛑 *AI Agent Stopped* for +${targetNum}` });
        } 
        
        else {
            await conn.sendMessage(chatId, { text: `❌ Invalid action. Use 'start' or 'stop'.` });
        }
    }
};