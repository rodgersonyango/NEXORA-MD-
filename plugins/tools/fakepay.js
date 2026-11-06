const sharp = require('sharp');
const settings = require('../../settings');
const logger = require('../../lib/logger');

module.exports = {
    name: 'mpesa',
    aliases: ['pay', 'fakepay', 'paypal'],
    category: 'tools',
    description: 'Generate a fake M-PESA / Payment screenshot',
    usage: '.mpesa <amount> <name>',
    react: '💸',

    async execute(conn, mek, args, chatId) {
        const amount = args[0];
        const name = args.slice(1).join(' ') || 'John Doe';

        if (!amount || isNaN(amount)) {
            return conn.sendMessage(chatId, { 
                text: `❌ Provide an amount.\nExample: ${settings.prefix}mpesa 5000 Kelly Rodgers\n\n${settings.footer}` 
            }, { quoted: mek });
        }

        await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(chatId, { text: `💸 *Generating Payment Receipt...*` }, { quoted: mek });

        try {
            // Generate a unique transaction code (e.g., QWE4RTY5UI)
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let txnCode = '';
            for (let i = 0; i < 10; i++) {
                txnCode += chars.charAt(Math.floor(Math.random() * chars.length));
            }

            const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
            const date = new Date().toLocaleDateString('en-GB');

            // Build the M-PESA SMS using SVG (rendered by sharp)
            const width = 800;
            const height = 400;

            const svgImage = `
                <svg width="${width}" height="${height}">
                    <!-- Background -->
                    <rect width="${width}" height="${height}" fill="#ffffff" />
                    
                    <!-- Fake Phone Header -->
                    <rect width="${width}" height="60" fill="#f0f0f0" />
                    <text x="20" y="38" fill="#333" font-family="Arial, sans-serif" font-size="20" font-weight="bold">SMS</text>
                    <text x="${width - 100}" y="38" fill="#666" font-family="Arial, sans-serif" font-size="18">${time}</text>

                    <!-- Message Bubble -->
                    <rect x="20" y="80" width="${width - 40}" height="280" rx="15" fill="#e5e5ea" />

                    <!-- Sender Name -->
                    <text x="40" y="120" fill="#333" font-family="Arial, sans-serif" font-size="18" font-weight="bold">MPESA</text>

                    <!-- SMS Content -->
                    <text x="40" y="160" fill="#000" font-family="Arial, sans-serif" font-size="22">${txnCode} Confirmed.</text>
                    <text x="40" y="200" fill="#000" font-family="Arial, sans-serif" font-size="22">Ksh${parseFloat(amount).toLocaleString()}.00 sent to</text>
                    <text x="40" y="240" fill="#000" font-family="Arial, sans-serif" font-size="22">${name.toUpperCase()} on ${date}</text>
                    <text x="40" y="280" fill="#000" font-family="Arial, sans-serif" font-size="22">at ${time}. New M-PESA balance is</text>
                    <text x="40" y="320" fill="#000" font-family="Arial, sans-serif" font-size="22">Ksh50,000.00. Transaction cost, Ksh0.00.</text>

                    <!-- Footer -->
                    <text x="${width / 2}" y="${height - 20}" fill="#999" font-family="Arial, sans-serif" font-size="14" text-anchor="middle">Simulate your transactions at your own risk.</text>
                </svg>
            `;

            // Convert SVG to PNG using Sharp
            const buffer = await sharp(Buffer.from(svgImage)).png().toBuffer();

            // Send Image
            await conn.sendMessage(chatId, {
                image: buffer,
                caption: `✅ *Receipt Generated!*\n\nAmount: Ksh${amount}\nName: ${name}\n\n_Save this screenshot to flex in groups._\n\n${settings.footer}`
            }, { quoted: mek });

            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

        } catch (error) {
            logger.error(`[FAKEPAY] Error: ${error.message}`);
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
            await conn.sendMessage(chatId, { 
                text: `❌ Failed to generate receipt: ${error.message}\n\n${settings.footer}` 
            }, { quoted: mek });
        }
    }
};