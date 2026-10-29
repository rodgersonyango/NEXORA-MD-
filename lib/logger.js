/**
 * NEXORA MD - Logger
 * Consistent, colored, timestamped output
 */

const chalk = require('chalk');

function ts() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function line(color, tag, args) {
  const prefix = chalk.gray(`[${ts()}]`) + ' ' + color(tag);
  console.log(prefix, ...args);
}

const logger = {
  info: (...args) => line(chalk.cyan, '[INFO]', args),
  success: (...args) => line(chalk.green, '[ OK ]', args),
  warn: (...args) => line(chalk.yellow, '[WARN]', args),
  error: (...args) => line(chalk.red, '[ERR ]', args),
  debug: (...args) => {
    if (process.env.DEBUG) line(chalk.magenta, '[DBG ]', args);
  },
  raw: (...args) => console.log(...args)
};

module.exports = logger;