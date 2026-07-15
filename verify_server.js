const http = require('http');
const fs = require('fs');

console.log('--- Starting CodeNova Fullstack Verification Tests ---');

// We will launch the server programmatically on a testing port
const serverProcess = require('child_process').fork('server.js', [], {
  env: { PORT: 3001, ...process.env },
  silent: true
});

let serverReady = false;
serverProcess.stdout.on('data', (data) => {
  const msg = data.toString();
  console.log('[Server stdout]', msg.trim());
  if (msg.includes('CodeNova server running at')) {
    serverReady = true;
    runTests();
  }
});

serverProcess.stderr.on('data', (data) => {
  console.error('[Server stderr]', data.toString().trim());
});

function request(path, method, body, callback) {
  const req = http.request({
    hostname: 'localhost',
    port: 3001,
    path: path,
    method: method,
    headers: {
      'Content-Type': 'application/json'
    }
  }, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => callback(null, JSON.parse(data)));
  });

  req.on('error', (err) => callback(err));
  if (body) {
    req.write(JSON.stringify(body));
  }
  req.end();
}

function runTests() {
  console.log('\nRunning tests...');

  // Test 1: GET /api/problems
  request('/api/problems', 'GET', null, (err, problems) => {
    if (err) {
      console.error('FAIL: GET /api/problems failed:', err.message);
      cleanup();
      return;
    }
    console.log('PASS: GET /api/problems returned', problems.length, 'problems.');
    
    // Test 2: POST /api/run with correct JS code
    const runBody = {
      problemId: 1,
      language: 'javascript',
      code: 'function sum(a, b) {\n  return a + b;\n}'
    };
    
    request('/api/run', 'POST', runBody, (err, runResult) => {
      if (err) {
        console.error('FAIL: POST /api/run failed:', err.message);
        cleanup();
        return;
      }
      
      const allPassed = runResult.results && runResult.results.every(r => r.passed);
      if (runResult.status === 'success' && allPassed) {
        console.log('PASS: POST /api/run JS execution correct.');
      } else {
        console.error('FAIL: POST /api/run JS execution incorrect. Result:', runResult);
      }

      // Test 3: POST /api/run with JS syntax error
      const errorBody = {
        problemId: 1,
        language: 'javascript',
        code: 'function sum(a, b) {\n  return a + b; // missing closing bracket'
      };

      request('/api/run', 'POST', errorBody, (err, errResult) => {
        if (errResult && errResult.status === 'error') {
          console.log('PASS: POST /api/run detected syntax error correctly.');
        } else {
          console.error('FAIL: POST /api/run failed to detect syntax error. Result:', errResult);
        }

        // Test 4: POST /api/run with infinite loop (timeout test)
        const timeoutBody = {
          problemId: 1,
          language: 'javascript',
          code: 'function sum(a, b) {\n  while(true) {}\n}'
        };

        console.log('Running infinite loop test (will take ~3.5 seconds to time out)...');
        request('/api/run', 'POST', timeoutBody, (err, timeoutResult) => {
          if (timeoutResult && timeoutResult.status === 'timeout') {
            console.log('PASS: POST /api/run terminated infinite loop and returned timeout status.');
          } else {
            console.error('FAIL: POST /api/run failed to handle infinite loop. Result:', timeoutResult);
          }

          // Test 5: POST /api/run with correct Python code
          const pyBody = {
            problemId: 1,
            language: 'python',
            code: 'def sum(a: int, b: int) -> int:\n    return a + b'
          };

          request('/api/run', 'POST', pyBody, (err, pyResult) => {
            if (pyResult && pyResult.status === 'success' && pyResult.results.every(r => r.passed)) {
              console.log('PASS: POST /api/run Python execution correct.');
            } else {
              console.error('FAIL: POST /api/run Python execution failed. Result:', pyResult);
            }

            cleanup();
          });
        });
      });
    });
  });
}

function cleanup() {
  console.log('\nStopping test server...');
  serverProcess.kill();
  process.exit(0);
}

// Timeout helper in case server doesn't respond at all
setTimeout(() => {
  if (!serverReady) {
    console.error('FAIL: Test server failed to start within 5 seconds.');
    cleanup();
  }
}, 5000);
