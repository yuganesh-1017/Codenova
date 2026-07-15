// Syntax highlighting, scroll sync, and dynamic line numbering helpers
window.updateEditorHighlight = function() {
  const textarea = document.getElementById('editorTextArea');
  const codeBlock = document.getElementById('highlighting-content');
  const languageSelect = document.getElementById('languageSelect');
  if (!textarea || !codeBlock) return;
  
  let text = textarea.value;
  // Handle final newline so scrolling aligns properly when pressing Enter
  if (text[text.length-1] === "\n") {
    text += " ";
  }
  
  // Escape HTML tags to prevent render issues
  codeBlock.textContent = text;
  
  // Update class name for Prism language parsing
  const lang = languageSelect ? languageSelect.value : 'javascript';
  codeBlock.className = `language-${lang}`;
  
  // Highlight via Prism
  if (window.Prism) {
    Prism.highlightElement(codeBlock);
  }
  
  // Update line numbers
  updateLineNumbers();
};

window.syncEditorScroll = function() {
  const textarea = document.getElementById('editorTextArea');
  const pre = document.getElementById('highlighting-pre');
  const lineNumbers = document.getElementById('lineNumbers');
  if (!textarea) return;
  
  if (pre) {
    pre.scrollTop = textarea.scrollTop;
    pre.scrollLeft = textarea.scrollLeft;
  }
  if (lineNumbers) {
    lineNumbers.scrollTop = textarea.scrollTop;
  }
};

window.updateLineNumbers = function() {
  const textarea = document.getElementById('editorTextArea');
  const lineNumbers = document.getElementById('lineNumbers');
  if (!textarea || !lineNumbers) return;
  
  const lines = textarea.value.split('\n');
  let linesHtml = '';
  for (let i = 1; i <= lines.length; i++) {
    linesHtml += `<div>${i}</div>`;
  }
  lineNumbers.innerHTML = linesHtml;
};

document.addEventListener('DOMContentLoaded', () => {
  let timerInterval = null;
  let elapsedSeconds = 0;
  let isTimerPaused = false;

  function formatStopwatchTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const minStr = String(minutes).padStart(2, '0');
    const secStr = String(seconds).padStart(2, '0');
    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${minStr}:${secStr}`;
    }
    return `${minStr}:${secStr}`;
  }

  function formatTimeTakenText(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    let text = '';
    if (hours > 0) text += `${hours} hr${hours > 1 ? 's' : ''} `;
    if (minutes > 0 || hours > 0) text += `${minutes} min${minutes > 1 ? 's' : ''} `;
    text += `${seconds} sec${seconds !== 1 ? 's' : ''}`;
    return text.trim() || '0 secs';
  }

  function startStopwatch(probId) {
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    const timersObj = safeJsonParse(safeLocalStorage.getItem('cn_timers'), {});
    elapsedSeconds = Number(timersObj[probId]) || 0;
    isTimerPaused = false;
    
    const timerDisplay = document.getElementById('timerDisplay');
    const timerControlIcon = document.getElementById('timerControlIcon');
    if (timerDisplay) {
      timerDisplay.textContent = formatStopwatchTime(elapsedSeconds);
    }
    if (timerControlIcon) {
      timerControlIcon.innerHTML = `<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>`;
    }
    
    timerInterval = setInterval(() => {
      if (!isTimerPaused) {
        elapsedSeconds++;
        if (timerDisplay) {
          timerDisplay.textContent = formatStopwatchTime(elapsedSeconds);
        }
        const currentTimers = safeJsonParse(safeLocalStorage.getItem('cn_timers'), {});
        currentTimers[probId] = elapsedSeconds;
        safeLocalStorage.setItem('cn_timers', JSON.stringify(currentTimers));
      }
    }, 1000);
  }

  const urlParams = new URLSearchParams(window.location.search);
  const rawId = urlParams.get('id') || "1";
  let problemId = isNaN(rawId) ? rawId : Number(rawId);
  let problem = null;

  // 1. Fetch problem details from backend API
  fetch(`${API_BASE_URL}/api/problems/${problemId}`)
    .then(response => {
      if (!response.ok) throw new Error('Problem not found');
      return response.json();
    })
    .then(data => {
      problem = data;
      renderProblem(problem);
      startStopwatch(problemId);
    })
    .catch(err => {
      console.warn('Failed to fetch from API, falling back to local preview database:', err);
      let localProblem = FALLBACK_PROBLEMS.find(p => p.id === problemId);
      
      // Check in localStorage if not found in static fallbacks
      if (!localProblem) {
        const localCustoms = safeJsonParse(safeLocalStorage.getItem('custom_problems'), {});
        localProblem = localCustoms[problemId];
      }

      if (localProblem) {
        problem = localProblem;
        renderProblem(problem);
        startStopwatch(problemId);
      } else {
        alert("Problem not found! Redirecting to Dashboard.");
        window.location.href = "dashboard.html";
      }
    });

  function renderProblem(prob) {
    // Update Page Title
    document.title = `CodeNova Editor | ${prob.title}`;
    
    // Render Left Problem Specification Panel
    const titleHeader = document.querySelector('.title-row h1');
    const difficultyBadge = document.querySelector('.title-row .badge');
    const problemDescription = document.querySelector('.problem-description');
    const examplesContainer = document.querySelector('.problem-examples');
    const constraintsUl = document.querySelector('.problem-constraints ul');

    if (titleHeader) titleHeader.textContent = prob.title;
    if (difficultyBadge) {
      difficultyBadge.textContent = prob.difficultyText;
      difficultyBadge.className = `badge diff-${prob.difficulty}`;
    }
    if (problemDescription) problemDescription.innerHTML = prob.description;
    
    // Render Examples
    if (examplesContainer) {
      examplesContainer.innerHTML = '<h3>Examples:</h3>';
      prob.examples.forEach((ex, idx) => {
        const box = document.createElement('div');
        box.className = 'example-box';
        box.innerHTML = `
          <h3>Example ${idx + 1}:</h3>
          <pre class="example-code"><strong>Input:</strong> ${ex.input}<br><strong>Output:</strong> ${ex.output}<br><strong>Explanation:</strong> ${ex.explanation}</pre>
        `;
        examplesContainer.appendChild(box);
      });
    }

    // Render Constraints
    if (constraintsUl) {
      constraintsUl.innerHTML = '';
      prob.constraints.forEach(con => {
        const li = document.createElement('li');
        li.innerHTML = con;
        constraintsUl.appendChild(li);
      });
    }

    // Prep-populate Code Editor with Template
    const editorTextArea = document.getElementById('editorTextArea');
    const languageSelect = document.getElementById('languageSelect');
    
    if (editorTextArea && languageSelect) {
      // Helper to update editor tab label based on language
      function updateTabLabel(lang) {
        const tabLabel = document.querySelector('.tab-label');
        if (tabLabel) {
          const extensions = {
            javascript: 'js',
            python: 'py',
            cpp: 'cpp',
            java: 'java'
          };
          const ext = extensions[lang] || 'txt';
          tabLabel.textContent = `solution.${ext}`;
        }
      }

      // Read user settings default language if stored
      const settings = getSettings();
      if (settings && settings.language && prob.templates[settings.language]) {
        languageSelect.value = settings.language;
      }
      
      // Set initial template and tab label
      editorTextArea.value = prob.templates[languageSelect.value];
      updateTabLabel(languageSelect.value);
      
      // Initialize syntax highlighting and line numbers
      updateEditorHighlight();
      
      // Listen for template changes
      languageSelect.addEventListener('change', (e) => {
        const lang = e.target.value;
        updateTabLabel(lang);
        if (prob.templates[lang]) {
          editorTextArea.value = prob.templates[lang];
        } else {
          editorTextArea.value = `// Template not available for language: ${lang}`;
        }
        updateEditorHighlight();
      });

      // Bind dynamic input and scroll listeners
      editorTextArea.addEventListener('input', updateEditorHighlight);
      editorTextArea.addEventListener('scroll', syncEditorScroll);

      // Tab indentation support
      editorTextArea.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          e.preventDefault();
          const start = editorTextArea.selectionStart;
          const end = editorTextArea.selectionEnd;
          const value = editorTextArea.value;
          editorTextArea.value = value.substring(0, start) + "    " + value.substring(end);
          editorTextArea.selectionStart = editorTextArea.selectionEnd = start + 4;
          updateEditorHighlight();
        }
      });
    }

    // Dynamically Render Parameters inside Test Cases Panel (Sample Test Cases)
    const testcasesInputs = document.querySelector('.test-cases-inputs');
    if (testcasesInputs && prob.sampleTestCases) {
      testcasesInputs.innerHTML = '';
      
      prob.sampleTestCases.forEach((tc, caseIdx) => {
        const row = document.createElement('div');
        row.className = 'test-case-row';
        
        let inputsHtml = `<span class="case-label">Case ${caseIdx + 1}</span>`;
        inputsHtml += `<div class="case-inputs">`;
        
        prob.params.forEach((param, pIdx) => {
          const val = tc.args[pIdx];
          const displayVal = typeof val === 'object' ? JSON.stringify(val) : val;
          inputsHtml += `
            <div class="input-param">
              <label>${param} =</label>
              <input type="text" class="param-input-field" data-case="${caseIdx}" data-param="${pIdx}" value='${displayVal}'>
            </div>
          `;
        });
        inputsHtml += `</div>`;
        row.innerHTML = inputsHtml;
        testcasesInputs.appendChild(row);
      });
    }

    // Sync Bookmark Button state
    const editorBookmarkBtn = document.getElementById('editorBookmarkBtn');
    if (editorBookmarkBtn) {
      const svg = editorBookmarkBtn.querySelector('svg');
      const bookmarks = getBookmarks();
      
      if (bookmarks.includes(prob.id)) {
        editorBookmarkBtn.classList.add('active');
        if (svg) svg.setAttribute('fill', 'currentColor');
      }

      editorBookmarkBtn.addEventListener('click', () => {
        const isNowBookmarked = toggleBookmark(prob.id);
        editorBookmarkBtn.classList.toggle('active', isNowBookmarked);
        if (svg) {
          svg.setAttribute('fill', isNowBookmarked ? 'currentColor' : 'none');
        }
      });
    }
  }

  // 2. Tab switching helper
  const tabTestcases = document.getElementById('tabTestcases');
  const tabOutput = document.getElementById('tabOutput');
  const testcasesPanel = document.getElementById('testcasesPanel');
  const outputPanel = document.getElementById('outputPanel');

  function switchTab(activeTab, activePanel, inactiveTab, inactivePanel) {
    activeTab.classList.add('active');
    activePanel.classList.add('active');
    inactiveTab.classList.remove('active');
    inactivePanel.classList.remove('active');
  }

  if (tabTestcases && tabOutput && testcasesPanel && outputPanel) {
    tabTestcases.addEventListener('click', () => {
      switchTab(tabTestcases, testcasesPanel, tabOutput, outputPanel);
    });
    tabOutput.addEventListener('click', () => {
      switchTab(tabOutput, outputPanel, tabTestcases, testcasesPanel);
    });
  }

  // Helper to parse dynamic parameter inputs (in case users modify standard inputs in console)
  function parseInputVal(val) {
    val = val.trim();
    try {
      return JSON.parse(val);
    } catch (e) {
      return val; // Treat as string
    }
  }

  // 3. Execution Engines - Run button
  const runBtn = document.getElementById('runBtn');
  const consoleOutput = document.getElementById('consoleOutput');
  const languageSelect = document.getElementById('languageSelect');
  const editorTextArea = document.getElementById('editorTextArea');

  if (runBtn && consoleOutput) {
    runBtn.addEventListener('click', () => {
      if (!problem) return;
      
      // Open output tab
      switchTab(tabOutput, outputPanel, tabTestcases, testcasesPanel);

      const lang = languageSelect.value;
      const code = editorTextArea.value;

      // Check if running on local file system (Offline/Local preview fallback)
      if (window.location.protocol === 'file:') {
        consoleOutput.innerHTML = `<span class="output-placeholder">Running test cases locally...</span>`;
        setTimeout(() => {
          if (lang !== 'javascript') {
            consoleOutput.innerHTML = `
              <span class="run-stat failed">Backend Offline</span>
              <div class="output-log" style="border-left-color: var(--color-red); color: var(--color-red);">
                Python/C++/Java execution requires a backend connection. Please start the server using <strong>npm start</strong>.
              </div>
            `;
            return;
          }

          // Evaluate JS locally
          try {
            const userFunction = new Function(`${code}\nreturn ${problem.funcName};`)();
            if (typeof userFunction !== 'function') {
              throw new Error(`Function '${problem.funcName}' is not defined.`);
            }

            const results = [];
            problem.sampleTestCases.forEach(tc => {
              const out = userFunction(...tc.args);
              results.push({
                passed: JSON.stringify(out) === JSON.stringify(tc.expected),
                output: out,
                expected: tc.expected,
                durationMs: 1
              });
            });

            let outputHtml = '';
            const passedCount = results.filter(r => r.passed).length;
            const totalCount = results.length;

            if (passedCount === totalCount) {
              outputHtml += `<span class="run-stat passed">✔ Test Cases Passed (${passedCount}/${totalCount})</span>`;
            } else {
              outputHtml += `<span class="run-stat failed">✘ Test Cases Failed (${passedCount}/${totalCount})</span>`;
            }

            outputHtml += `<div class="output-log stdout-log" style="border-left-color:#a855f7;"><strong>⚠️ Offline Sandbox:</strong> Running locally in browser. For sandbox timeout check and stderr logs, run Node.js server.</div>`;

            outputHtml += `<div class="output-log">`;
            results.forEach((r, idx) => {
              outputHtml += `
                <strong>Case ${idx + 1}:</strong> Output: <code>${JSON.stringify(r.output)}</code> | Expected: <code>${JSON.stringify(r.expected)}</code> | ${r.passed ? '<span style="color:#10b981; font-weight:600;">Pass</span>' : '<span style="color:#ef4444; font-weight:600;">Fail</span>'}<br>
              `;
            });
            outputHtml += `</div>`;
            consoleOutput.innerHTML = outputHtml;
          } catch (e) {
            consoleOutput.innerHTML = `
              <span class="run-stat failed">Runtime Error</span>
              <div class="output-log" style="border-left-color: var(--color-red); color: var(--color-red);">
                ${e.message}
              </div>
            `;
          }
        }, 300);
        return;
      }

      consoleOutput.innerHTML = `<span class="output-placeholder">Running test cases in backend sandbox...</span>`;

      // Make request to backend code runner
      fetch(API_BASE_URL + '/api/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          problemId: problem.id,
          language: lang,
          code: code
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          let outputHtml = '';
          const passedCount = data.results.filter(r => r.passed).length;
          const totalCount = data.results.length;

          if (passedCount === totalCount) {
            outputHtml += `<span class="run-stat passed">✔ Test Cases Passed (${passedCount}/${totalCount})</span>`;
          } else {
            outputHtml += `<span class="run-stat failed">✘ Test Cases Failed (${passedCount}/${totalCount})</span>`;
          }

          if (data.userLogs) {
            outputHtml += `<div class="output-log stdout-log"><strong>Console Output:</strong><pre style="margin-top:6px; color:#e2e8f0; font-family:'Fira Code', monospace; white-space:pre-wrap;">${data.userLogs}</pre></div>`;
          }

          outputHtml += `<div class="output-log">`;
          data.results.forEach((r, idx) => {
            outputHtml += `
              <strong>Case ${idx + 1}:</strong> Output: <code>${JSON.stringify(r.output)}</code> | Expected: <code>${JSON.stringify(r.expected)}</code> | ${r.passed ? '<span style="color:#10b981; font-weight:600;">Pass</span>' : '<span style="color:#ef4444; font-weight:600;">Fail</span>'} (${r.durationMs.toFixed(2)} ms)<br>
            `;
          });
          outputHtml += `</div>`;
          consoleOutput.innerHTML = outputHtml;
        } else if (data.status === 'timeout') {
          consoleOutput.innerHTML = `
            <span class="run-stat failed">Time Limit Exceeded</span>
            <div class="output-log" style="border-left-color: var(--color-red); color: var(--color-red);">
              <pre style="margin: 0; font-family: 'Fira Code', monospace; white-space: pre-wrap;">${data.error}</pre>
            </div>
          `;
        } else {
          // Compilation, syntax, or runtime errors
          let errHtml = `<span class="run-stat failed">Runtime / compilation error</span>`;
          if (data.userLogs) {
            errHtml += `<div class="output-log stdout-log"><strong>Console Output:</strong><pre style="margin-top:6px; color:#e2e8f0; font-family:'Fira Code', monospace; white-space:pre-wrap;">${data.userLogs}</pre></div>`;
          }
          errHtml += `
            <div class="output-log" style="border-left-color: var(--color-red); color: var(--color-red);">
              <pre style="margin: 0; font-family: 'Fira Code', monospace; white-space: pre-wrap;">${data.error || 'Unknown execution error'}</pre>
            </div>
          `;
          consoleOutput.innerHTML = errHtml;
        }
      })
      .catch(err => {
        consoleOutput.innerHTML = `
          <span class="run-stat failed">Server Connection Error</span>
          <div class="output-log" style="border-left-color: var(--color-red); color: var(--color-red);">
            Failed to connect to the backend server. Make sure the Node server is running on localhost.
          </div>
        `;
      });
    });
  }

  // 4. Submit Flow Overlay Modal
  const submitBtn = document.getElementById('submitBtn');
  const submitModal = document.getElementById('submitModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');

  if (submitBtn && submitModal) {
    submitBtn.addEventListener('click', () => {
      if (!problem) return;

      switchTab(tabOutput, outputPanel, tabTestcases, testcasesPanel);

      const lang = languageSelect.value;
      const code = editorTextArea.value;

      // Check if running on local file system (Offline/Local preview fallback)
      if (window.location.protocol === 'file:') {
        consoleOutput.innerHTML = `<span class="output-placeholder">Validating solution locally...</span>`;
        setTimeout(() => {
          if (lang !== 'javascript') {
            consoleOutput.innerHTML = `
              <span class="run-stat failed">Backend Offline</span>
              <div class="output-log" style="border-left-color: var(--color-red); color: var(--color-red);">
                Python/C++/Java submission requires a backend connection. Please start the server using <strong>npm start</strong>.
              </div>
            `;
            return;
          }

          try {
            const userFunction = new Function(`${code}\nreturn ${problem.funcName};`)();
            if (typeof userFunction !== 'function') {
              throw new Error(`Function '${problem.funcName}' is not defined.`);
            }

            const results = [];
            problem.sampleTestCases.forEach(tc => {
              const out = userFunction(...tc.args);
              results.push({
                passed: JSON.stringify(out) === JSON.stringify(tc.expected),
                output: out,
                expected: tc.expected,
                durationMs: 1
              });
            });

            const passedCount = results.filter(r => r.passed).length;
            const totalCount = results.length;

            if (passedCount === totalCount) {
              addSolved(problem.id);

              // Persist custom problem solution offline in localStorage
              if (String(problem.id).startsWith('custom_')) {
                const localCustoms = JSON.parse(localStorage.getItem('custom_problems') || '{}');
                if (localCustoms[problem.id]) {
                  if (!localCustoms[problem.id].solutions) {
                    localCustoms[problem.id].solutions = {};
                  }
                  localCustoms[problem.id].solutions[lang] = code;
                  localStorage.setItem('custom_problems', JSON.stringify(localCustoms));
                }
              }

              // Save completed code to localStorage solutions
              const solutions = JSON.parse(localStorage.getItem('cn_solutions') || '{}');
              if (!solutions[problem.id]) {
                solutions[problem.id] = {};
              }
              solutions[problem.id][lang] = code;
              localStorage.setItem('cn_solutions', JSON.stringify(solutions));

              if (typeof syncProfileWithBackend === 'function') {
                syncProfileWithBackend();
              }

              const passedVal = submitModal.querySelector('.stat-box:nth-child(1) .stat-val');
              const runtimeVal = submitModal.querySelector('.stat-box:nth-child(2) .stat-val');
              const memoryVal = submitModal.querySelector('.stat-box:nth-child(3) .stat-val');

              if (passedVal) passedVal.textContent = `${passedCount} / ${totalCount}`;
              if (runtimeVal) runtimeVal.textContent = `1.5 ms`;
              if (memoryVal) memoryVal.textContent = `32.1 MB`;

              consoleOutput.innerHTML = `
                <span class="run-stat passed">✔ Submission Accepted</span>
                <div class="output-log">All sample cases passed locally! Solved status updated.</div>
              `;
              const modalTimeTaken = document.getElementById('modalTimeTaken');
              if (modalTimeTaken) {
                modalTimeTaken.textContent = `Time Taken: ${formatTimeTakenText(elapsedSeconds)}`;
              }
              submitModal.classList.add('show');
            } else {
              const failIdx = results.findIndex(r => !r.passed);
              const failCase = results[failIdx];
              consoleOutput.innerHTML = `
                <span class="run-stat failed">✘ Wrong Answer</span>
                <div class="output-log" style="border-left-color: var(--color-red);">
                  <strong>Status:</strong> <span style="color:#ef4444; font-weight:600;">Wrong Answer</span><br>
                  <strong>Failed on Sample Case:</strong> ${failIdx + 1}<br>
                  <strong>Your Output:</strong> <code style="color:#ef4444;">${JSON.stringify(failCase.output)}</code><br>
                  <strong>Expected Output:</strong> <code style="color:#10b981;">${JSON.stringify(failCase.expected)}</code>
                </div>
              `;
            }
          } catch (e) {
            consoleOutput.innerHTML = `
              <span class="run-stat failed">Compilation / Runtime Error</span>
              <div class="output-log" style="border-left-color: var(--color-red); color: var(--color-red);">
                ${e.message}
              </div>
            `;
          }
        }, 300);
        return;
      }

      consoleOutput.innerHTML = `<span class="output-placeholder">Running all system validation test cases...</span>`;
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.75';

      fetch(API_BASE_URL + '/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          problemId: problem.id,
          language: lang,
          code: code
        })
      })
      .then(res => res.json())
      .then(data => {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';

        if (data.status === 'success') {
          const results = data.results;
          const passedCount = results.filter(r => r.passed).length;
          const totalCount = results.length;

          if (passedCount === totalCount) {
            // Add to solved database
            addSolved(problem.id);

            // Save completed code to localStorage solutions
            const solutions = JSON.parse(localStorage.getItem('cn_solutions') || '{}');
            if (!solutions[problem.id]) {
              solutions[problem.id] = {};
            }
            solutions[problem.id][lang] = code;
            localStorage.setItem('cn_solutions', JSON.stringify(solutions));

            if (typeof syncProfileWithBackend === 'function') {
              syncProfileWithBackend();
            }

            // Compute total/avg runtime
            const totalRuntime = results.reduce((acc, r) => acc + r.durationMs, 0);

            // Set modal values
            const passedVal = submitModal.querySelector('.stat-box:nth-child(1) .stat-val');
            const runtimeVal = submitModal.querySelector('.stat-box:nth-child(2) .stat-val');
            const memoryVal = submitModal.querySelector('.stat-box:nth-child(3) .stat-val');

            if (passedVal) passedVal.textContent = `${passedCount} / ${totalCount}`;
            if (runtimeVal) runtimeVal.textContent = `${totalRuntime.toFixed(1)} ms`;
            if (memoryVal) {
              const mem = (32 + Math.random() * 12).toFixed(1);
              memoryVal.textContent = `${mem} MB`;
            }

            consoleOutput.innerHTML = `
              <span class="run-stat passed">✔ Submission Accepted</span>
              <div class="output-log">All test cases passed successfully! Runtime: ${totalRuntime.toFixed(2)} ms.</div>
            `;
            const modalTimeTaken = document.getElementById('modalTimeTaken');
            if (modalTimeTaken) {
              modalTimeTaken.textContent = `Time Taken: ${formatTimeTakenText(elapsedSeconds)}`;
            }
            submitModal.classList.add('show');
          } else {
            // First failing case details
            const failIdx = results.findIndex(r => !r.passed);
            const failCase = results[failIdx];
            const failInput = problem.systemTestCases && problem.systemTestCases[failIdx] 
              ? JSON.stringify(problem.systemTestCases[failIdx].args) 
              : "Hidden input case";

            consoleOutput.innerHTML = `
              <span class="run-stat failed">✘ Wrong Answer</span>
              <div class="output-log" style="border-left-color: var(--color-red);">
                <strong>Status:</strong> <span style="color:#ef4444; font-weight:600;">Wrong Answer</span><br>
                <strong>Failed on Test Case:</strong> ${failIdx + 1} of ${totalCount}<br>
                <strong>Input:</strong> <code>${failInput}</code><br>
                <strong>Your Output:</strong> <code style="color:#ef4444;">${JSON.stringify(failCase.output)}</code><br>
                <strong>Expected Output:</strong> <code style="color:#10b981;">${JSON.stringify(failCase.expected)}</code>
              </div>
            `;
          }
        } else if (data.status === 'timeout') {
          consoleOutput.innerHTML = `
            <span class="run-stat failed">Time Limit Exceeded</span>
            <div class="output-log" style="border-left-color: var(--color-red); color: var(--color-red);">
              <pre style="margin: 0; font-family: 'Fira Code', monospace; white-space: pre-wrap;">${data.error}</pre>
            </div>
          `;
        } else {
          // Compilation, syntax, or runtime errors
          let errHtml = `<span class="run-stat failed">Compilation / Execution Error</span>`;
          if (data.userLogs) {
            errHtml += `<div class="output-log stdout-log"><strong>Console Output:</strong><pre style="margin-top:6px; color:#e2e8f0; font-family:'Fira Code', monospace; white-space:pre-wrap;">${data.userLogs}</pre></div>`;
          }
          errHtml += `
            <div class="output-log" style="border-left-color: var(--color-red); color: var(--color-red);">
              <pre style="margin: 0; font-family: 'Fira Code', monospace; white-space: pre-wrap;">${data.error || 'Unknown execution error'}</pre>
            </div>
          `;
          consoleOutput.innerHTML = errHtml;
        }
      })
      .catch(err => {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        consoleOutput.innerHTML = `
          <span class="run-stat failed">Server Connection Error</span>
          <div class="output-log" style="border-left-color: var(--color-red); color: var(--color-red);">
            Failed to connect to the backend server. Make sure the Node server is running on localhost.
          </div>
        `;
      });
    });
  }

  if (modalCloseBtn && submitModal) {
    modalCloseBtn.addEventListener('click', () => {
      submitModal.classList.remove('show');
      window.location.href = 'dashboard.html';
    });
  }

  // --- CODING STOPWATCH TIMER CONTROL ---
  const timerDisplay = document.getElementById('timerDisplay');
  const timerPlayPauseBtn = document.getElementById('timerPlayPauseBtn');
  const timerControlIcon = document.getElementById('timerControlIcon');

  if (timerPlayPauseBtn) {
    timerPlayPauseBtn.addEventListener('click', () => {
      if (isTimerPaused) {
        isTimerPaused = false;
        timerPlayPauseBtn.setAttribute('aria-label', 'Pause timer');
        if (timerControlIcon) {
          timerControlIcon.innerHTML = `<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>`;
        }
      } else {
        isTimerPaused = true;
        timerPlayPauseBtn.setAttribute('aria-label', 'Start timer');
        if (timerControlIcon) {
          timerControlIcon.innerHTML = `<polygon points="5 3 19 12 5 21 5 3"/>`;
        }
      }
    });
  }

  // --- PROBLEMS SIDEBAR & NAVIGATION ARROWS LOGIC ---
  let allProblemsList = [];

  function loadSidebarProblems() {
    fetch(API_BASE_URL + '/api/problems')
      .then(res => res.json())
      .then(problems => {
        allProblemsList = problems;
        renderSidebarList(problems);
        updateNavArrowsState();
      })
      .catch(err => {
        console.warn('API error, loading fallback list:', err);
        let list = [...FALLBACK_PROBLEMS];
        try {
          const customs = safeJsonParse(safeLocalStorage.getItem('custom_problems'), {});
          Object.values(customs).forEach(p => {
            if (!list.some(x => x.id === p.id)) {
              list.push(p);
            }
          });
        } catch (e) {}
        allProblemsList = list;
        renderSidebarList(list);
        updateNavArrowsState();
      });
  }

  function renderSidebarList(list) {
    const listContainer = document.getElementById('sidebarProblemsList');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    const solvedList = getSolved() || [];
    
    const sorted = [...list].sort((a, b) => {
      const aNum = isNaN(a.id) ? 999999 : Number(a.id);
      const bNum = isNaN(b.id) ? 999999 : Number(b.id);
      return aNum - bNum;
    });

    sorted.forEach(p => {
      const item = document.createElement('div');
      item.className = `sidebar-problem-item${String(p.id) === String(problemId) ? ' active' : ''}`;
      item.setAttribute('data-id', p.id);

      const isSolved = solvedList.includes(p.id) || solvedList.includes(Number(p.id)) || solvedList.includes(String(p.id));
      const checkmark = isSolved ? '✔' : '&nbsp;&nbsp;';
      
      const diff = (p.difficulty || 'easy').toLowerCase();
      const diffText = p.difficultyText || p.difficulty || 'Easy';

      item.innerHTML = `
        <div class="problem-info-left">
          <span class="checkmark-icon">${checkmark}</span>
          <span class="problem-title-text">${p.id}. ${p.title}</span>
        </div>
        <span class="problem-diff-badge diff-val-${diff}">${diffText}</span>
      `;

      item.addEventListener('click', () => {
        switchProblem(p.id);
      });

      listContainer.appendChild(item);
    });
  }

  function updateNavArrowsState() {
    if (!allProblemsList || allProblemsList.length === 0) return;
    
    allProblemsList.sort((a, b) => {
      const aNum = isNaN(a.id) ? 999999 : Number(a.id);
      const bNum = isNaN(b.id) ? 999999 : Number(b.id);
      return aNum - bNum;
    });

    const currentIndex = allProblemsList.findIndex(p => String(p.id) === String(problemId));
    
    const prevBtn = document.getElementById('prevProblemBtn');
    const nextBtn = document.getElementById('nextProblemBtn');
    const modalNext = document.getElementById('modalNextBtn');

    if (prevBtn) {
      if (currentIndex > 0) {
        prevBtn.disabled = false;
        prevBtn.onclick = () => {
          const prevProb = allProblemsList[currentIndex - 1];
          switchProblem(prevProb.id);
        };
      } else {
        prevBtn.disabled = true;
      }
    }

    if (nextBtn) {
      if (currentIndex >= 0 && currentIndex < allProblemsList.length - 1) {
        nextBtn.disabled = false;
        nextBtn.onclick = () => {
          const nextProb = allProblemsList[currentIndex + 1];
          switchProblem(nextProb.id);
        };
      } else {
        nextBtn.disabled = true;
      }
    }

    if (modalNext) {
      if (currentIndex >= 0 && currentIndex < allProblemsList.length - 1) {
        modalNext.textContent = "Next Problem";
        modalNext.onclick = () => {
          const nextProb = allProblemsList[currentIndex + 1];
          switchProblem(nextProb.id);
        };
      } else {
        modalNext.textContent = "Back to Dashboard";
        modalNext.onclick = () => {
          window.location.href = "dashboard.html";
        };
      }
    }
  }

  // Silk-smooth SPA Transition Engine
  function switchProblem(targetId) {
    if (problemsSidebar) {
      problemsSidebar.classList.remove('show');
    }
    if (submitModal) {
      submitModal.classList.remove('show');
    }

    // Update active state parameter
    const rawId = targetId;
    problemId = isNaN(rawId) ? rawId : Number(rawId);
    
    // Update URL bar without reload
    history.pushState(null, '', `editor.html?id=${problemId}`);

    // Reset console output state
    const consoleOutput = document.getElementById('consoleOutput');
    if (consoleOutput) {
      consoleOutput.innerHTML = `<span class="output-placeholder">Run code to see execution output...</span>`;
    }
    const tabTestcases = document.getElementById('tabTestcases');
    const tabOutput = document.getElementById('tabOutput');
    const testcasesPanel = document.getElementById('testcasesPanel');
    const outputPanel = document.getElementById('outputPanel');
    if (tabTestcases && tabOutput && testcasesPanel && outputPanel) {
      switchTab(tabTestcases, testcasesPanel, tabOutput, outputPanel);
    }

    // Fetch and render dynamically
    fetch(`${API_BASE_URL}/api/problems/${problemId}`)
      .then(response => {
        if (!response.ok) throw new Error('Problem not found');
        return response.json();
      })
      .then(data => {
        problem = data;
        renderProblem(problem);
        updateNavArrowsState();
        
        // Render active item states in sidebar
        const items = document.querySelectorAll('.sidebar-problem-item');
        items.forEach(item => {
          const itemId = item.getAttribute('data-id');
          if (String(itemId) === String(problemId)) {
            item.classList.add('active');
          } else {
            item.classList.remove('active');
          }
        });
      })
      .catch(err => {
        console.warn('Failed to fetch from API, falling back to local database:', err);
        let localProblem = FALLBACK_PROBLEMS.find(p => p.id === problemId);
        if (!localProblem) {
          const localCustoms = safeJsonParse(safeLocalStorage.getItem('custom_problems'), {});
          localProblem = localCustoms[problemId];
        }

        if (localProblem) {
          problem = localProblem;
          renderProblem(problem);
          updateNavArrowsState();
          
          const items = document.querySelectorAll('.sidebar-problem-item');
          items.forEach(item => {
            const itemId = item.getAttribute('data-id');
            if (String(itemId) === String(problemId)) {
              item.classList.add('active');
            } else {
              item.classList.remove('active');
            }
          });
        } else {
          alert("Problem not found!");
        }
      });
  }

  // Browser History Back/Forward Handler
  window.onpopstate = () => {
    const params = new URLSearchParams(window.location.search);
    const targetId = params.get('id') || "1";
    switchProblem(targetId);
  };

  // Sidebar Toggles
  const problemsSidebarToggle = document.getElementById('problemsSidebarToggle');
  const problemsSidebar = document.getElementById('problemsSidebar');
  const closeSidebarBtn = document.getElementById('closeSidebarBtn');

  if (problemsSidebarToggle && problemsSidebar) {
    problemsSidebarToggle.addEventListener('click', () => {
      problemsSidebar.classList.toggle('show');
      if (problemsSidebar.classList.contains('show')) {
        renderSidebarList(allProblemsList);
      }
    });
  }

  if (closeSidebarBtn && problemsSidebar) {
    closeSidebarBtn.addEventListener('click', () => {
      problemsSidebar.classList.remove('show');
    });
  }

  // Close sidebar clicking outside
  document.addEventListener('click', (e) => {
    if (problemsSidebar && problemsSidebar.classList.contains('show')) {
      if (!problemsSidebar.contains(e.target) && !problemsSidebarToggle.contains(e.target)) {
        problemsSidebar.classList.remove('show');
      }
    }
  });

  // Search Filter
  const sidebarSearchInput = document.getElementById('sidebarSearchInput');
  if (sidebarSearchInput) {
    sidebarSearchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      const filtered = allProblemsList.filter(p => 
        String(p.id).toLowerCase().includes(query) || 
        p.title.toLowerCase().includes(query)
      );
      renderSidebarList(filtered);
    });
  }

  // Modal stay on page control
  const modalStayBtn = document.getElementById('modalStayBtn');
  if (modalStayBtn && submitModal) {
    modalStayBtn.addEventListener('click', () => {
      submitModal.classList.remove('show');
    });
  }

  // Kick off dynamic list and arrows preparation
  loadSidebarProblems();
});
