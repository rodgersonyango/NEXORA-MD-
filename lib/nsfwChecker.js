const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'nsfw_groups.json');

function isNsfwEnabled(chatId) {
  try {
    if (fs.existsSync(DATA_PATH)) {
      const groups = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
      return groups.includes(chatId);
    }
  } catch (e) {}
  return false;
}

module.exports = { isNsfwEnabled };