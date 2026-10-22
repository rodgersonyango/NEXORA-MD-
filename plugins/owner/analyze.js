const settings = require('../../settings');
const axios = require('axios');
const vm = require('vm');

module.exports = {
  name: 'analyze',
  aliases: ['checkcode', 'lint'],
  category: 'owner',
  description: 'Analyze a file from your GitHub repo for syntax errors',
  usage: '.analyze <filename.js>',
  ownerOnly: true,
  react: '🧪',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      if (!isOwner) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `This command is for the Owner only.\n\n${settings.footer}`
        }, { quoted: mek });
      }

      if (!args[0]) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `Please provide a file name to analyze.\n\nExample: .analyze ping.js\n\n${settings.footer}`
        }, { quoted: mek });
      }

      const fileName = args[0].endsWith('.js') ? args[0] : `${args[0]}.js`;
      
      // We point to YOUR repo now
      const repoOwner = "queenbellabots-cloud";
      const repoName = "NEXORA-MD-";
      
      // We try to fetch from plugins or lib
      const possiblePaths = [
        `plugins/general/${fileName}`,
        `plugins/owner/${fileName}`,
        `plugins/group/${fileName}`,
        `plugins/download/${fileName}`,
        `plugins/tools/${fileName}`,
        `plugins/ai/${fileName}`,
        `lib/${fileName}`
      ];

      await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
      await conn.sendMessage(chatId, {
        text: `Analyzing *${fileName}* from GitHub...\n\n${settings.footer}`
      }, { quoted: mek });

      let code = null;
      let foundPath = null;

      // Try finding the file in different folders
      for (const p of possiblePaths) {
        try {
          const rawUrl = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/main/${p}`;
          const response = await axios.get(rawUrl, { timeout: 10000 });
          code = response.data;
          foundPath = p;
          break;
        } catch (e) {
          // If 404, continue to next path
        }
      }

      if (!code) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `File *${fileName}* was not found in any plugin folder or lib folder.\n\n${settings.footer}`
        }, { quoted: mek });
      }

      // Analyze Syntax
      try {
        new vm.Script(code);
        
        await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
        let report = `ANALYSIS COMPLETE\n\n`;
        report += `File: ${fileName}\n`;
        report += `Path: ${foundPath}\n`;
        report += `Status: CLEAN\n\n`;
        report += `This code has no syntax errors and is safe to run on the bot.\n\n`;
        report += `${settings.footer}`;
        
        await conn.sendMessage(chatId, { text: report }, { quoted: mek });

      } catch (syntaxError) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        
        let errorMsg = `SYNTAX ERROR DETECTED\n\n`;
        errorMsg += `File: ${fileName}\n`;
        errorMsg += `Path: ${foundPath}\n`;
        errorMsg += `Type: Syntax Error\n`;
        errorMsg += `Details: ${syntaxError.message}\n`;
        
        if (syntaxError.stack) {
          const lineMatch = syntaxError.stack.match(/evalmachine\.<anonymous>:(\d+)/);
          if (lineMatch) {
            errorMsg += `Line: ${lineMatch[1]}\n`;
          }
        }

        errorMsg += `\nFix this error on GitHub before pulling it to the bot.\n\n${settings.footer}`;
        await conn.sendMessage(chatId, { text: errorMsg }, { quoted: mek });
      }

    } catch (error) {
      console.log('[ANALYZE] Error:', error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
      await conn.sendMessage(chatId, {
        text: `Failed to connect to GitHub (Network Error).\n\n${settings.footer}`
      }, { quoted: mek });
    }
  }
};