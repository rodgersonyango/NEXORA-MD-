const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', '..', 'data', 'antimute.json');

function readData() {
  try {
    if (fs.existsSync(DATA_PATH)) return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  } catch (e) {}
  return {};
}

function startAntiMuteEngine(conn) {
  // Run the check every 1 minute
  setInterval(async () => {
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-GB', { 
      timeZone: 'Africa/Nairobi', 
      hour: '2-digit', 
      minute: '2-digit' 
    }); // Outputs "HH:MM"

    const data = readData();
    if (Object.keys(data).length === 0) return;

    for (const [groupId, schedule] of Object.entries(data)) {
      try {
        if (schedule.close === currentTime) {
          await conn.groupSettingUpdate(groupId, 'announcement');
          await conn.sendMessage(groupId, { text: `📢 Group has been LOCKED automatically. Good night!` });
        } 
        else if (schedule.open === currentTime) {
          await conn.groupSettingUpdate(groupId, 'not_announcement');
          await conn.sendMessage(groupId, { text: `📢 Group has been UNLOCKED automatically. Good morning!` });
        }
      } catch (e) {
        console.log(`[ANTIMUTE-ENGINE] Failed for ${groupId}:`, e.message);
      }
    }
  }, 60000); // 60000 ms = 1 minute
}

module.exports = { startAntiMuteEngine };