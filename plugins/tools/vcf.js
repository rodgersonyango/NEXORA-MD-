const settings = require('../../settings');
const logger = require('../../lib/logger');

module.exports = {
    name: 'vcf',
    aliases: ['exportcontacts', 'getcontacts'],
    category: 'tools',
    description: 'Export all group members\' phone numbers to a .vcf file',
    usage: '.vcf',
    groupOnly: true,
    react: '📇',

    async execute(conn, mek, args, chatId) {
        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `📇 *Extracting contacts...*` }, { quoted: mek });

        try {
            // 1. Fetch group metadata
            const groupMetadata = await conn.groupMetadata(chatId);
            const participants = groupMetadata.participants;
            const groupName = groupMetadata.subject || 'Group';

            if (!participants || participants.length === 0) {
                return conn.sendMessage(chatId, { text: `❌ Could not find members in this group.` }, { quoted: mek });
            }

            let vcfContent = '';

            // 2. Loop through members and build the VCF string
            for (const p of participants) {
                const jid = p.id;
                // Skip if not a standard phone number (e.g., skip LIDs or bots)
                if (!jid.includes('@s.whatsapp.net')) continue;

                const number = jid.split('@')[0];
                let name = p.name || p.notify || p.verifiedName || `Contact_${number}`;

                // Clean up the name (remove emojis/special chars for VCF compatibility)
                name = name.replace(/[^\w\s]/gi, '');

                vcfContent += `BEGIN:VCARD\n`;
                vcfContent += `VERSION:3.0\n`;
                vcfContent += `FN:${name}\n`;
                vcfContent += `TEL;type=CELL;type=VOICE;waid=${number}:+${number}\n`;
                vcfContent += `END:VCARD\n`;
            }

            if (vcfContent.length === 0) {
                return conn.sendMessage(chatId, { text: `❌ No valid phone numbers found in this group.` }, { quoted: mek });
            }

            // 3. Convert string to Buffer
            const vcfBuffer = Buffer.from(vcfContent, 'utf-8');

            // 4. Send as a document
            await conn.sendMessage(chatId, {
                document: vcfBuffer,
                fileName: `${groupName}_Contacts.vcf`,
                mimetype: 'text/vcard',
                caption: `✅ *Contacts Exported!*\n\nGroup: ${groupName}\nTotal Contacts: ${participants.length}\n\n_Open this file to save all numbers to your phonebook instantly._\n\n${settings.footer}`
            }, { quoted: mek });

            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (error) {
            logger.error(`[VCF] Error: ${error.message}`);
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
            await conn.sendMessage(chatId, { 
                text: `❌ Failed to export contacts: ${error.message}\n\n${settings.footer}` 
            }, { quoted: mek });
        }
    }
};