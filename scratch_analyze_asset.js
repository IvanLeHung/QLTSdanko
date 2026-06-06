const fs = require('fs');

function analyzeFile(filePath) {
  console.log(`=== Analyzing ${filePath} ===`);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('router.get') || line.includes('router.post') || line.includes('router.patch') || line.includes('router.delete') || line.includes('router.put')) {
      console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
  });
}

analyzeFile('backend/src/routes/asset.routes.ts');
analyzeFile('backend/src/services/asset.service.ts');
