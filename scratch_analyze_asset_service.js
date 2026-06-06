const fs = require('fs');

const content = fs.readFileSync('backend/src/services/asset.service.ts', 'utf8');
const lines = content.split('\n');

console.log('Class methods in AssetService:');
lines.forEach((line, idx) => {
  if (line.includes('static async') || line.includes('static ') && line.includes('(')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
