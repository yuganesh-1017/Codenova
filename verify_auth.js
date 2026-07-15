// verify_auth.js
// Verification suite for User signup, login, database storage, and profile sync retention

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log("--- Starting Secure User Authentication Verification Tests ---");

// Start isolated test server on port 3010
const serverProcess = spawn('node', ['server.js'], {
  env: { ...process.env, PORT: '3010' }
});

serverProcess.stdout.on('data', (data) => {
  const line = data.toString().trim();
  console.log(`[Server stdout] ${line}`);
  if (line.includes('CodeNova server running')) {
    runAuthTests();
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
      port: 3010,
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

async function runAuthTests() {
  let allPassed = true;
  const testEmail = `new_coder_${Math.random().toString(36).substring(7)}@example.com`;
  const testPassword = "securePassword123";
  const testUsername = "new_coder_pro";
  const testName = "Alex Verify";

  try {
    // 1. Test registration of a new user
    console.log(`\n1. Creating a new user account (${testEmail}) via POST /api/auth/signup...`);
    const signupRes = await postRequest('/api/auth/signup', {
      name: testName,
      username: testUsername,
      email: testEmail,
      password: testPassword
    });

    if (signupRes.success && signupRes.profile && signupRes.profile.email === testEmail) {
      console.log("✅ Account created successfully! Profile details returned.");
    } else {
      console.error("❌ Sign up failed:", signupRes);
      allPassed = false;
    }

    // 2. Check if user is saved in users.json database on disk
    console.log("\n2. Verifying database users.json record on disk...");
    const dbPath = path.join(__dirname, 'users.json');
    const usersDb = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    const userKey = testEmail.toLowerCase().replace(/[$.#]/g, '_');
    const dbRecord = usersDb[userKey];

    if (dbRecord && dbRecord.password === testPassword && dbRecord.name === testName) {
      console.log("✅ User credentials confirmed stored on disk database!");
    } else {
      console.error("❌ Failed to verify user database record. Record:", dbRecord);
      allPassed = false;
    }

    // 3. Test signing in with invalid password
    console.log("\n3. Testing login rejection with invalid password...");
    const badLoginRes = await postRequest('/api/auth/login', {
      email: testEmail,
      password: "wrongPassword"
    });

    if (!badLoginRes.success && badLoginRes.error) {
      console.log("✅ Server correctly rejected login with 401: Invalid credentials!");
    } else {
      console.error("❌ Server incorrectly processed bad credentials login:", badLoginRes);
      allPassed = false;
    }

    // 4. Test signing in with correct credentials
    console.log("\n4. Testing login success with valid credentials...");
    const goodLoginRes = await postRequest('/api/auth/login', {
      email: testEmail,
      password: testPassword
    });

    if (goodLoginRes.success && goodLoginRes.profile && goodLoginRes.profile.name === testName) {
      console.log("✅ Successful authentication! Server returned correct profile details.");
    } else {
      console.error("❌ Failed to login with valid credentials:", goodLoginRes);
      allPassed = false;
    }

    // 5. Test user profile synchronization password retention
    console.log("\n5. Testing user profile synchronization password retention...");
    const syncRes = await postRequest('/api/users/sync', {
      email: testEmail,
      name: "Alex Updated",
      username: testUsername,
      solved: [1, 2],
      solutions: { "1": "code" },
      customProblems: []
    });

    const updatedUsersDb = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    const updatedRecord = updatedUsersDb[userKey];

    if (syncRes.success && updatedRecord && updatedRecord.password === testPassword && updatedRecord.name === "Alex Updated") {
      console.log("✅ Profile sync succeeded and password was retained correctly inside database!");
    } else {
      console.error("❌ Sync failed or password erased from database. Record:", updatedRecord);
      allPassed = false;
    }

  } catch (error) {
    console.error("❌ Authentication verification failed with exception:", error);
    allPassed = false;
  } finally {
    console.log("\nStopping auth test server...");
    serverProcess.kill('SIGTERM');
    process.exit(allPassed ? 0 : 1);
  }
}
