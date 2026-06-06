const fs = require('fs');

const content = fs.readFileSync('backend/src/routes/asset.routes.ts', 'utf8');
const lines = content.split('\n');

for (let i = 160; i < 240; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
