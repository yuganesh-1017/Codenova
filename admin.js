// admin.js
// Controller for CodeNova Admin Control Center

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const tabUsersBtn = document.getElementById('tabUsersBtn');
  const tabForgeBtn = document.getElementById('tabForgeBtn');
  
  const usersPanel = document.getElementById('usersPanel');
  const forgePanel = document.getElementById('forgePanel');
  
  const userTableBody = document.getElementById('userTableBody');
  
  const inspectorPlaceholder = document.getElementById('inspectorPlaceholder');
  const inspectorDetails = document.getElementById('inspectorDetails');
  
  const inspectUserName = document.getElementById('inspectUserName');
  const inspectUserEmail = document.getElementById('inspectUserEmail');
  const inspectUserNick = document.getElementById('inspectUserNick');
  
  const inspectorCompletedCodes = document.getElementById('inspectorCompletedCodes');
  const inspectorCreatedProblems = document.getElementById('inspectorCreatedProblems');
  
  // Forge Elements
  const globalProblemForm = document.getElementById('globalProblemForm');
  const parameterGridContainer = document.getElementById('parameterGridContainer');
  const addParamBtn = document.getElementById('addParamBtn');
  const testCasesContainer = document.getElementById('testCasesContainer');
  const addTestCaseBtn = document.getElementById('addTestCaseBtn');

  let usersList = [];
  let problemsList = [];

  // Initialize
  const adminToken = sessionStorage.getItem('cn_admin_token');
  if (!adminToken) {
    window.location.href = 'admin_login.html';
    return;
  }

  fetchProblemsAndUsers();
  setupTabs();
  setupForgeForm();

  // 1. Fetch data from backend
  function fetchProblemsAndUsers() {
    // Load standard problems to resolve names in codes inspector
    fetch(API_BASE_URL + '/api/problems')
      .then(res => res.json())
      .then(probs => {
        problemsList = probs;
        loadUsers();
      })
      .catch(() => {
        // Fallback standard problems
        if (typeof FALLBACK_PROBLEMS !== 'undefined') {
          problemsList = FALLBACK_PROBLEMS;
        }
        loadUsers();
      });
  }

  function loadUsers() {
    fetch(API_BASE_URL + '/api/users', {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    })
      .then(res => {
        if (res.status === 403) {
          sessionStorage.removeItem('cn_admin_token');
          window.location.href = 'admin_login.html';
          throw new Error('Access expired or unauthorized');
        }
        return res.json();
      })
      .then(usersData => {
        usersList = usersData;
        renderUsersTable();
      })
      .catch(err => {
        console.error('Failed to load users from API:', err);
        userTableBody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; color: var(--color-red); padding: 30px;">
              Backend server connection offline. Start the server using <strong>npm start</strong> to sync and view user details.
            </td>
          </tr>
        `;
      });
  }

  // 2. Render Users list
  function renderUsersTable() {
    if (usersList.length === 0) {
      userTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 30px;">
            No users synced yet. Solves/profiles will sync here when users sign in and complete problems.
          </td>
        </tr>
      `;
      return;
    }

    userTableBody.innerHTML = '';
    usersList.forEach((user, idx) => {
      const solvedCount = user.solved ? user.solved.length : 0;
      const createdCount = user.customProblems ? user.customProblems.length : 0;
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${user.name || 'Hey Coder'}</strong></td>
        <td>${user.email}</td>
        <td style="text-align: center;"><span style="color: var(--color-purple); font-weight:600;">${solvedCount}</span></td>
        <td style="text-align: center;"><span style="color: var(--color-pink); font-weight:600;">${createdCount}</span></td>
        <td style="text-align: right;">
          <button class="inspect-btn" data-idx="${idx}">Inspect</button>
        </td>
      `;

      tr.querySelector('button').addEventListener('click', () => inspectUser(idx));
      userTableBody.appendChild(tr);
    });
  }

  // 3. Inspect specific user details
  function inspectUser(idx) {
    const user = usersList[idx];
    if (!user) return;

    // Show panel
    inspectorPlaceholder.style.display = 'none';
    inspectorDetails.style.display = 'block';

    // Populate profile cards
    inspectUserName.textContent = user.name || 'Hey Coder';
    inspectUserEmail.textContent = user.email;
    inspectUserNick.textContent = user.username || 'coder128';

    // Populate completed codes accordion
    inspectorCompletedCodes.innerHTML = '';
    const solvedIds = user.solved || [];
    const solutions = user.solutions || {};

    if (solvedIds.length === 0) {
      inspectorCompletedCodes.innerHTML = `
        <div style="font-size: 13px; color: var(--text-muted); padding: 12px 0;">
          This user has not submitted any solutions yet.
        </div>
      `;
    } else {
      solvedIds.forEach(id => {
        // Resolve problem details
        let name = `Challenge #${id}`;
        let matches = problemsList.find(p => String(p.id) === String(id));
        if (matches) {
          name = matches.title;
        } else {
          // Check in user's custom list
          const customMatches = user.customProblems ? user.customProblems.find(p => String(p.id) === String(id)) : null;
          if (customMatches) {
            name = `[Memory] ${customMatches.title}`;
          }
        }

        const codesForProb = solutions[id] || {};
        const langs = Object.keys(codesForProb);

        if (langs.length > 0) {
          const item = document.createElement('div');
          item.className = 'code-accordion-item';
          
          let langSelector = '';
          langs.forEach((lang, lIdx) => {
            langSelector += `<span class="inspect-btn" style="padding: 2px 6px; font-size: 11px; margin-left: 4px; background:${lIdx === 0 ? 'var(--grad-btn)' : 'rgba(255,255,255,0.05)'}; color:white; border-color:transparent;" data-lang="${lang}">${lang.toUpperCase()}</span>`;
          });

          item.innerHTML = `
            <div class="code-accordion-header">
              <span>${name}</span>
              <div>${langSelector}</div>
            </div>
            <div class="code-accordion-content">
              <pre><code>${escapeHtml(codesForProb[langs[0]])}</code></pre>
            </div>
          `;

          // Accordion toggle click handler
          const header = item.querySelector('.code-accordion-header');
          const content = item.querySelector('.code-accordion-content');
          header.addEventListener('click', (e) => {
            if (e.target.tagName === 'SPAN') return; // Skip if clicked language select tab
            const isOpen = content.style.display === 'block';
            content.style.display = isOpen ? 'none' : 'block';
          });

          // Language switcher tabs handlers
          const langTabs = item.querySelectorAll('.code-accordion-header span');
          langTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
              e.stopPropagation();
              langTabs.forEach(t => t.style.background = 'rgba(255,255,255,0.05)');
              tab.style.background = 'var(--grad-btn)';
              const selectedLang = tab.getAttribute('data-lang');
              content.querySelector('pre code').textContent = codesForProb[selectedLang];
              content.style.display = 'block';
            });
          });

          inspectorCompletedCodes.appendChild(item);
        }
      });
    }

    // Populate created private questions list
    inspectorCreatedProblems.innerHTML = '';
    const customs = user.customProblems || [];
    if (customs.length === 0) {
      inspectorCreatedProblems.innerHTML = `
        <div style="font-size: 13px; color: var(--text-muted); padding: 12px 0;">
          This user has not created any private memory challenges.
        </div>
      `;
    } else {
      customs.forEach(p => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.padding = '10px 14px';
        row.style.background = 'rgba(255, 255, 255, 0.015)';
        row.style.border = '1px solid rgba(255, 255, 255, 0.04)';
        row.style.borderRadius = '8px';
        row.style.marginBottom = '8px';
        row.style.fontSize = '13px';

        const diffText = (p.difficulty || 'Easy').toUpperCase();
        row.innerHTML = `
          <span><strong>${p.title}</strong> <span style="font-size:10.5px; color:var(--text-muted); margin-left:6px;">(${p.id})</span></span>
          <span class="badge diff-${p.difficulty || 'easy'}" style="font-size:10px; padding:2px 6px;">${diffText}</span>
        `;
        inspectorCreatedProblems.appendChild(row);
      });
    }
  }

  // Helper helper
  function escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // 4. Tab Setup Toggles
  function setupTabs() {
    tabUsersBtn.addEventListener('click', () => {
      tabUsersBtn.classList.add('active');
      tabForgeBtn.classList.remove('active');
      usersPanel.style.display = 'block';
      forgePanel.style.display = 'none';
    });

    tabForgeBtn.addEventListener('click', () => {
      tabForgeBtn.classList.add('active');
      tabUsersBtn.classList.remove('active');
      forgePanel.style.display = 'block';
      usersPanel.style.display = 'none';
    });
  }

  // 5. Forge Question Form controller
  function setupForgeForm() {
    // Toggle parameter input groups visibility when return type is console-io
    const problemRetTypeSelect = document.getElementById('problemRetType');
    const problemFuncNameInput = document.getElementById('problemFuncName');
    const problemFuncNameGroup = problemFuncNameInput.closest('.form-group');
    const paramSectionGroup = addParamBtn.closest('.form-group');

    problemRetTypeSelect.addEventListener('change', () => {
      if (problemRetTypeSelect.value === 'console-io') {
        problemFuncNameGroup.style.display = 'none';
        paramSectionGroup.style.display = 'none';
        problemFuncNameInput.required = false;
        problemFuncNameInput.value = 'main';
        // Clear all parameters except one dummy parameter for input text
        parameterGridContainer.innerHTML = `
          <div class="grid-row-3" style="display:none;">
            <input type="text" placeholder="Param name" class="param-name" value="stdin">
            <select class="param-type">
              <option value="json" selected>json</option>
            </select>
          </div>
        `;
        syncTestCasesInputs();
        const expectedInputs = testCasesContainer.querySelectorAll('.expected-output-input');
        expectedInputs.forEach(input => {
          input.placeholder = "Expected console output";
        });
      } else {
        problemFuncNameGroup.style.display = 'block';
        paramSectionGroup.style.display = 'block';
        problemFuncNameInput.required = true;
        if (problemFuncNameInput.value === 'main') {
          problemFuncNameInput.value = '';
        }
        // Restore default param row if empty
        if (parameterGridContainer.querySelectorAll('.grid-row-3').length === 0) {
          parameterGridContainer.innerHTML = `
            <div class="grid-row-3">
              <input type="text" placeholder="Param name (e.g. nums)" class="param-name" required>
              <select class="param-type">
                <option value="vector<int>">vector&lt;int&gt;</option>
                <option value="int">int</option>
                <option value="double">double</option>
                <option value="string">string</option>
                <option value="bool">bool</option>
                <option value="vector<string>">vector&lt;string&gt;</option>
                <option value="vector<vector<int>>">vector&lt;vector&lt;int&gt;&gt;</option>
                <option value="vector<vector<string>>">vector&lt;vector&lt;string&gt;&gt;</option>
                <option value="ListNode">ListNode</option>
                <option value="TreeNode">TreeNode</option>
                <option value="map">map</option>
                <option value="json">json</option>
              </select>
              <button type="button" class="inspect-btn delete-param-btn" style="background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); color: #f87171;">Delete</button>
            </div>
          `;
          const defaultDelete = parameterGridContainer.querySelector('.delete-param-btn');
          if (defaultDelete) {
            defaultDelete.addEventListener('click', (e) => {
              e.target.closest('.grid-row-3').remove();
              syncTestCasesHeader();
            });
          }
        }
        syncTestCasesInputs();
      }
    });

    // Add dynamic parameters
    addParamBtn.addEventListener('click', () => {
      const row = document.createElement('div');
      row.className = 'grid-row-3';
      row.innerHTML = `
        <input type="text" placeholder="Param name (e.g. key)" class="param-name" required>
        <select class="param-type">
          <option value="int">int</option>
          <option value="double">double</option>
          <option value="string">string</option>
          <option value="bool">bool</option>
          <option value="vector<int>">vector&lt;int&gt;</option>
          <option value="vector<string>">vector&lt;string&gt;</option>
          <option value="vector<vector<int>>">vector&lt;vector&lt;int&gt;&gt;</option>
          <option value="vector<vector<string>>">vector&lt;vector&lt;string&gt;&gt;</option>
          <option value="ListNode">ListNode</option>
          <option value="TreeNode">TreeNode</option>
          <option value="map">map</option>
          <option value="json">json</option>
        </select>
        <button type="button" class="inspect-btn delete-param-btn" style="background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); color: #f87171;">Delete</button>
      `;

      row.querySelector('.delete-param-btn').addEventListener('click', () => {
        row.remove();
        syncTestCasesHeader();
      });

      parameterGridContainer.appendChild(row);
      syncTestCasesHeader();
    });

    // Default parameter row delete handler
    const defaultDelete = parameterGridContainer.querySelector('.delete-param-btn');
    if (defaultDelete) {
      defaultDelete.addEventListener('click', (e) => {
        e.target.closest('.grid-row-3').remove();
        syncTestCasesHeader();
      });
    }

    // Add Dynamic Test Cases
    addTestCaseBtn.addEventListener('click', () => {
      addTestCaseRow();
    });

    // Start with 1 default test case
    addTestCaseRow();

    function addTestCaseRow() {
      const row = document.createElement('div');
      row.className = 'test-case-row';
      row.style.background = 'rgba(255, 255, 255, 0.01)';
      row.style.border = '1px solid rgba(255, 255, 255, 0.04)';
      row.style.borderRadius = '8px';
      row.style.padding = '12px';
      row.style.display = 'flex';
      row.style.flexDirection = 'column';
      row.style.gap = '8px';

      const paramInputsContainer = document.createElement('div');
      paramInputsContainer.className = 'param-inputs-container';
      paramInputsContainer.style.display = 'grid';
      paramInputsContainer.style.gridTemplateColumns = 'repeat(auto-fit, minmax(120px, 1fr))';
      paramInputsContainer.style.gap = '8px';

      row.appendChild(paramInputsContainer);

      // Add Expected Output block
      const outputBlock = document.createElement('div');
      outputBlock.style.display = 'flex';
      outputBlock.style.gap = '12px';
      outputBlock.style.alignItems = 'flex-end';
      outputBlock.innerHTML = `
        <div style="flex: 1;">
          <label style="font-size: 11px; font-weight:600; color:var(--text-dimmed); text-transform:uppercase;">Expected Return Value</label>
          <input type="text" class="expected-output-input" placeholder="e.g. 42 or [1,2]" required style="margin-top:4px;">
        </div>
        <button type="button" class="inspect-btn delete-tc-btn" style="height:38px; background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); color: #f87171;">Delete Case</button>
      `;

      row.appendChild(outputBlock);

      row.querySelector('.delete-tc-btn').addEventListener('click', () => {
        row.remove();
      });

      testCasesContainer.appendChild(row);
      syncTestCasesInputs();
    }

    function syncTestCasesHeader() {
      syncTestCasesInputs();
    }

    function syncTestCasesInputs() {
      const paramNames = Array.from(parameterGridContainer.querySelectorAll('.param-name')).map(el => el.value.trim() || 'arg');
      const testCaseRows = testCasesContainer.querySelectorAll('.test-case-row');
      
      testCaseRows.forEach(row => {
        const paramContainer = row.querySelector('.param-inputs-container');
        const existingInputs = Array.from(paramContainer.querySelectorAll('input'));
        
        paramContainer.innerHTML = '';
        paramNames.forEach((name, idx) => {
          const div = document.createElement('div');
          div.innerHTML = `
            <label style="font-size: 11px; font-weight:600; color:var(--text-dimmed); text-transform:uppercase;">Input: ${name}</label>
            <input type="text" placeholder="Value (e.g. 5)" required style="margin-top:4px;" class="tc-param-input" data-param-idx="${idx}">
          `;
          
          // Restore value if existed
          if (existingInputs[idx]) {
            div.querySelector('input').value = existingInputs[idx].value;
          }
          paramContainer.appendChild(div);
        });
      });
    }

    // Sync input titles as admin typing param names
    parameterGridContainer.addEventListener('input', (e) => {
      if (e.target.classList.contains('param-name')) {
        syncTestCasesInputs();
      }
    });

    // Form Submit: POST Admin Challenge
    globalProblemForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const title = document.getElementById('problemTitle').value.trim();
      const difficulty = document.getElementById('problemDifficulty').value;
      const category = document.getElementById('problemCategory').value;
      const description = document.getElementById('problemDescription').value.trim();
      const funcName = document.getElementById('problemFuncName').value.trim();
      const retType = document.getElementById('problemRetType').value;

      // Extract parameters details
      const paramRows = parameterGridContainer.querySelectorAll('.grid-row-3');
      const params = [];
      const argTypes = [];

      paramRows.forEach(row => {
        const pName = row.querySelector('.param-name').value.trim();
        const pType = row.querySelector('.param-type').value;
        if (pName) {
          params.push(pName);
          argTypes.push(pType);
        }
      });

      if (params.length === 0) {
        alert("Please define at least one parameter for the global function signature.");
        return;
      }

      // Extract test cases details
      const tcRows = testCasesContainer.querySelectorAll('.test-case-row');
      function smartParse(val, type) {
        val = val.trim();
        if (type === 'int') {
          const num = Number(val);
          if (isNaN(num)) throw new Error(`Invalid integer value "${val}"`);
          return num;
        }
        if (type === 'double') {
          const num = parseFloat(val);
          if (isNaN(num)) throw new Error(`Invalid double value "${val}"`);
          return num;
        }
        if (type === 'bool') {
          return val.toLowerCase() === 'true';
        }
        if (type === 'string') {
          // Strip surrounding single/double quotes if present
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            return val.slice(1, -1);
          }
          return val;
        }
        if (type === 'vector<int>') {
          try {
            const cleaned = val.replace(/'/g, '"');
            return JSON.parse(cleaned);
          } catch (e) {
            const arr = val.replace(/[\[\]]/g, '').split(',').map(s => s.trim()).filter(Boolean).map(Number);
            if (arr.some(isNaN)) throw new Error(`Invalid integer array format: "${val}"`);
            return arr;
          }
        }
        if (type === 'vector<string>') {
          try {
            const cleaned = val.replace(/'/g, '"');
            return JSON.parse(cleaned);
          } catch (e) {
            return val.replace(/[\[\]]/g, '').split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
          }
        }
        if (type === 'vector<vector<int>>' || type === 'vector<vector<string>>') {
          try {
            const cleaned = val.replace(/'/g, '"');
            return JSON.parse(cleaned);
          } catch (e) {
            throw new Error(`Invalid 2D array format: "${val}"`);
          }
        }
        if (type === 'ListNode' || type === 'TreeNode') {
          try {
            const cleaned = val.replace(/'/g, '"');
            return JSON.parse(cleaned);
          } catch (e) {
            throw new Error(`Invalid Node array format: "${val}"`);
          }
        }
        if (type === 'map' || type === 'json') {
          try {
            const cleaned = val.replace(/'/g, '"');
            return JSON.parse(cleaned);
          } catch (e) {
            if (type === 'json' && !val.startsWith('{') && !val.startsWith('[')) {
              return val;
            }
            throw new Error(`Invalid JSON format: "${val}"`);
          }
        }
        
        try {
          return JSON.parse(val);
        } catch (e) {
          return val;
        }
      }

      const testCases = [];

      try {
        tcRows.forEach((row, idx) => {
          const inputEls = Array.from(row.querySelectorAll('.tc-param-input'));
          const args = [];
          
          inputEls.forEach((input, paramIdx) => {
            const rawVal = input.value.trim();
            const paramType = argTypes[paramIdx];
            args.push(smartParse(rawVal, paramType));
          });

          const rawExpected = row.querySelector('.expected-output-input').value.trim();
          const expected = smartParse(rawExpected, retType);

          testCases.push({ args, expected });
        });
      } catch (err) {
        alert("Failed to parse test case values: " + err.message);
        return;
      }

      if (testCases.length === 0) {
        alert("Please add at least one test case.");
        return;
      }

      // Submit global question to backend
      const payload = {
        title,
        difficulty,
        category,
        description,
        funcName,
        params,
        argTypes,
        retType,
        sampleTestCases: testCases,
        systemTestCases: testCases
      };

      fetch(API_BASE_URL + '/api/admin/problems', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify(payload)
      })
      .then(res => {
        if (res.status === 403) {
          sessionStorage.removeItem('cn_admin_token');
          window.location.href = 'admin_login.html';
          throw new Error('Access expired or unauthorized');
        }
        return res.json();
      })
      .then(data => {
        if (data.success) {
          alert(`Global problem "${title}" successfully published to the main catalog!`);
          globalProblemForm.reset();
          parameterGridContainer.innerHTML = '';
          testCasesContainer.innerHTML = '';
          addTestCaseRow();
          
          // Switch back to users list
          tabUsersBtn.click();
          fetchProblemsAndUsers();
        } else {
          alert(`Failed to save problem: ${data.error || 'Server error'}`);
        }
      })
      .catch(err => {
        console.error('Forge submit error:', err);
        alert("Failed to connect to the backend server to publish the problem.");
      });
    });
  }
});
