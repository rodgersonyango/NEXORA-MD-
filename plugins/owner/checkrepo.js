const settings = require('../../settings');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'checkrepo',
  aliases: ['repocheck', 'syncrepo'],
  category: 'owner',
  description: 'Check if your local bot files match your GitHub repository',
  usage: '.checkrepo',
  ownerOnly: true,
  react: '🔍',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      if (!isOwner) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        return conn.sendMessage(chatId, {
          text: `This command is for the Owner only.\n\n${settings.footer}`
        }, { quoted: mek });
      }

      // Change this to YOUR repo details
      const repoOwner = "queenbellabots-cloud";
      const repoName = "NEXORA-MD-";
      
      // We check the plugins folder on GitHub
      const repoUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/plugins`;

      await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });
      await conn.sendMessage(chatId, {
        text: `SYSTEM CHECK\n\nScanning commands from:\nhttps://github.com/${repoOwner}/${repoName}\n\nPlease wait...\n\n${settings.footer}`
      }, { quoted: mek });

      try {
        // 1. Fetch list of files from GitHub API
        const response = await axios.get(repoUrl, {
          headers: { 'User-Agent': 'NEXORA-MD' },
          timeout: 30000
        });

        if (!response.data || !Array.isArray(response.data)) {
          throw new Error('Failed to fetch data from GitHub');
        }

        // GitHub API returns folders inside /plugins (e.g., "general", "owner")
        // We need to recursively fetch the .js files inside each folder
        const githubFiles = [];
        
        for (const item of response.data) {
          if (item.type === 'dir') {
            try {
              const dirRes = await axios.get(item.url, {
                headers: { 'User-Agent': 'NEXORA-MD' },
                timeout: 30000
              });
              dirRes.data.forEach(f => {
                if (f.name.endsWith('.js')) {
                  githubFiles.push(f.name);
                }
              });
            } catch (e) {}
          } else if (item.name.endsWith('.js')) {
            githubFiles.push(item.name);
          }
        }

        // 2. Read local files recursively
        const localPath = path.join(process.cwd(), 'plugins');
        const localFiles = [];

        function walk(dir) {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (entry.isFile() && entry.name.endsWith('.js')) {
              localFiles.push(entry.name);
            }
          }
        }
        
        if (fs.existsSync(localPath)) {
          walk(localPath);
        }

        // 3. Compare
        const missingLocally = githubFiles.filter(file => !localFiles.includes(file));
        const missingOnGithub = localFiles.filter(file => !githubFiles.includes(file));
        const matchingFiles = githubFiles.filter(file => localFiles.includes(file));

        // 4. Build Report
        let report = `REPO DIAGNOSIS\n`;
        report += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
        report += `Matching Commands  : ${matchingFiles.length}\n`;
        report += `Only on GitHub     : ${missingLocally.length}\n`;
        report += `Only Local         : ${missingOnGithub.length}\n\n`;

        if (missingLocally.length > 0) {
          report += `MISSING FROM BOT (Found on GitHub):\n`;
          missingLocally.slice(0, 15).forEach((file, i) => {
            report += `${i + 1}. ${file}\n`;
          });
          if (missingLocally.length > 15) report += `... and ${missingLocally.length - 15} more\n`;
          report += `\nRecommendation: Run 'git pull' or redeploy to sync.\n`;
        } else {
          report += `Your bot is perfectly synced with GitHub.\n`;
        }

        if (missingOnGithub.length > 0) {
          report += `\nLOCAL FILES (Not on GitHub):\n`;
          missingOnGithub.slice(0, 10).forEach(file => report += `- ${file}\n`);
          if (missingOnGithub.length > 10) report += `... and ${missingOnGithub.length - 10} more\n`;
        }

        report += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
        report += `${settings.footer}`;

        await conn.sendMessage(chatId, { text: report }, { quoted: mek });
        await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

      } catch (error) {
        console.error('[CHECKREPO] Error:', error.message);
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        
        let errorMsg = `An error occurred while checking GitHub.\n\n${settings.footer}`;
        if (error.response && error.response.status === 404) {
          errorMsg = `The 'plugins' folder was not found in your repository.\n\n${settings.footer}`;
        } else if (error.response && error.response.status === 403) {
          errorMsg = `GitHub API Limit reached. Try again in a few minutes.\n\n${settings.footer}`;
        }
        
        await conn.sendMessage(chatId, { text: errorMsg }, { quoted: mek });
      }

    } catch (outerError) {
      console.log('[CHECKREPO] Fatal:', outerError.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
    }
  }
};