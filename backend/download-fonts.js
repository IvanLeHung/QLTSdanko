const https = require('https');
const fs = require('fs');
const path = require('path');

const fontsDir = path.join(__dirname, 'fonts');

function fetchText(url, userAgent) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': userAgent }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  // Try different user agents to get TTF format from Google Fonts
  const agents = [
    'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1)',
    'Java/1.8.0_111',
    'okhttp/3.0'
  ];
  
  const cssUrl = 'https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,400;0,500;1,400;1,500';
  
  let css = '';
  for (const ua of agents) {
    console.log(`Trying User-Agent: ${ua.substring(0, 30)}...`);
    css = await fetchText(cssUrl, ua);
    console.log(`  CSS length: ${css.length}`);
    if (css.includes('.ttf')) {
      console.log('  -> Found TTF URLs!');
      break;
    }
    if (css.includes('.woff2')) {
      console.log('  -> Got WOFF2 (not TTF)');
    }
    if (css.includes('.woff') && !css.includes('.woff2')) {
      console.log('  -> Got WOFF');
    }
  }
  
  // If no TTF, check if we got woff2 and print a sample
  if (!css.includes('.ttf')) {
    console.log('\nCSS content (first 500 chars):');
    console.log(css.substring(0, 500));
    
    // Fallback: download Noto Sans directly from notofonts GitHub releases
    console.log('\n--- Fallback: Downloading from notofonts GitHub releases ---');
    
    const files = {
      'NotoSans-Regular.ttf': 'https://github.com/notofonts/notofonts.github.io/raw/main/fonts/NotoSans/full/ttf/NotoSans-Regular.ttf',
      'NotoSans-Medium.ttf': 'https://github.com/notofonts/notofonts.github.io/raw/main/fonts/NotoSans/full/ttf/NotoSans-Medium.ttf',
      'NotoSans-Italic.ttf': 'https://github.com/notofonts/notofonts.github.io/raw/main/fonts/NotoSans/full/ttf/NotoSans-Italic.ttf',
      'NotoSans-MediumItalic.ttf': 'https://github.com/notofonts/notofonts.github.io/raw/main/fonts/NotoSans/full/ttf/NotoSans-MediumItalic.ttf',
    };
    
    for (const [filename, url] of Object.entries(files)) {
      const dest = path.join(fontsDir, filename);
      console.log(`Downloading ${filename}...`);
      try {
        await downloadFile(url, dest);
        const stat = fs.statSync(dest);
        console.log(`  -> Saved (${stat.size} bytes)`);
      } catch (err) {
        console.log(`  -> Failed: ${err.message}`);
      }
    }
  } else {
    // Parse TTF URLs from CSS
    const blocks = css.split('@font-face');
    for (const block of blocks) {
      const urlMatch = block.match(/url\(([^)]+\.ttf)\)/);
      const weightMatch = block.match(/font-weight:\s*(\d+)/);
      const styleMatch = block.match(/font-style:\s*(\w+)/);
      
      if (urlMatch) {
        const weight = weightMatch ? weightMatch[1] : '400';
        const style = styleMatch ? styleMatch[1] : 'normal';
        let filename;
        if (weight === '400' && style === 'normal') filename = 'NotoSans-Regular.ttf';
        else if (weight === '500' && style === 'normal') filename = 'NotoSans-Medium.ttf';
        else if (weight === '400' && style === 'italic') filename = 'NotoSans-Italic.ttf';
        else if (weight === '500' && style === 'italic') filename = 'NotoSans-MediumItalic.ttf';
        
        if (filename) {
          const dest = path.join(fontsDir, filename);
          console.log(`Downloading ${filename}...`);
          await downloadFile(urlMatch[1], dest);
          const stat = fs.statSync(dest);
          console.log(`  -> Saved (${stat.size} bytes)`);
        }
      }
    }
  }
  
  // Verify all files exist
  console.log('\n--- Verification ---');
  const needed = ['NotoSans-Regular.ttf', 'NotoSans-Medium.ttf', 'NotoSans-Italic.ttf', 'NotoSans-MediumItalic.ttf'];
  for (const f of needed) {
    const p = path.join(fontsDir, f);
    if (fs.existsSync(p)) {
      const stat = fs.statSync(p);
      console.log(`✓ ${f} (${stat.size} bytes)`);
    } else {
      console.log(`✗ ${f} MISSING`);
    }
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
