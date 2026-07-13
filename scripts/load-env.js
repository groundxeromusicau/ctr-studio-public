const fs = require('node:fs');
const path = require('node:path');

function parseLine(line) {
  const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
  if (!match) return null;
  let value = match[2];
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  } else {
    value = value.replace(/\s+#.*$/, '').trim();
  }
  return [match[1], value.replace(/\\n/g, '\n')];
}

function loadEnv(filePath = path.join(__dirname, '..', '.env')) {
  if (!fs.existsSync(filePath)) return false;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const entry = parseLine(line);
    if (entry && process.env[entry[0]] === undefined) process.env[entry[0]] = entry[1];
  }
  return true;
}

module.exports = loadEnv;
