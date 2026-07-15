// storage.js
// Shared storage logic for CodeNova platform

// Safe JSON parser to prevent crashing on corrupt localStorage strings
function safeJsonParse(str, fallback) {
  try {
    return JSON.parse(str) || fallback;
  } catch (e) {
    return fallback;
  }
}

// Safe LocalStorage wrapper to prevent crashes in incognito/strict browser modes
const safeLocalStorage = {
  getItem(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      if (!window.cn_memory_storage) window.cn_memory_storage = {};
      return window.cn_memory_storage[key] || null;
    }
  },
  setItem(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      if (!window.cn_memory_storage) window.cn_memory_storage = {};
      window.cn_memory_storage[key] = value;
    }
  }
};

// Global Error Catching Overlay Banner
// Simple auth gate:
const pathName = window.location.pathname;
const isAuthPage = pathName === '/' || 
                   pathName.endsWith('index.html') || 
                   pathName.endsWith('signup.html');
if (!safeLocalStorage.getItem('cn_profile') && !isAuthPage) {
  window.location.href = 'index.html';
}

// Default Data
const DEFAULT_PROFILE = {
  name: "Hey Coder!",
  username: "coder128",
  email: "coder@codenova.com",
  bio: "Passionate developer on a coding journey."
};

const DEFAULT_BOOKMARKS = [1, 5, 8]; // Default bookmarked problem IDs

// Initialize Storage
function initStorage() {
  if (!safeLocalStorage.getItem('cn_profile')) {
    safeLocalStorage.setItem('cn_profile', JSON.stringify(DEFAULT_PROFILE));
  }
  if (!safeLocalStorage.getItem('cn_bookmarks')) {
    safeLocalStorage.setItem('cn_bookmarks', JSON.stringify(DEFAULT_BOOKMARKS));
  }
  if (!safeLocalStorage.getItem('cn_solved')) {
    safeLocalStorage.setItem('cn_solved', JSON.stringify([]));
  }
  if (!safeLocalStorage.getItem('cn_settings')) {
    safeLocalStorage.setItem('cn_settings', JSON.stringify({
      language: 'javascript',
      notifications: true,
      privacy: 'public',
      theme: 'dark'
    }));
  }
}

// Get Data
function getProfile() {
  initStorage();
  return safeJsonParse(safeLocalStorage.getItem('cn_profile'), null);
}

function getBookmarks() {
  initStorage();
  return safeJsonParse(safeLocalStorage.getItem('cn_bookmarks'), []);
}

function getSolved() {
  initStorage();
  return safeJsonParse(safeLocalStorage.getItem('cn_solved'), []) || [];
}

function addSolved(id) {
  initStorage();
  const solved = getSolved();
  const numId = isNaN(id) ? id : Number(id);
  if (!solved.includes(numId)) {
    solved.push(numId);
    safeLocalStorage.setItem('cn_solved', JSON.stringify(solved));
    
    // Add today's date to solved dates list
    const todayStr = new Date().toDateString();
    const solvedDates = safeJsonParse(safeLocalStorage.getItem('cn_solved_dates'), []);
    if (!solvedDates.includes(todayStr)) {
      solvedDates.push(todayStr);
      safeLocalStorage.setItem('cn_solved_dates', JSON.stringify(solvedDates));
    }

    // Update Streak logic on profile
    const profile = getProfile();
    if (profile) {
      if (profile.lastSolvedDate !== todayStr) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (profile.lastSolvedDate === yesterday.toDateString()) {
          profile.streak = (profile.streak || 0) + 1;
        } else {
          profile.streak = 1;
        }
        profile.lastSolvedDate = todayStr;
        safeLocalStorage.setItem('cn_profile', JSON.stringify(profile));
      }
    }

    updateSyncedUI();
    syncProfileWithBackend();
  }
}

function getSettings() {
  initStorage();
  return safeJsonParse(safeLocalStorage.getItem('cn_settings'), null);
}

// Set Data
function saveProfile(profile) {
  safeLocalStorage.setItem('cn_profile', JSON.stringify(profile));
  updateSyncedUI();
  syncProfileWithBackend();
}

// Update specific profile name only
function updateProfileName(newName) {
  const profile = getProfile();
  profile.name = newName;
  saveProfile(profile);
}

function saveSettings(settings) {
  safeLocalStorage.setItem('cn_settings', JSON.stringify(settings));
  updateSyncedUI();
}

function toggleBookmark(id) {
  const bookmarks = getBookmarks();
  const numId = Number(id);
  const index = bookmarks.indexOf(numId);
  if (index === -1) {
    bookmarks.push(numId);
  } else {
    bookmarks.splice(index, 1);
  }
  safeLocalStorage.setItem('cn_bookmarks', JSON.stringify(bookmarks));
  return bookmarks.includes(numId);
}

// Sync global header elements across pages
// Sync global header elements across pages
function updateSyncedUI() {
  initStorage();
  const profile = getProfile() || { name: "Coder", username: "coder" };
  
  // Set theme class on body if settings theme is configured
  const settings = getSettings() || { theme: 'dark' };
  const themes = ['light', 'nord', 'dracula', 'crt', 'indigo'];
  themes.forEach(t => document.body.classList.remove(`${t}-theme`));
  if (settings.theme && settings.theme !== 'dark') {
    document.body.classList.add(`${settings.theme}-theme`);
  }

  
  // Update header greeting if present on dashboard
  const greetingEl = document.querySelector('.banner-greeting');
  if (greetingEl) {
    let greetingText = profile.name || profile.username || "Coder";
    if (!greetingText.toLowerCase().startsWith('hey')) {
      greetingText = "Hey " + greetingText;
    }
    // Check for emoji
    if (!greetingText.includes('👋')) {
      greetingText = greetingText + " 👋";
    }
    greetingEl.textContent = greetingText;
  }

  // Update profile name text in header tooltips if any
  const profileAvatar = document.querySelector('.profile-avatar');
  if (profileAvatar) {
    profileAvatar.title = profile.username || "Profile";
  }

  // Update live stats if tags are present
  const streakCountEl = document.getElementById('header-streak-count');
  if (streakCountEl) {
    streakCountEl.textContent = profile.streak || 0;
  }
  
  const xpCountEl = document.getElementById('profile-xp');
  const rankCountEl = document.getElementById('profile-rank');
  const profileStreakEl = document.getElementById('profile-streak');
  if (xpCountEl || rankCountEl || profileStreakEl) {
    const xp = (getSolved().length * 10);
    const rank = Math.max(1, 15000 - xp * 5);
    if (xpCountEl) xpCountEl.textContent = xp.toLocaleString() + " Coding XP";
    if (rankCountEl) rankCountEl.textContent = "#" + rank.toLocaleString();
    if (profileStreakEl) profileStreakEl.textContent = profile.streak || 0;
  }


  // --- LIVE STATS & PROGRESS TRACKER ---
  const solved = getSolved();
  let easySolved = 0, mediumSolved = 0, hardSolved = 0;
  let easyTotal = 0, mediumTotal = 0, hardTotal = 0;

  if (typeof FALLBACK_PROBLEMS !== 'undefined') {
    FALLBACK_PROBLEMS.forEach(p => {
      const diff = (p.difficulty || 'easy').toLowerCase();
      if (diff === 'easy') easyTotal++;
      else if (diff === 'medium') mediumTotal++;
      else if (diff === 'hard') hardTotal++;

      if (solved.includes(p.id)) {
        if (diff === 'easy') easySolved++;
        else if (diff === 'medium') mediumSolved++;
        else if (diff === 'hard') hardSolved++;
      }
    });
  }

  const customs = safeJsonParse(safeLocalStorage.getItem('custom_problems'), {});
  Object.values(customs).forEach(p => {
    const diff = (p.difficulty || 'easy').toLowerCase();
    if (diff === 'easy') easyTotal++;
    else if (diff === 'medium') mediumTotal++;
    else if (diff === 'hard') hardTotal++;

    if (solved.includes(p.id)) {
      if (diff === 'easy') easySolved++;
      else if (diff === 'medium') mediumSolved++;
      else if (diff === 'hard') hardSolved++;
    }
  });

  const totalSolved = easySolved + mediumSolved + hardSolved;
  const totalProblems = easyTotal + mediumTotal + hardTotal;
  const totalPercent = totalProblems > 0 ? (totalSolved / totalProblems * 100) : 0;

  // 1. Update Progress Radial Circle
  const radialFill = document.querySelector('.radial-fill');
  if (radialFill) {
    const r = parseFloat(radialFill.getAttribute('r') || '50');
    const circumference = 2 * Math.PI * r; // ~314
    radialFill.style.strokeDasharray = `${circumference}`;
    const offset = circumference - (circumference * totalPercent / 100);
    radialFill.style.strokeDashoffset = `${offset}`;
    radialFill.style.transition = 'stroke-dashoffset 0.5s ease-out';
  }

  const bigNumEl = document.querySelector('.progress-big-num');
  if (bigNumEl) bigNumEl.textContent = totalSolved;

  const totalNumEl = document.querySelector('.progress-total');
  if (totalNumEl) totalNumEl.textContent = `/ ${totalProblems}`;

  // 2. Update Difficulty Bar Stats
  const fracEasy = document.querySelector('.level-row:nth-child(1) .level-fraction');
  const barEasy = document.querySelector('.level-row:nth-child(1) .level-bar-fill');
  if (fracEasy && barEasy) {
    fracEasy.textContent = `${easySolved} / ${easyTotal}`;
    const easyPct = easyTotal > 0 ? (easySolved / easyTotal * 100) : 0;
    barEasy.style.width = `${easyPct}%`;
  }

  const fracMedium = document.querySelector('.level-row:nth-child(2) .level-fraction');
  const barMedium = document.querySelector('.level-row:nth-child(2) .level-bar-fill');
  if (fracMedium && barMedium) {
    fracMedium.textContent = `${mediumSolved} / ${mediumTotal}`;
    const mediumPct = mediumTotal > 0 ? (mediumSolved / mediumTotal * 100) : 0;
    barMedium.style.width = `${mediumPct}%`;
  }

  const fracHard = document.querySelector('.level-row:nth-child(3) .level-fraction');
  const barHard = document.querySelector('.level-row:nth-child(3) .level-bar-fill');
  if (fracHard && barHard) {
    fracHard.textContent = `${hardSolved} / ${hardTotal}`;
    const hardPct = hardTotal > 0 ? (hardSolved / hardTotal * 100) : 0;
    barHard.style.width = `${hardPct}%`;
  }

  // 3. Dynamic Daily Challenge Loader
  const dailyCard = document.querySelector('.daily-challenge-card');
  if (dailyCard && typeof FALLBACK_PROBLEMS !== 'undefined') {
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const dailyId = (dayOfYear % 15) + 1;
    const dailyProb = FALLBACK_PROBLEMS.find(p => p.id === dailyId);
    
    if (dailyProb) {
      const titleEl = dailyCard.querySelector('h3');
      const descEl = dailyCard.querySelector('p');
      const actionBtn = dailyCard.querySelector('button');

      if (titleEl) titleEl.textContent = `Daily: ${dailyProb.title}`;
      
      const isDailySolved = solved.includes(dailyId);
      if (isDailySolved) {
        if (descEl) descEl.innerHTML = `<span style="color:#10b981; font-weight:600;">Completed!</span> You solved today's challenge. +10 XP earned!`;
        if (actionBtn) {
          actionBtn.textContent = 'Completed ✔';
          actionBtn.style.background = '#10b981';
          actionBtn.style.borderColor = '#10b981';
          actionBtn.style.cursor = 'default';
          actionBtn.disabled = true;
          actionBtn.onclick = null;
        }
      } else {
        if (descEl) descEl.innerHTML = `Solve today's <strong>${dailyProb.difficultyText}</strong> challenge!`;
        if (actionBtn) {
          actionBtn.textContent = 'Solve Now';
          actionBtn.style.background = '';
          actionBtn.style.borderColor = '';
          actionBtn.style.cursor = 'pointer';
          actionBtn.disabled = false;
          actionBtn.onclick = () => {
            window.location.href = `editor.html?id=${dailyId}`;
          };
        }
      }
    }
  }


}

// Run initial sync on load
function runInitialLoadSync() {
  initStorage();
  updateSyncedUI();
  syncProfileWithBackend();
  showBackendOfflineWarning();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runInitialLoadSync);
} else {
  runInitialLoadSync();
}

// Sync profile data to backend database users.json
function syncProfileWithBackend() {
  const profile = getProfile();
  if (!profile || !profile.email) {
    return;
  }
  
  const solved = getSolved();
  const solutions = safeJsonParse(safeLocalStorage.getItem('cn_solutions'), {});
  const customs = safeJsonParse(safeLocalStorage.getItem('custom_problems'), {});
  const customList = Object.values(customs).map(p => ({
    id: p.id,
    title: p.title,
    difficulty: p.difficulty
  }));

  fetch('/api/users/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: profile.email,
      name: profile.name,
      username: profile.username,
      solved: solved,
      solutions: solutions,
      customProblems: customList,
      streak: profile.streak || 0,
      lastSolvedDate: profile.lastSolvedDate || null
    })
  })
  .then(res => res.json())
  .then(data => {
    console.log('User synced with backend successfully:', data);
  })
  .catch(err => {
    console.warn('Backend server offline. Dynamic syncing disabled.');
  });
}

// Helper to show backend warning if loaded via file protocol
function showBackendOfflineWarning() {
  if (window.location.protocol === 'file:' && !document.getElementById('offline-warning')) {
    const warning = document.createElement('div');
    warning.id = 'offline-warning';
    warning.style.position = 'fixed';
    warning.style.bottom = '20px';
    warning.style.right = '20px';
    warning.style.background = 'rgba(239, 68, 68, 0.15)';
    warning.style.border = '1px solid rgba(239, 68, 68, 0.4)';
    warning.style.backdropFilter = 'blur(12px)';
    warning.style.borderRadius = '12px';
    warning.style.padding = '14px 20px';
    warning.style.color = '#fecaca';
    warning.style.fontFamily = "'Inter', sans-serif";
    warning.style.fontSize = '12.5px';
    warning.style.zIndex = '9999';
    warning.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.5)';
    warning.style.maxWidth = '340px';
    warning.innerHTML = `
      <div style="font-weight:600; margin-bottom:4px; display:flex; align-items:center; gap:8px;">
        <span style="color:#ef4444; font-size:14px;">⚠️</span> Offline Sandbox Mode
      </div>
      <div style="line-height: 1.4;">
        Running via local file. Backend validation is offline. To compile and validate your code on the server, start the Node server using <code style="background:rgba(0,0,0,0.3); padding:2px 4px; border-radius:4px; font-family: monospace;">npm start</code> and visit <a href="http://localhost:3000" target="_blank" style="color:#f472b6; font-weight:600; text-decoration:underline;">localhost:3000</a>.
      </div>
    `;
    document.body.appendChild(warning);
  }
}

// Global static fallback database for local preview
const FALLBACK_PROBLEMS = [
  {
    id: 1,
    title: "Sum of Two Numbers",
    difficulty: "easy",
    difficultyText: "Easy",
    category: "math",
    acceptance: "94.2%",
    description: "<p>Given two integers <code>a</code> and <code>b</code>, return their sum.</p>",
    examples: [{ input: "a = 2, b = 3", output: "5", explanation: "2 + 3 = 5" }],
    constraints: ["All inputs fit inside standard integer limits."],
    funcName: "sum",
    params: ["a", "b"],
    templates: {
      javascript: "function sum(a, b) {\n    // Write your code here\n    return a + b;\n}",
      python: "def sum(a: int, b: int) -> int:\n    # Write your code here\n    return a + b"
    },
    sampleTestCases: [{ args: [2, 3], expected: 5 }, { args: [10, -5], expected: 5 }]
  },
  {
    id: 2,
    title: "Reverse a String",
    difficulty: "easy",
    difficultyText: "Easy",
    category: "strings",
    acceptance: "89.7%",
    description: "<p>Given a string <code>str</code>, return it reversed.</p>",
    examples: [{ input: "str = \"hello\"", output: "\"olleh\"", explanation: "Reverse characters." }],
    constraints: ["String contains only printable ASCII characters."],
    funcName: "reverseString",
    params: ["str"],
    templates: {
      javascript: "function reverseString(str) {\n    // Write your code here\n    return str.split('').reverse().join('');\n}",
      python: "def reverseString(str: str) -> str:\n    # Write your code here\n    return str[::-1]"
    },
    sampleTestCases: [{ args: ["hello"], expected: "olleh" }]
  },
  {
    id: 3,
    title: "Find Maximum Number",
    difficulty: "easy",
    difficultyText: "Easy",
    category: "arrays",
    acceptance: "86.5%",
    description: "<p>Given an array of numbers <code>arr</code>, find and return the maximum number.</p>",
    examples: [{ input: "arr = [1, 5, 3]", output: "5", explanation: "5 is the largest." }],
    constraints: [],
    funcName: "findMax",
    params: ["arr"],
    templates: {
      javascript: "function findMax(arr) {\n    // Write your code here\n    return Math.max(...arr);\n}",
      python: "def findMax(arr: list) -> int:\n    # Write your code here\n    return max(arr)"
    },
    sampleTestCases: [{ args: [[1, 5, 3]], expected: 5 }]
  },
  {
    id: 4,
    title: "Check Palindrome",
    difficulty: "easy",
    difficultyText: "Easy",
    category: "strings",
    acceptance: "78.3%",
    description: "<p>Given a string <code>str</code>, check if it reads the same forward and backward.</p>",
    examples: [{ input: "str = \"racecar\"", output: "true", explanation: "Reads the same." }],
    constraints: [],
    funcName: "isPalindrome",
    params: ["str"],
    templates: {
      javascript: "function isPalindrome(str) {\n    // Write your code here\n    return str === str.split('').reverse().join('');\n}",
      python: "def isPalindrome(str: str) -> bool:\n    # Write your code here\n    return str == str[::-1]"
    },
    sampleTestCases: [{ args: ["racecar"], expected: true }]
  },
  {
    id: 5,
    title: "Count Vowels",
    difficulty: "easy",
    difficultyText: "Easy",
    category: "strings",
    acceptance: "75.9%",
    description: "<p>Given a string <code>str</code>, count and return the number of vowels present.</p>",
    examples: [{ input: "str = \"hello\"", output: "2", explanation: "e and o are vowels." }],
    constraints: [],
    funcName: "countVowels",
    params: ["str"],
    templates: {
      javascript: "function countVowels(str) {\n    // Write your code here\n    return (str.match(/[aeiou]/gi) || []).length;\n}",
      python: "def countVowels(str: str) -> int:\n    # Write your code here\n    return sum(1 for char in str if char.lower() in 'aeiou')"
    },
    sampleTestCases: [{ args: ["hello"], expected: 2 }]
  },
  {
    id: 6,
    title: "Fibonacci Series",
    difficulty: "medium",
    difficultyText: "Medium",
    category: "loops",
    acceptance: "69.4%",
    description: "<p>Given an integer <code>n</code>, return the n-th Fibonacci number.</p>",
    examples: [{ input: "n = 5", output: "5", explanation: "F(5) = 5" }],
    constraints: [],
    funcName: "fibonacci",
    params: ["n"],
    templates: {
      javascript: "function fibonacci(n) {\n    if (n <= 1) return n;\n    return fibonacci(n-1) + fibonacci(n-2);\n}",
      python: "def fibonacci(n: int) -> int:\n    if n <= 1: return n\n    return fibonacci(n-1) + fibonacci(n-2)"
    },
    sampleTestCases: [{ args: [5], expected: 5 }]
  },
  {
    id: 7,
    title: "Prime Number Checker",
    difficulty: "medium",
    difficultyText: "Medium",
    category: "math",
    acceptance: "65.8%",
    description: "<p>Given an integer <code>n</code>, check if it is a prime number.</p>",
    examples: [{ input: "n = 7", output: "true", explanation: "Only divisible by 1 and itself." }],
    constraints: [],
    funcName: "isPrime",
    params: ["n"],
    templates: {
      javascript: "function isPrime(n) {\n    if (n <= 1) return false;\n    for (let i = 2; i <= Math.sqrt(n); i++) {\n        if (n % i === 0) return false;\n    }\n    return true;\n}",
      python: "def isPrime(n: int) -> bool:\n    if n <= 1: return False\n    for i in range(2, int(n**0.5) + 1):\n        if n % i == 0: return False\n    return True"
    },
    sampleTestCases: [{ args: [7], expected: true }]
  },
  {
    id: 8,
    title: "Missing Number in Array",
    difficulty: "medium",
    difficultyText: "Medium",
    category: "arrays",
    acceptance: "58.2%",
    description: "<p>Given an array containing n-1 distinct numbers from range 1 to n, find the missing one.</p>",
    examples: [{ input: "arr = [1, 2, 4]", output: "3", explanation: "3 is missing." }],
    constraints: [],
    funcName: "findMissing",
    params: ["arr"],
    templates: {
      javascript: "function findMissing(arr) {\n    const n = arr.length + 1;\n    const sum = (n * (n + 1)) / 2;\n    return sum - arr.reduce((a, b) => a + b, 0);\n}",
      python: "def findMissing(arr: list) -> int:\n    n = len(arr) + 1\n    return (n * (n + 1)) // 2 - sum(arr)"
    },
    sampleTestCases: [{ args: [[1, 2, 4]], expected: 3 }]
  },
  {
    id: 9,
    title: "Rotate Array",
    difficulty: "medium",
    difficultyText: "Medium",
    category: "arrays",
    acceptance: "55.4%",
    description: "<p>Given an array <code>nums</code> and a non-negative integer <code>k</code>, rotate the array to the right by <code>k</code> steps. Return the rotated array.</p>",
    examples: [{ input: "nums = [1,2,3,4,5,6,7], k = 3", output: "[5,6,7,1,2,3,4]", explanation: "Shift right." }],
    constraints: [],
    funcName: "rotateArray",
    params: ["nums", "k"],
    templates: {
      javascript: "function rotateArray(nums, k) {\n    k = k % nums.length;\n    return [...nums.slice(-k), ...nums.slice(0, -k)];\n}",
      python: "def rotateArray(nums: list, k: int) -> list:\n    k = k % len(nums)\n    return nums[-k:] + nums[:-k]"
    },
    sampleTestCases: [{ args: [[1, 2, 3, 4, 5, 6, 7], 3], expected: [5, 6, 7, 1, 2, 3, 4] }]
  },
  {
    id: 10,
    title: "Longest Substring",
    difficulty: "medium",
    difficultyText: "Medium",
    category: "strings",
    acceptance: "33.8%",
    description: "<p>Given a string, find the length of the longest substring without repeating characters.</p>",
    examples: [{ input: "str = \"abcabcbb\"", output: "3", explanation: "\"abc\" has length 3." }],
    constraints: [],
    funcName: "longestSubstring",
    params: ["str"],
    templates: {
      javascript: "function longestSubstring(str) {\n    let maxLen = 0, start = 0, map = {};\n    for (let i = 0; i < str.length; i++) {\n        if (map[str[i]] !== undefined && map[str[i]] >= start) start = map[str[i]] + 1;\n        map[str[i]] = i;\n        maxLen = Math.max(maxLen, i - start + 1);\n    }\n    return maxLen;\n}",
      python: "def longestSubstring(str: str) -> int:\n    max_len, start, char_map = 0, 0, {}\n    for i, char in enumerate(str):\n        if char in char_map and char_map[char] >= start: start = char_map[char] + 1\n        char_map[char] = i\n        max_len = max(max_len, i - start + 1)\n    return max_len"
    },
    sampleTestCases: [{ args: ["abcabcbb"], expected: 3 }]
  },
  {
    id: 11,
    title: "Longest Common Prefix",
    difficulty: "hard",
    difficultyText: "Hard",
    category: "strings",
    acceptance: "46.1%",
    description: "<p>Find the longest common prefix amongst an array of strings.</p>",
    examples: [{ input: "strs = [\"flower\", \"flow\", \"flight\"]", output: "\"fl\"", explanation: "Prefix is \"fl\"." }],
    constraints: [],
    funcName: "longestCommonPrefix",
    params: ["strs"],
    templates: {
      javascript: "function longestCommonPrefix(strs) {\n    if (!strs.length) return '';\n    let prefix = strs[0];\n    for(let i=1; i<strs.length; i++) {\n        while(strs[i].indexOf(prefix) !== 0) {\n            prefix = prefix.substring(0, prefix.length - 1);\n        }\n    }\n    return prefix;\n}",
      python: "def longestCommonPrefix(strs: list) -> str:\n    if not strs: return ''\n    prefix = strs[0]\n    for s in strs[1:]:\n        while not s.startswith(prefix):\n            prefix = prefix[:-1]\n    return prefix"
    },
    sampleTestCases: [{ args: [["flower", "flow", "flight"]], expected: "fl" }]
  },
  {
    id: 12,
    title: "Valid Parentheses",
    difficulty: "hard",
    difficultyText: "Hard",
    category: "recursion",
    acceptance: "42.8%",
    description: "<p>Determine if brackets in a string open and close in valid order.</p>",
    examples: [{ input: "str = \"()[]{}\"", output: "true", explanation: "All valid." }],
    constraints: [],
    funcName: "isValid",
    params: ["str"],
    templates: {
      javascript: "function isValid(str) {\n    const stack = [];\n    const mapping = {')':'(', '}':'{', ']':'['};\n    for(let c of str) {\n        if (c in mapping) {\n            if (stack.pop() !== mapping[c]) return false;\n        } else stack.push(c);\n    }\n    return stack.length === 0;\n}",
      python: "def isValid(str: str) -> bool:\n    stack = []\n    mapping = {')':'(', '}':'{', ']':'['}\n    for c in str:\n        if c in mapping:\n            if not stack or stack.pop() != mapping[c]: return False\n        else: stack.append(c)\n    return len(stack) == 0"
    },
    sampleTestCases: [{ args: ["()[]{}"], expected: true }]
  },
  {
    id: 13,
    title: "Median of Sorted Arrays",
    difficulty: "hard",
    difficultyText: "Hard",
    category: "arrays",
    acceptance: "39.5%",
    description: "<p>Given two sorted arrays, return the median of the merged elements as a float.</p>",
    examples: [{ input: "nums1 = [1,3], nums2 = [2]", output: "2.0", explanation: "Median is 2.0" }],
    constraints: [],
    funcName: "findMedianSortedArrays",
    params: ["nums1", "nums2"],
    templates: {
      javascript: "function findMedianSortedArrays(nums1, nums2) {\n    const m = [...nums1, ...nums2].sort((a,b) => a-b);\n    const len = m.length;\n    return len % 2 === 0 ? (m[len/2-1] + m[len/2])/2 : m[Math.floor(len/2)];\n}",
      python: "def findMedianSortedArrays(nums1: list, nums2: list) -> float:\n    m = sorted(nums1 + nums2)\n    n = len(m)\n    return (m[n//2-1]+m[n//2])/2.0 if n%2==0 else float(m[n//2])"
    },
    sampleTestCases: [{ args: [[1,3], [2]], expected: 2.0 }]
  },
  {
    id: 14,
    title: "Edit Distance",
    difficulty: "hard",
    difficultyText: "Hard",
    category: "strings",
    acceptance: "52.8%",
    description: "<p>Find minimum operations (insert, delete, replace) to convert word1 to word2.</p>",
    examples: [{ input: "word1 = \"horse\", word2 = \"ros\"", output: "3", explanation: "horse -> rorse -> rose -> ros" }],
    constraints: [],
    funcName: "minDistance",
    params: ["word1", "word2"],
    templates: {
      javascript: "function minDistance(word1, word2) {\n    const m=word1.length, n=word2.length;\n    const dp = Array.from({length: m+1}, () => Array(n+1).fill(0));\n    for(let i=0; i<=m; i++) dp[i][0] = i;\n    for(let j=0; j<=n; j++) dp[0][j] = j;\n    for(let i=1; i<=m; i++) {\n        for(let j=1; j<=n; j++) {\n            if (word1[i-1] === word2[j-1]) dp[i][j] = dp[i-1][j-1];\n            else dp[i][j] = Math.min(dp[i-1][j-1], dp[i-1][j], dp[i][j-1]) + 1;\n        }\n    }\n    return dp[m][n];\n}",
      python: "def minDistance(word1: str, word2: str) -> int:\n    m, n = len(word1), len(word2)\n    dp = [[0]*(n+1) for _ in range(m+1)]\n    for i in range(m+1): dp[i][0]=i\n    for j in range(n+1): dp[0][j]=j\n    for i in range(1, m+1):\n        for j in range(1, n+1):\n            if word1[i-1] == word2[j-1]: dp[i][j] = dp[i-1][j-1]\n            else: dp[i][j] = min(dp[i-1][j-1], dp[i-1][j], dp[i][j-1]) + 1\n    return dp[m][n]"
    },
    sampleTestCases: [{ args: ["horse", "ros"], expected: 3 }]
  },
  {
    id: 15,
    title: "Trapping Rain Water",
    difficulty: "hard",
    difficultyText: "Hard",
    category: "arrays",
    acceptance: "60.1%",
    description: "<p>Calculate total rainwater trapped by elevation map bars.</p>",
    examples: [{ input: "height = [0,1,0,2,1,0,1,3,2,1,2,1]", output: "6", explanation: "6 units of water trapped." }],
    constraints: [],
    funcName: "trap",
    params: ["height"],
    templates: {
      javascript: "function trap(height) {\n    // Write your code here\n    \n}",
      python: "def trap(height: list) -> int:\n    # Write your code here\n    pass"
    },
    sampleTestCases: [{ args: [[0,1,0,2,1,0,1,3,2,1,2,1]], expected: 6 }]
  }
];

