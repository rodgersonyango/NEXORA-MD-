/**
 * NEXORA MD - Per-user command rate limiter
 * Rolling window, per-user namespace support
 */

const hits = new Map();
const WINDOW_MS = 60 * 1000;

function clean(s) {
  return String(s || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
}

function isAllowed(sender, limit = 10) {
  const key = clean(sender);
  if (!key) return false;

  const now = Date.now();
  const timestamps = hits.get(key) || [];
  const recent = timestamps.filter(t => now - t < WINDOW_MS);

  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }

  recent.push(now);
  hits.set(key, recent);
  return true;
}

function reset(sender) {
  hits.delete(clean(sender));
}

function clearAll() {
  hits.clear();
}

function stats() {
  const out = {};
  const now = Date.now();
  for (const [key, timestamps] of hits) {
    const recent = timestamps.filter(t => now - t < WINDOW_MS);
    if (recent.length > 0) out[key] = recent.length;
  }
  return out;
}

// Rolling prune — does NOT reset everyone at once
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of hits) {
    const recent = timestamps.filter(t => now - t < WINDOW_MS);
    if (recent.length === 0) hits.delete(key);
    else hits.set(key, recent);
  }
}, Math.min(WINDOW_MS, 30 * 1000));

module.exports = { isAllowed, reset, clearAll, stats };