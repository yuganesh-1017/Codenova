const fs = require('fs');
let html = fs.readFileSync('memory_storage.html', 'utf8');

// Title
html = html.replace('<title>CodeNova | Memory Storage Library</title>', '<title>CodeNova | Solved Problems</title>');

// Nav items
html = html.replace('<a href="memory_storage.html" class="nav-item active">Memory Storage</a>', '<a href="memory_storage.html" class="nav-item">Memory Storage</a>');
html = html.replace('<a href="stats.html" class="nav-item">Roadmap</a>', '<a href="solved.html" class="nav-item active">Solved</a>\n      <a href="stats.html" class="nav-item">Roadmap</a>');

// Header Text
html = html.replace('<h2>Memory Storage Library</h2>', '<h2>Solved Problems</h2>');
html = html.replace('<a href="memory_create.html" class="btn-create">+ Forge Challenge</a>', '');

// Remove stats cards
html = html.replace(/<!-- Stats Cards -->[\s\S]*?<!-- Library Panel -->/, '<!-- Library Panel -->');

// Replace script logic
const newScript = `let allProblemsList = [];
    let solvedProblemsList = [];
    let selectedProblem = null;
    let activeLangTab = 'javascript';

    document.addEventListener('DOMContentLoaded', () => {
      loadAllProblems();
    });

    function loadAllProblems() {
      const p1 = fetch(API_BASE_URL + '/api/problems')
        .then(res => res.json())
        .catch(err => typeof FALLBACK_PROBLEMS !== 'undefined' ? FALLBACK_PROBLEMS : []);
        
      const p2 = fetch(API_BASE_URL + '/api/custom-problems')
        .then(res => res.json())
        .catch(err => {
          const localCustoms = JSON.parse(localStorage.getItem('custom_problems') || '{}');
          return Object.values(localCustoms);
        });

      Promise.all([p1, p2]).then(([standard, custom]) => {
        allProblemsList = [...standard, ...custom];
        const solved = getSolved();
        solvedProblemsList = allProblemsList.filter(p => solved.includes(String(p.id)) || solved.includes(Number(p.id)));
        renderStorage();
      });
    }

    function renderStorage() {
      const tableBody = document.getElementById('libraryTableBody');
      const tableContainer = document.getElementById('libraryTableContainer');

      if (solvedProblemsList.length === 0) {
        tableContainer.innerHTML = \`
          <div class="placeholder-library">
            <span>🌌</span>
            <h3>No Solved Problems Yet</h3>
            <p style="margin-top:8px; font-size:13.5px;">Complete problems in the workspace to see your solutions here.</p>
          </div>
        \`;
        return;
      }

      tableBody.innerHTML = '';
      solvedProblemsList.forEach((prob, index) => {
        const tr = document.createElement('tr');
        tr.className = 'problem-row';
        tr.dataset.id = prob.id;

        tr.innerHTML = \`
          <td>\${index + 1}</td>
          <td style="font-weight:600; color:#fff;">
            \${prob.title}
            <span style="color:var(--color-green); font-size:11px; margin-left:6px;">✔</span>
          </td>
          <td><span class="badge diff-\${(prob.difficulty||'easy').toLowerCase()}">\${prob.difficultyText || prob.difficulty}</span></td>
          <td>
            <a href="editor.html?id=\${prob.id}" class="btn-action-solve">Solve Again</a>
          </td>
        \`;

        tr.addEventListener('click', (e) => {
          if (e.target.classList.contains('btn-action-solve')) return;
          
          document.querySelectorAll('.problem-row').forEach(row => row.classList.remove('active'));
          tr.classList.add('active');

          selectedProblem = prob;
          renderRewindConsole();
        });

        tableBody.appendChild(tr);
      });
    }

    function renderRewindConsole() {
      const rewindPanel = document.getElementById('rewindPanel');
      if (!selectedProblem) return;

      const cn_solutions = JSON.parse(localStorage.getItem('cn_solutions') || '{}');
      const solutions = selectedProblem.solutions || cn_solutions[selectedProblem.id] || {};

      let renderHtml = \`
        <div class="rewind-header">
          <h2>\${selectedProblem.title}</h2>
          <div class="meta">
            <span>Difficulty: <span class="badge diff-\${(selectedProblem.difficulty||'easy').toLowerCase()}" style="padding:2px 6px;">\${selectedProblem.difficultyText || selectedProblem.difficulty}</span></span>
            <span>Status: <span style="color:var(--color-green); font-weight:600;">Solved</span></span>
          </div>
        </div>

        <div class="lang-tabs">
          <button class="lang-tab \${activeLangTab === 'javascript' ? 'active' : ''}" data-lang="javascript">JavaScript</button>
          <button class="lang-tab \${activeLangTab === 'python' ? 'active' : ''}" data-lang="python">Python</button>
          <button class="lang-tab \${activeLangTab === 'cpp' ? 'active' : ''}" data-lang="cpp">C++</button>
          <button class="lang-tab \${activeLangTab === 'java' ? 'active' : ''}" data-lang="java">Java</button>
        </div>

        <div class="code-viewer-deck" id="codeViewerDeck">
          <!-- Dynamic code view -->
        </div>

        <a href="editor.html?id=\${selectedProblem.id}" class="btn-submit" style="text-align:center; padding:12px; font-size:14px; text-decoration:none; margin-top: 20px; display: block; border-radius: 8px; background: rgba(168,85,247,0.1); border: 1px solid rgba(168,85,247,0.3); color: var(--color-purple);">Open in Workspace Editor</a>
      \`;

      rewindPanel.innerHTML = renderHtml;

      rewindPanel.querySelectorAll('.lang-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
          activeLangTab = e.target.dataset.lang;
          rewindPanel.querySelectorAll('.lang-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          updateCodeView(solutions);
        });
      });

      updateCodeView(solutions);
    }

    function updateCodeView(solutions) {
      const deck = document.getElementById('codeViewerDeck');
      const savedCode = solutions[activeLangTab];

      if (savedCode) {
        const escapedCode = savedCode
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");

        deck.innerHTML = \`
          <pre><code>\${escapedCode}</code></pre>
        \`;
      } else {
        deck.innerHTML = \`
          <div class="placeholder-deck" style="padding:20px; font-size:13px;">
            <span>💤</span>
            <p>No solved solution in \${activeLangTab.toUpperCase()} yet.</p>
            <p style="color:var(--text-muted); font-size:12px; margin-top:4px;">Open the challenge in the workspace editor to write and submit a solution!</p>
          </div>
        \`;
      }
    }`;

html = html.replace(/let customProblemsList = \[\];[\s\S]*?<\/script>/, newScript + '\n  </script>');

fs.writeFileSync('solved.html', html);
console.log('solved.html created successfully.');
