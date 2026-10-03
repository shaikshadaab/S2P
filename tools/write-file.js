const fs = require('fs');
const path = require('path');

const targetPath = process.argv[2];
const base64Data = process.argv[3];

if (!targetPath || !base64Data) {
  console.error("Usage: node tools/write-file.js <path> <base64Data>");
  process.exit(1);
}

const fullPath = path.resolve(process.cwd(), targetPath);
fs.mkdirSync(path.dirname(fullPath), { recursive: true });
fs.writeFileSync(fullPath, Buffer.from(base64Data, 'base64').toString('utf8'), 'utf8');
console.log(`[OK] Wrote ${targetPath}`);
