const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
files.forEach(file => {
  if (file === 'solved.html') return;

  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('<nav class="header-nav">')) {
    if (!content.includes('href="solved.html"')) {
      content = content.replace(
        '<a href="stats.html" class="nav-item">Roadmap</a>',
        '<a href="solved.html" class="nav-item">Solved</a>\n      <a href="stats.html" class="nav-item">Roadmap</a>'
      );
      content = content.replace(
        '<a href="stats.html" class="nav-item active">Roadmap</a>',
        '<a href="solved.html" class="nav-item">Solved</a>\n      <a href="stats.html" class="nav-item active">Roadmap</a>'
      );
      fs.writeFileSync(file, content);
      console.log('Updated ' + file);
    }
  }
});
