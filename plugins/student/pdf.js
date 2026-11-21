const settings = require('../../settings');
const axios = require('axios');
const logger = require('../../lib/logger');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const pdfParse = require('pdf-parse'); // You need to npm install pdf-parse

module.exports = {
    name: 'pdf',
    aliases: ['readpdf', 'summarize'],
    category: 'student',
    description: 'Extract text from a PDF and summarize it',
    usage: '.pdf (Reply to a PDF file)',
    react: '📄',

    async execute(conn, mek, args, chatId) {
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        if (!quoted || !quoted.documentMessage) {
            return conn.sendMessage(chatId, { 
                text: `❌ Reply to a *PDF document* to read it.\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        if (!quoted.documentMessage.fileName?.toLowerCase().endsWith('.pdf')) {
            return conn.sendMessage(chatId, { text: `❌ That is not a PDF file.` }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `📄 *Extracting text from PDF...*` }, { quoted: mek });

        try {
            // 1. Download the PDF
            const buffer = await downloadMediaMessage(
                { message: quoted, key: mek.key },
                'buffer',
                {},
                { logger: console, reuploadRequest: conn.updateMediaMessage }
            );

            // 2. Extract text using pdf-parse
            const pdfData = await pdfParse(buffer);
            const text = pdfData.text.slice(0, 3000); // Limit to 3000 chars for AI

            if (!text || text.trim().length < 50) {
                return conn.sendMessage(chatId, { text: `❌ Could not extract readable text from this PDF (it might be scanned).` }, { quoted: mek });
            }

            // 3. Ask AI to summarize
            await conn.sendMessage(chatId, { text: `🤖 *Summarizing document...*` }, { quoted: mek });
            
            const res = await axios.post('https://text.pollinations.ai/openai', {
                model: 'openai',
                messages: [
                    { role: 'system', content: 'Summarize the following document in 5 concise bullet points.' },
                    { role: 'user', content: text }
                ]
            }, { timeout: 30000 });

            const summary = res.data?.choices?.[0]?.message?.content || "Failed to summarize.";

            await conn.sendMessage(chatId, { 
                text: `📄 *PDF SUMMARY*\n\n📝 *File:* ${quoted.documentMessage.fileName}\n📊 *Pages:* ${pdfData.numpages}\n\n${summary}\n\n${settings.footer}` 
            }, { quoted: mek });
            
            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (e) {
            logger.error(`[PDF] ${e.message}`);
            await conn.sendMessage(chatId, { text: `❌ Failed to process PDF. Make sure you have 'pdf-parse' installed.` }, { quoted: mek });
        }
    }
};