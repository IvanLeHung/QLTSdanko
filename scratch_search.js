const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('.next') && !file.includes('dist')) {
        results = results.concat(walk(fullPath));
      }
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

const files = walk('frontend/src');
files.forEach(f => {
  try {
    const content = fs.readFileSync(f, 'utf8');
    if (content.includes('Sổ tài sản') || content.includes('/assets') && content.includes('nav')) {
      console.log(`Matched in sidebar search: ${f}`);
    }
  } catch (e) {}
});
console.log('Search done');
