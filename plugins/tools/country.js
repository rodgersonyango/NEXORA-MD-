const settings = require('../../settings');
const axios = require('axios');

module.exports = {
  name: 'country',
  aliases: ['people', 'nchi'],
  category: 'tools',
  description: 'Get information about any country',
  usage: '.country <name>',
  react: '🌍',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      if (!args[0]) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `Please provide a country name.\n\nExample: .country Kenya\n\n${settings.footer}`
        }, { quoted: mek });
      }

      const countryName = args.join(' ');
      await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });

      const url = `https://restcountries.com/v3.1/name/${encodeURIComponent(countryName)}`;
      const response = await axios.get(url, { timeout: 30000 });
      const data = response.data[0];

      if (!data) {
        throw new Error('Country not found');
      }

      const name = data.name.common;
      const officialName = data.name.official;
      const capital = data.capital ? data.capital[0] : 'N/A';
      const region = data.region;
      const subregion = data.subregion || 'N/A';
      const population = data.population.toLocaleString();
      const flag = data.flags.png;
      const map = data.maps.googleMaps;

      const currencyKeys = Object.keys(data.currencies || {});
      const currency = currencyKeys.length > 0 ? data.currencies[currencyKeys[0]].name : 'N/A';
      const symbol = currencyKeys.length > 0 ? data.currencies[currencyKeys[0]].symbol : '';

      const languages = Object.values(data.languages || {}).join(', ');

      const countryInfo =
        `COUNTRY INFORMATION: ${name.toUpperCase()}\n\n` +
        `Official Name : ${officialName}\n` +
        `Capital City  : ${capital}\n` +
        `Population    : ${population}\n` +
        `Region        : ${region} (${subregion})\n` +
        `Currency      : ${currency} ${symbol}\n` +
        `Languages     : ${languages}\n` +
        `Google Maps   : ${map}\n\n` +
        `${settings.footer}`;

      await conn.sendMessage(chatId, {
        image: { url: flag },
        caption: countryInfo
      }, { quoted: mek });

      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

    } catch (e) {
      console.log('[COUNTRY] Error:', e.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (err) {}
      await conn.sendMessage(chatId, {
        text: `Country not found. Please use the English name (e.g., .country Kenya).\n\n${settings.footer}`
      }, { quoted: mek });
    }
  }
};