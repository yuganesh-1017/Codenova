const fs = require('fs');
const path = require('path');

const dir = __dirname;

// 1. Create config.js
const configContent = `// Global Configuration for Frontend
// Replace this with your actual Render URL before deploying to Netlify
const API_BASE_URL = 'https://YOUR_BACKEND.onrender.com';
`;
fs.writeFileSync(path.join(dir, 'config.js'), configContent);
console.log('✅ Created config.js');

// 2. Process all HTML files
const htmlFiles = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

htmlFiles.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Inject config.js if not present
  if (!content.includes('<script src="config.js"></script>')) {
    content = content.replace('</head>', '  <script src="config.js"></script>\n</head>');
  }

  // Replace fetch calls with single quotes: fetch('/api/...') -> fetch(API_BASE_URL + '/api/...')
  content = content.replace(/fetch\('\/api\/([^']+)'(,|\))/g, 'fetch(API_BASE_URL + \'/api/$1\'$2');
  
  // Replace fetch calls with double quotes: fetch("/api/...") -> fetch(API_BASE_URL + "/api/...")
  content = content.replace(/fetch\("\/api\/([^"]+)"(,|\))/g, 'fetch(API_BASE_URL + "/api/$1"$2');

  // Replace fetch calls with backticks: fetch(`/api/...`) -> fetch(`${API_BASE_URL}/api/...`)
  content = content.replace(/fetch\(\`\/api\/([^`]+)\`(,|\))/g, 'fetch(`${API_BASE_URL}/api/$1`$2');

  // Replace window.location.href redirects for OAuth
  content = content.replace(/window\.location\.href\s*=\s*'\/api\/auth\/(google|github|discord)'/g, 'window.location.href = API_BASE_URL + \'/api/auth/$1\'');
  content = content.replace(/window\.location\.href\s*=\s*\"\/api\/auth\/(google|github|discord)\"/g, 'window.location.href = API_BASE_URL + "/api/auth/$1"');
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Updated HTML: ${file}`);
});

// 3. Process all JS files
const jsFiles = fs.readdirSync(dir).filter(f => f.endsWith('.js') && f !== 'server.js' && f !== 'config.js' && !f.includes('test') && !f.includes('migrate') && !f.includes('update'));

jsFiles.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  const originalContent = content;

  content = content.replace(/fetch\('\/api\/([^']+)'(,|\))/g, 'fetch(API_BASE_URL + \'/api/$1\'$2');
  content = content.replace(/fetch\("\/api\/([^"]+)"(,|\))/g, 'fetch(API_BASE_URL + "/api/$1"$2');
  content = content.replace(/fetch\(\`\/api\/([^`]+)\`(,|\))/g, 'fetch(`${API_BASE_URL}/api/$1`$2');
  
  content = content.replace(/window\.location\.href\s*=\s*'\/api\/auth\/(google|github|discord)'/g, 'window.location.href = API_BASE_URL + \'/api/auth/$1\'');
  content = content.replace(/window\.location\.href\s*=\s*\"\/api\/auth\/(google|github|discord)\"/g, 'window.location.href = API_BASE_URL + "/api/auth/$1"');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated JS: ${file}`);
  }
});
