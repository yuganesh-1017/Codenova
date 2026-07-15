// verify_custom_run.js
// Verification suite for Memory Code creation and sandboxed executions

const http = require('http');
const { spawn } = require('child_process');

console.log("--- Starting Memory Code & Storage Verification Tests ---");

// Start backend test server on isolated port 3006
const serverProcess = spawn('node', ['server.js'], {
  env: { ...process.env, PORT: '3006' }
});

serverProcess.stdout.on('data', (data) => {
  const line = data.toString().trim();
  console.log(`[Server stdout] ${line}`);
  if (line.includes('CodeNova server running')) {
    runCustomTests();
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
      port: 3006,
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

function getRequest(path) {
  return new Promise((resolve, reject) => {
    http.get({
      hostname: 'localhost',
      port: 3006,
      path: path
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
    }).on('error', (err) => reject(err));
  });
}

async function runCustomTests() {
  let allPassed = true;

  try {
    // 1. Create a custom challenge
    console.log("\n1. Testing Challenge Creation (POST /api/custom-problems)...");
    const createRes = await postRequest('/api/custom-problems', {
      title: "Custom Multiply",
      difficulty: "easy",
      category: "math",
      description: "<p>Multiply a and b.</p>",
      funcName: "multiply",
      params: ["a", "b"],
      argTypes: ["int", "int"],
      retType: "int",
      sampleTestCases: [{ args: [5, 6], expected: 30 }],
      systemTestCases: [{ args: [5, 6], expected: 30 }, { args: [10, 10], expected: 100 }]
    });

    if (createRes.success && createRes.problem && createRes.problem.id) {
      console.log(`✅ Challenge created successfully! ID: ${createRes.problem.id}`);
      const customId = createRes.problem.id;

      // 2. Retrieve custom challenge list
      console.log("\n2. Testing Storage Directory (GET /api/custom-problems)...");
      const listRes = await getRequest('/api/custom-problems');
      const found = listRes.find(p => p.id === customId);
      if (found && found.title === "Custom Multiply") {
        console.log("✅ Custom challenge listed in storage library successfully!");
      } else {
        console.error("❌ Custom challenge not listed in storage library:", listRes);
        allPassed = false;
      }

      // 3. Test JavaScript runner on custom challenge
      console.log("\n3. Testing JavaScript custom execution (POST /api/run)...");
      const jsResult = await postRequest('/api/run', {
        problemId: customId,
        language: "javascript",
        code: `function multiply(a, b) {\n  return a * b;\n}`
      });
      if (jsResult.status === 'success' && jsResult.results.every(r => r.passed)) {
        console.log("✅ JavaScript custom execution passed!");
      } else {
        console.error("❌ JavaScript custom execution failed:", jsResult);
        allPassed = false;
      }

      // 4. Test Python runner on custom challenge
      console.log("\n4. Testing Python custom execution (POST /api/run)...");
      const pyResult = await postRequest('/api/run', {
        problemId: customId,
        language: "python",
        code: `def multiply(a: int, b: int) -> int:\n    return a * b`
      });
      if (pyResult.status === 'success' && pyResult.results.every(r => r.passed)) {
        console.log("✅ Python custom execution passed!");
      } else {
        console.error("❌ Python custom execution failed:", pyResult);
        allPassed = false;
      }

      // 5. Test Java submission (POST /api/submit) to save solution rewind
      console.log("\n5. Testing Java custom submission & Solution Rewind...");
      const javaResult = await postRequest('/api/submit', {
        problemId: customId,
        language: "java",
        code: `
class Solution {
    public int multiply(int a, int b) {
        return a * b;
    }
}
        `
      });
      if (javaResult.status === 'success' && javaResult.results.every(r => r.passed)) {
        console.log("✅ Java custom submission passed!");
        
        // Retrieve custom challenge again to see if solution rewind code was saved
        const updatedList = await getRequest('/api/custom-problems');
        const updatedProblem = updatedList.find(p => p.id === customId);
        if (updatedProblem && updatedProblem.solutions && updatedProblem.solutions.java) {
          console.log("✅ Java solution rewind code successfully persisted on backend!");
        } else {
          console.error("❌ Java solution code not saved in rewind repository:", updatedProblem);
          allPassed = false;
        }

      } else {
        console.error("❌ Java custom submission failed:", javaResult);
        allPassed = false;
      }

    } else {
      console.error("❌ Challenge creation failed:", createRes);
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
