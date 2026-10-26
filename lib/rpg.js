const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'rpg_users.json');

function readDB() {
  try {
    if (fs.existsSync(DB_PATH)) return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch (e) {}
  return {};
}

function writeDB(data) {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (e) {}
}

function getUser(jid) {
  const db = readDB();
  if (!db[jid]) {
    db[jid] = {
      health: 100,
      stamina: 100,
      money: 0,
      exp: 0,
      level: 1,
      lasthunt: 0,
      // Inventory
      wood: 0, rock: 0, iron: 0, string: 0, diamond: 0, emerald: 0, coal: 0,
      potion: 0, pickaxe: 0, sword: 0, axe: 0, fishingrod: 0, armor: 0,
      ayambakar: 0, ayamgoreng: 0, oporayam: 0, rendang: 0, steak: 0, gulaiayam: 0, babipanggang: 0,
      ikanbakar: 0, lelebakar: 0, nilabakar: 0, bawalbakar: 0, udangbakar: 0, pausbakar: 0, kepitingbakar: 0
    };
    writeDB(db);
  }
  return db[jid];
}

function saveUser(jid, data) {
  const db = readDB();
  db[jid] = data;
  writeDB(db);
}

module.exports = { getUser, saveUser };