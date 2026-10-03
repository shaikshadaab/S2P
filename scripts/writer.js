const fs = require('fs');
const targetFile = process.argv[2];
let data = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => data += chunk);
process.stdin.on('end', () => {
  fs.writeFileSync(targetFile, data, 'utf8');
  console.log(`Successfully wrote ${data.length} bytes to ${targetFile}`);
});
