const axios = require('axios');
const settings = require('../../settings');
const logger = require('../../lib/logger');

module.exports = [
    {
        name: 'whois',
        aliases: ['domain', 'webinfo'],
        category: 'tools',
        description: 'Get domain registration and server info',
        usage: '.whois <domain>',
        react: '🌐',

        async execute(conn, mek, args, chatId) {
            const domain = args[0];
            if (!domain) return conn.sendMessage(chatId, { text: `❌ Example: ${settings.prefix}whois google.com` }, { quoted: mek });

            await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
            try {
                const res = await axios.get(`https://api.nexoracle.com/osint/whois?domain=${domain}&apikey=free_key`);
                const d = res.data.result;
                
                const text = `🌐 *WHOIS LOOKUP: ${domain.toUpperCase()}*\n\n` +
                             `📅 *Created:* ${d.create_date || 'Unknown'}\n` +
                             `⏳ *Expires:* ${d.expiry_date || 'Unknown'}\n` +
                             `🏢 *Registrar:* ${d.registrar || 'Unknown'}\n` +
                             `📍 *Country:* ${d.country || 'Unknown'}\n` +
                             `🛡️ *Status:* ${Array.isArray(d.status) ? d.status[0] : d.status || 'Active'}\n` +
                             `📧 *Emails:* ${Array.isArray(d.emails) ? d.emails.join(', ') : d.emails || 'Hidden'}\n\n` +
                             `${settings.footer}`;

                await conn.sendMessage(chatId, { text }, { quoted: mek });
                await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
            } catch (e) {
                await conn.sendMessage(chatId, { text: `❌ Lookup failed. Domain might be invalid.` }, { quoted: mek });
            }
        }
    },
    {
        name: 'num',
        aliases: ['phone', 'numinfo'],
        category: 'tools',
        description: 'Get carrier and country info from a phone number',
        usage: '.num <number>',
        react: '📞',

        async execute(conn, mek, args, chatId) {
            const number = args[0];
            if (!number) return conn.sendMessage(chatId, { text: `❌ Example: ${settings.prefix}num +254712345678` }, { quoted: mek });

            await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
            try {
                const cleanNum = number.replace(/[^0-9]/g, '');
                const res = await axios.get(`https://api.nexoracle.com/osint/number-info?number=${cleanNum}&apikey=free_key`);
                const d = res.data.result;

                const text = `📞 *PHONE INTELLIGENCE*\n\n` +
                             `📱 *Number:* +${d.number}\n` +
                             `🌍 *Country:* ${d.country} (${d.country_code})\n` +
                             `🏢 *Carrier:* ${d.carrier}\n` +
                             `🕒 *Timezone:* ${d.timezone}\n\n` +
                             `${settings.footer}`;

                await conn.sendMessage(chatId, { text }, { quoted: mek });
                await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
            } catch (e) {
                await conn.sendMessage(chatId, { text: `❌ Failed to trace number. Ensure you include the country code (e.g., +1, +44, +254).` }, { quoted: mek });
            }
        }
    },
    {
        name: 'ip',
        aliases: ['iptracker', 'trace'],
        category: 'tools',
        description: 'Track exact location of an IP address',
        usage: '.ip <ip_address>',
        react: '🛰️',

        async execute(conn, mek, args, chatId) {
            const ip = args[0];
            if (!ip) return conn.sendMessage(chatId, { text: `❌ Example: ${settings.prefix}ip 8.8.8.8` }, { quoted: mek });

            await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
            try {
                const res = await axios.get(`http://ip-api.com/json/${ip}`);
                if (res.data.status === 'fail') throw new Error(res.data.message);
                const d = res.data;

                const text = `🛰️ *IP TRACKER*\n\n` +
                             `🌐 *IP:* ${d.query}\n` +
                             `🏳️ *Country:* ${d.country} (${d.countryCode})\n` +
                             `📍 *Region:* ${d.regionName}\n` +
                             `🏙️ *City:* ${d.city}\n` +
                             `📮 *Zip:* ${d.zip}\n` +
                             `🗺️ *Coords:* ${d.lat}, ${d.lon}\n` +
                             `📡 *ISP:* ${d.isp}\n` +
                             `🏢 *Org:* ${d.org}\n\n` +
                             `_Click coordinates to view on Google Maps_\n\n` +
                             `${settings.footer}`;

                await conn.sendMessage(chatId, { text }, { quoted: mek });
                await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
            } catch (e) {
                await conn.sendMessage(chatId, { text: `❌ Failed to trace IP. Make sure it is a valid public IP.` }, { quoted: mek });
            }
        }
    }
];