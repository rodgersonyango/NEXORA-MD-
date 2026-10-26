/**
 * NEXORA MD - Live Uptime Counter
 * Real-time stats with server location
 * Usage: .uptime
 */

const settings = require('../../settings');
const axios = require('axios');
const os = require('os');
const fs = require('fs');
const path = require('path');

const UPDATE_INTERVAL = 2000;
const MAX_DURATION = 60000;
const UPTIME_FILE = path.join(process.cwd(), 'data', 'deployment_date.json');

const activeSessions = new Map();
let cachedLocation = null;

// ─────────────────────────────────────────────
// STABLE UPTIME LOGIC
// ─────────────────────────────────────────────
function getOrCreateDeploymentDate() {
  try {
    if (fs.existsSync(UPTIME_FILE)) {
      const data = JSON.parse(fs.readFileSync(UPTIME_FILE, 'utf8'));
      if (data && data.deployedAt) {
        return data.deployedAt;
      }
    }
  } catch (e) {}

  // If file doesn't exist or is corrupt, create it now
  const now = Date.now();
  try {
    if (!fs.existsSync(path.dirname(UPTIME_FILE))) {
      fs.mkdirSync(path.dirname(UPTIME_FILE), { recursive: true });
    }
    fs.writeFileSync(UPTIME_FILE, JSON.stringify({ deployedAt: now }, null, 2));
  } catch (e) {
    console.log('[UPTIME] Failed to save deployment date:', e.message);
  }
  return now;
}

const START_TIME = getOrCreateDeploymentDate();

// ─────────────────────────────────────────────
// SERVER LOCATION (cached after first fetch)
// ─────────────────────────────────────────────
async function getServerLocation() {
  if (cachedLocation) return cachedLocation;

  try {
    const res = await axios.get('http://ip-api.com/json/?fields=status,country,countryCode,regionName,city,isp,query', {
      timeout: 10000
    });

    if (res.data && res.data.status === 'success') {
      cachedLocation = {
        ip: res.data.query,
        city: res.data.city || 'Unknown',
        region: res.data.regionName || 'Unknown',
        country: res.data.country || 'Unknown',
        countryCode: res.data.countryCode || '',
        isp: res.data.isp || 'Unknown'
      };
      return cachedLocation;
    }
  } catch (e) {}

  cachedLocation = {
    ip: 'unknown',
    city: 'Unknown',
    region: '',
    country: 'Unknown',
    countryCode: '',
    isp: 'Unknown'
  };
  return cachedLocation;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  parts.push(`${sec}s`);
  return parts.join(' ');
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function getCpuLoad() {
  try {
    const load = os.loadavg();
    const cores = os.cpus().length || 1;
    const pct = (load[0] / cores) * 100;
    return Math.min(100, Math.max(0, Math.round(pct)));
  } catch (e) { return 0; }
}

function getMemoryStats() {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  const pct = Math.round((used / total) * 100);
  return { total, free, used, pct };
}

function getProcessMemory() {
  try {
    const proc = process.memoryUsage();
    return { rss: proc.rss, heapTotal: proc.heapTotal, heapUsed: proc.heapUsed };
  } catch (e) { return { rss: 0, heapTotal: 0, heapUsed: 0 }; }
}

function buildBar(pct, length = 15) {
  const filled = Math.round((pct / 100) * length);
  const empty = length - filled;
  return '█'.repeat(Math.max(0, filled)) + '░'.repeat(Math.max(0, empty));
}

function formatNow() {
  return new Date().toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true
  });
}

function formatDeployDate(timestamp) {
  return new Date(timestamp).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    hour12: true
  });
}

function countUniqueCommands() {
  const uniqueNames = new Set();
  if (global.commands && typeof global.commands.forEach === 'function') {
    global.commands.forEach((cmd) => {
      if (cmd && cmd.name) uniqueNames.add(cmd.name);
    });
  }
  return uniqueNames.size;
}

async function fetchImageBuffer(url) {
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 20000,
    maxRedirects: 5,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'image/*,*/*;q=0.8'
    }
  });
  const type = res.headers['content-type'] || '';
  if (!type.startsWith('image/')) throw new Error(`Not an image`);
  return Buffer.from(res.data);
}

// ─────────────────────────────────────────────
// BUILD STATS TEXT
// ─────────────────────────────────────────────
async function buildStatsText() {
  const uptimeMs = Date.now() - START_TIME;
  const uptimeStr = formatUptime(uptimeMs);
  const deployStr = formatDeployDate(START_TIME);
  
  const mem = getMemoryStats();
  const proc = getProcessMemory();
  const cpuPct = getCpuLoad();
  const procMb = Math.round(proc.rss / 1024 / 1024);
  const heapMb = Math.round(proc.heapUsed / 1024 / 1024);
  const cpuCores = os.cpus().length;
  const cpuModel = os.cpus()[0]?.model || 'Unknown';
  const totalCommands = countUniqueCommands();
  const currentMode = global.botMode ? String(global.botMode).toUpperCase() : 'PUBLIC';

  const loc = await getServerLocation();

  let text = '';
  text += `NEXORA MD — LIVE STATS\n`;
  text += `---------------------\n\n`;

  text += `[ BOT ]\n`;
  text += `Name: ${settings.botName || 'NEXORA MD'}\n`;
  text += `Mode: ${currentMode}\n`;
  text += `Commands: ${totalCommands}\n\n`;

  text += `[ UPTIME ]\n`;
  text += `Deployed: ${deployStr}\n`;
  text += `Active: ${uptimeStr}\n`;
  text += `Updated: ${formatNow()}\n\n`;

  text += `[ PROCESS ]\n`;
  text += `RSS: ${procMb} MB\n`;
  text += `Heap: ${heapMb} MB\n`;
  text += `Node: ${process.version}\n`;
  text += `PID: ${process.pid}\n\n`;

  text += `[ SERVER LOCATION ]\n`;
  text += `City: ${loc.city}${loc.region ? ', ' + loc.region : ''}\n`;
  text += `Country: ${loc.country}${loc.countryCode ? ' (' + loc.countryCode + ')' : ''}\n`;
  text += `ISP: ${loc.isp}\n`;
  text += `IP: ${loc.ip}\n\n`;

  text += `[ SYSTEM ]\n`;
  text += `Platform: ${os.platform()} (${os.arch()})\n`;
  text += `CPU Cores: ${cpuCores}\n`;
  text += `CPU: ${cpuModel.slice(0, 40)}\n\n`;

  text += `[ MEMORY ]\n`;
  text += `Memory: ${formatBytes(mem.used)} / ${formatBytes(mem.total)}\n`;
  text += `Mem Usage: ${buildBar(mem.pct)} ${mem.pct}%\n`;
  text += `CPU Load: ${buildBar(cpuPct)} ${cpuPct}%\n\n`;

  text += `𝐑𝐨𝐲𝐓𝐞𝐜𝐡\n`;
  text += `${settings.footer}`;

  return text;
}

// ─────────────────────────────────────────────
// COMMAND
// ─────────────────────────────────────────────
module.exports = {
  name: 'uptime',
  aliases: ['stats', 'sysinfo', 'liveuptime'],
  category: 'general',
  description: 'Live uptime counter with real server location',
  usage: '.uptime',
  react: '✅',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });

      if (activeSessions.has(chatId)) {
        try {
          const old = activeSessions.get(chatId);
          clearInterval(old.interval);
          clearTimeout(old.timeout);
          activeSessions.delete(chatId);
        } catch (e) {}
      }

      const text = await buildStatsText();

      let sentMsg = null;

      try {
        if (settings.menuThemes && settings.menuThemes[8] && settings.menuThemes[8].image) {
          const buffer = await fetchImageBuffer(settings.menuThemes[8].image);
          sentMsg = await conn.sendMessage(chatId, {
            image: buffer,
            caption: text
          });
        } else {
          sentMsg = await conn.sendMessage(chatId, { text });
        }
      } catch (imgErr) {
        console.log('[UPTIME] Image failed:', imgErr.message);
        sentMsg = await conn.sendMessage(chatId, { text });
      }

      if (!sentMsg || !sentMsg.key) return;

      const startTime = Date.now();

      const interval = setInterval(async () => {
        try {
          if (Date.now() - startTime > MAX_DURATION) {
            clearInterval(interval);
            activeSessions.delete(chatId);
            return;
          }

          const newText = await buildStatsText();

          await conn.sendMessage(chatId, {
            edit: sentMsg.key,
            text: newText
          });
        } catch (editErr) {
          console.log('[UPTIME] Edit failed:', editErr.message);
          clearInterval(interval);
          activeSessions.delete(chatId);
        }
      }, UPDATE_INTERVAL);

      const timeout = setTimeout(() => {
        clearInterval(interval);
        activeSessions.delete(chatId);
      }, MAX_DURATION);

      activeSessions.set(chatId, { interval, timeout, messageKey: sentMsg.key });

    } catch (error) {
      console.log('[UPTIME] Error:', error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
      try {
        await conn.sendMessage(chatId, {
          text: `Error: ${error.message}\n\n${settings.footer}`
        });
      } catch (e) {}
    }
  }
};