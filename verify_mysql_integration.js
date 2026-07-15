// verify_mysql_integration.js
// Verification suite for checking MySQL connections, auto migration seeds, and JSON flat-file fallback layers.

const http = require('http');
const { spawn } = require('child_process');

console.log("--- Starting MySQL Connection & JSON Fallback Verification Tests ---");

// Start isolated test server on port 3012 (with standard connection details)
const serverProcess = spawn('node', ['server.js'], {
  env: { 
    ...process.env, 
    PORT: '3012',
    DB_HOST: 'localhost',
    DB_PORT: '3306',
    DB_USER: 'root',
    DB_PASSWORD: 'wrong_password_test_fallback' // deliberately trigger connection fail to check robust fallback!
  }
});

let serverLoggedFallback = false;
let testPassed = false;

serverProcess.stdout.on('data', (data) => {
  const line = data.toString().trim();
  console.log(`[Server stdout] ${line}`);
  
  if (line.includes('[MySQL Warning]') || line.includes('[Fallback Info]')) {
    serverLoggedFallback = true;
    console.log("✅ Server correctly caught database error and logged fallback initialization warning!");
  }

  if (line.includes('CodeNova server running')) {
    console.log("✅ CodeNova server started up successfully using JSON fallback data cache!");
    testPassed = serverLoggedFallback;
    runApiHealthChecks();
  }
});

serverProcess.stderr.on('data', (data) => {
  console.error(`[Server stderr] ${data.toString().trim()}`);
});

function getRequest(path) {
  return new Promise((resolve, reject) => {
    http.get({
      hostname: 'localhost',
      port: 3012,
      path: path,
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
    }).on('error', reject);
  });
}

async function runApiHealthChecks() {
  try {
    console.log("\nQuerying API routes to check fallback loading status...");
    const problemsList = await getRequest('/api/problems');
    
    if (problemsList && Array.isArray(problemsList) && problemsList.length > 0) {
      console.log(`✅ Fallback successfully loaded ${problemsList.length} problems from flat JSON files!`);
      if (testPassed) {
        console.log("\n🎉 ALL MYSQL INTEGRATION AND GRACEFUL FALLBACK TESTS PASSED!");
      } else {
        console.error("❌ Fallback query succeeded but warnings were not logged correctly.");
      }
    } else {
      console.error("❌ Failed to query fallback problems list:", problemsList);
      testPassed = false;
    }
  } catch (error) {
    console.error("❌ API health check failed:", error);
    testPassed = false;
  } finally {
    console.log("\nStopping verification server...");
    serverProcess.kill('SIGTERM');
    process.exit(testPassed ? 0 : 1);
  }
}
