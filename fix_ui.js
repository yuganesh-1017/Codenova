const fs = require('fs');

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
const faviconTag = '\n  <link rel="icon" href="favicon.svg" type="image/svg+xml">\n';

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Add favicon if not present
  if (!content.includes('href="favicon.svg"')) {
    content = content.replace('</head>', faviconTag + '</head>');
  }

  // Fix sorting in problems.html
  if (file === 'problems.html') {
    // Inject sorting logic before rendering
    if (!content.includes('problemsList.sort(')) {
      content = content.replace(
        'problemsList = data;',
        'problemsList = data;\n          problemsList.sort((a, b) => Number(a.id) - Number(b.id));'
      );
      content = content.replace(
        'problemsList = FALLBACK_PROBLEMS;',
        'problemsList = FALLBACK_PROBLEMS;\n          problemsList.sort((a, b) => Number(a.id) - Number(b.id));'
      );
    }
  }
  
  // Fix ID display in problems.html to show sequential numbers regardless of actual ID
  if (file === 'problems.html') {
    if (!content.includes('<td>${index + 1}</td>')) {
      content = content.replace('problemsList.forEach(prob => {', 'problemsList.forEach((prob, index) => {');
      content = content.replace('<td>${prob.id}</td>', '<td>${index + 1}</td>');
    }
  }

  fs.writeFileSync(file, content);
  console.log('Updated ' + file);
});
