// verify_admin.js
// Verification suite for Admin password authentication & token endpoints

const http = require('http');
const { spawn } = require('child_process');

console.log("--- Starting Secure Admin Verification Tests ---");

// Start backend test server on isolated port 3007
const serverProcess = spawn('node', ['server.js'], {
  env: { ...process.env, PORT: '3007' }
});

serverProcess.stdout.on('data', (data) => {
  const line = data.toString().trim();
  console.log(`[Server stdout] ${line}`);
  if (line.includes('CodeNova server running')) {
    runAdminTests();
  }
});

serverProcess.stderr.on('data', (data) => {
  console.error(`[Server stderr] ${data.toString().trim()}`);
});

function postRequest(path, payload, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const req = http.request({
      hostname: 'localhost',
      port: 3007,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...headers
      }
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
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

function getRequest(path, headers = {}) {
  return new Promise((resolve, reject) => {
    http.get({
      hostname: 'localhost',
      port: 3007,
      path: path,
      headers: headers
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          reject(new Error(`Failed to parse body: ${body}`));
        }
      });
    }).on('error', (err) => reject(err));
  });
}

async function runAdminTests() {
  let allPassed = true;

  try {
    // 1. Test Incorrect Admin Password
    console.log("\n1. Testing invalid admin password login (POST /api/admin/login)...");
    try {
      const loginFail = await postRequest('/api/admin/login', { password: "wrong_password" });
      if (loginFail.status === 401) {
        console.log("✅ Server correctly rejected wrong password with 401 Unauthorized!");
      } else {
        console.error("❌ Server accepted wrong password or returned wrong code:", loginFail);
        allPassed = false;
      }
    } catch (e) {
      console.error("❌ Login failed:", e);
      allPassed = false;
    }

    // 2. Test Correct Admin Password
    console.log("\n2. Testing valid admin password login (POST /api/admin/login)...");
    let adminToken = '';
    const loginSuccess = await postRequest('/api/admin/login', { password: "admin123" });
    if (loginSuccess.status === 200 && loginSuccess.data.success && loginSuccess.data.token) {
      adminToken = loginSuccess.data.token;
      console.log(`✅ Admin login successful! Token received: ${adminToken}`);
    } else {
      console.error("❌ Admin login failed:", loginSuccess);
      allPassed = false;
    }

    // 3. Test Unauthorized Access (Missing token)
    console.log("\n3. Testing unauthorized API access protection (GET /api/users without headers)...");
    const getUnauth = await getRequest('/api/users');
    if (getUnauth.status === 403) {
      console.log("✅ Server correctly blocked users list check with 403 Forbidden!");
    } else {
      console.error("❌ Server allowed access to user list without token:", getUnauth);
      allPassed = false;
    }

    // 4. Test Authorized Access (With token)
    if (adminToken) {
      console.log("\n4. Testing authorized API access (GET /api/users with Bearer token)...");
      const getAuth = await getRequest('/api/users', { 'Authorization': `Bearer ${adminToken}` });
      if (getAuth.status === 200) {
        console.log("✅ Sync list retrieved successfully using the admin authorization token!");
      } else {
        console.error("❌ Server rejected valid admin token:", getAuth);
        allPassed = false;
      }
    }

  } catch (error) {
    console.error("❌ Error running secure admin verification tests:", error);
    allPassed = false;
  } finally {
    console.log("\nStopping test server...");
    serverProcess.kill('SIGTERM');
    process.exit(allPassed ? 0 : 1);
  }
}
