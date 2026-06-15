const fs = require('fs');
const path = require('path');

const targetFilePath = path.join(__dirname, '..', 'frontend', 'src', 'pages', 'InventoryDetail.tsx');
const layoutFilePath = path.join(__dirname, '..', 'frontend', 'src', 'pages', 'scanner_layout.txt');

const mainContent = fs.readFileSync(targetFilePath, 'utf8');
const layoutContent = fs.readFileSync(layoutFilePath, 'utf8');

// Split main file content by line
const lines = mainContent.split(/\r?\n/);

console.log('Original lines count:', lines.length);

// The lines we want to replace are 2196 to 2572 (inclusive, 1-indexed)
// 1-indexed line 2196 is index 2195.
// 1-indexed line 2572 is index 2571.
const startIdx = 2195;
const endIdx = 2571;

console.log('Replacing from index:', startIdx, 'to', endIdx);
console.log('Line at startIdx:', lines[startIdx]);
console.log('Line at endIdx:', lines[endIdx]);

// Splice the layoutContent into the array of lines
const beforeLines = lines.slice(0, startIdx);
const afterLines = lines.slice(endIdx + 1);

const newContent = [...beforeLines, layoutContent, ...afterLines].join('\n');

fs.writeFileSync(targetFilePath, newContent, 'utf8');
console.log('Replacement complete! New lines count:', newContent.split('\n').length);
