// verify_all_languages.js
// Automated verification suite for JS, Python, C++, and Java runner scripts

const http = require('http');
const { spawn } = require('child_process');

console.log("--- Starting Comprehensive Multi-Language Verification Tests ---");

// Start backend test server on isolated port 3005
const serverProcess = spawn('node', ['server.js'], {
  env: { ...process.env, PORT: '3005' }
});

serverProcess.stdout.on('data', (data) => {
  const line = data.toString().trim();
  console.log(`[Server stdout] ${line}`);
  if (line.includes('CodeNova server running')) {
    runVerificationTests();
  }
});

serverProcess.stderr.on('data', (data) => {
  console.error(`[Server stderr] ${data.toString().trim()}`);
});

function postRequest(path, payload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const req = http.request({
      hostname: 'localhost',
      port: 3005,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error(`Failed to parse body: ${body}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(postData);
    req.end();
  });
}

async function runVerificationTests() {
  let allPassed = true;

  try {
    // Test 1: JavaScript (Sum of Two Numbers)
    console.log("\nTesting JavaScript runner (Problem 1: Sum of Two Numbers)...");
    const jsResult = await postRequest('/api/run', {
      problemId: 1,
      language: 'javascript',
      code: `function sum(a, b) {\n  return a + b;\n}`
    });
    if (jsResult.status === 'success' && jsResult.results.every(r => r.passed)) {
      console.log("✅ JavaScript passed!");
    } else {
      console.error("❌ JavaScript failed:", jsResult);
      allPassed = false;
    }

    // Test 2: Python (Sum of Two Numbers)
    console.log("Testing Python runner (Problem 1: Sum of Two Numbers)...");
    const pyResult = await postRequest('/api/run', {
      problemId: 1,
      language: 'python',
      code: `def sum(a: int, b: int) -> int:\n    return a + b`
    });
    if (pyResult.status === 'success' && pyResult.results.every(r => r.passed)) {
      console.log("✅ Python passed!");
    } else {
      console.error("❌ Python failed:", pyResult);
      allPassed = false;
    }

    // Test 3: Java (Valid Parentheses)
    console.log("Testing Java runner (Problem 12: Valid Parentheses)...");
    const javaResult = await postRequest('/api/run', {
      problemId: 12,
      language: 'java',
      code: `
import java.util.Stack;
class Solution {
    public boolean isValid(String str) {
        Stack<Character> stack = new Stack<>();
        for (char ch : str.toCharArray()) {
            if (ch == '(' || ch == '[' || ch == '{') {
                stack.push(ch);
            } else {
                if (stack.isEmpty()) return false;
                char top = stack.pop();
                if ((ch == ')' && top != '(') ||
                    (ch == ']' && top != '[') ||
                    (ch == '}' && top != '{')) {
                    return false;
                }
            }
        }
        return stack.isEmpty();
    }
}
      `
    });
    if (javaResult.status === 'success' && javaResult.results.every(r => r.passed)) {
      console.log("✅ Java passed!");
    } else {
      console.error("❌ Java failed:", javaResult);
      allPassed = false;
    }

    // Test 4: C++ (Sum of Two Numbers)
    console.log("Testing C++ runner (Problem 1: Sum of Two Numbers)...");
    const cppResult = await postRequest('/api/run', {
      problemId: 1,
      language: 'cpp',
      code: `int sum(int a, int b) {\n    return a + b;\n}`
    });
    
    // C++ might not be installed, check if it behaves gracefully or passes
    if (cppResult.status === 'success' && cppResult.results.every(r => r.passed)) {
      console.log("✅ C++ passed!");
    } else if (cppResult.status === 'error' && cppResult.error.includes("g++")) {
      console.log("⚠️ C++ returned graceful error (g++ compiler is not installed, which is expected):", cppResult.error.trim());
    } else {
      console.error("❌ C++ failed unexpectedly:", cppResult);
      allPassed = false;
    }

  } catch (error) {
    console.error("❌ Error running verification tests:", error);
    allPassed = false;
  } finally {
    console.log("\nStopping test server...");
    serverProcess.kill('SIGTERM');
    process.exit(allPassed ? 0 : 1);
  }
}
